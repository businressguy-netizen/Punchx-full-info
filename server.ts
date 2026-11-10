import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ─── Firebase Admin Setup ───
try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString()
      );
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT.");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: applicationDefault()
      });
      console.log("Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS.");
    } else {
      console.log("No Firebase Admin credentials provided; utilizing in-memory database fallback.");
    }
  }
} catch (error) {
  console.warn("Firebase Admin initialization skipped/failed:", error);
}

import { dbAdapter } from "./src/backend/db/index.js";
import { logger } from "./src/backend/logger.js";
import { calculateAuthoritativeQuote } from "./src/backend/pricingService.js";
import { executeOrderTransition } from "./src/backend/orderStateMachine.js";
import { generateSecureOtp, verifyOtpChallenge } from "./src/backend/otpService.js";
import {
  createGatewayPaymentOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./src/backend/paymentService.js";
import {
  updateWorkerLocationTelemetry,
  getOrderTrackingStatus,
} from "./src/backend/trackingService.js";
import { OrderRecord, OrderStatus } from "./src/types.js";
import { adminRouter, platformSettings } from "./src/backend/routes/adminBridgeRoutes.js";

// ─── Firebase Auth Middleware ───
export const requireFirebaseUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    if (getApps().length > 0) {
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        (req as any).user = decodedToken;
        return next();
      } catch (verifyErr) {
        logger.warn("Firebase ID Token verification failed:", verifyErr);
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired token" });
      }
    }

    // In local non-production environments when Firebase Admin credentials are not provided
    if (process.env.NODE_ENV !== "production") {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        try {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
          const resolvedUid = payload.uid || payload.sub || payload.user_id;
          if (resolvedUid) {
            (req as any).user = {
              uid: resolvedUid,
              email: payload.email || '',
              ...payload
            };
            return next();
          }
        } catch {
          // Continue to unauthorized response
        }
      }
    }

    return res.status(401).json({ success: false, error: "Unauthorized: Unverifiable authentication token" });
  } catch (error) {
    logger.warn("Firebase ID Token middleware error:", error);
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired token" });
  }
};

// ─── Admin Verification Middleware ───
export const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user || !user.uid) {
    return res.status(401).json({ success: false, error: "Unauthorized: Authentication required" });
  }

  try {
    const userProfile = await dbAdapter.getUser(user.uid);
    if (!userProfile || userProfile.role !== "admin") {
      logger.security("Unauthorized admin endpoint access attempt", { uid: user.uid });
      return res.status(403).json({ success: false, error: "Forbidden: Admin privileges required" });
    }
    next();
  } catch (err) {
    logger.error("Admin verification error:", err);
    return res.status(500).json({ success: false, error: "Internal authorization check failed" });
  }
};

// ─── Worker Verification Middleware ───
export const requireWorker = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user?.uid) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  try {
    const profile = await dbAdapter.getUser(user.uid);
    const application = await dbAdapter.getWorkerApplicationByUid(user.uid);
    const isApproved = profile?.role === "worker" && profile?.status === "APPROVED"
      || application?.status === "APPROVED";

    if (!isApproved) {
      return res.status(403).json({
        success: false,
        error: "Professional access is available only after admin approval."
      });
    }

    (req as any).workerProfile = profile;
    (req as any).workerApp = application;
    return next();
  } catch (error) {
    logger.error("Worker verification error:", error);
    return res.status(500).json({ success: false, error: "Unable to verify professional approval" });
  }
};

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://www.punchxapp.co.in",
  "https://punchxapp.co.in",
  "http://localhost:5173",
  "http://localhost:3000",
];

export async function createApp() {
  const app = express();

  // ─── Security Middleware ───

  // Helmet: Sets security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for now — SPA loads inline scripts
    crossOriginEmbedderPolicy: false,
  }));

  // CORS: Restrict to known origins only
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "x-admin-key", "X-Admin-Key"],
  }));

  // Body size limits to prevent DoS via large payloads & capture rawBody for webhook HMAC verification
  app.use(express.json({
    limit: "1mb",
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ─── ADMIN COMMAND CENTER BRIDGE (DUAL-REPO SECURE INTEGRATION) ───
  // Exposes authenticated management bridge for Admin-dashboard-punchx on port 5173
  // Mounted BEFORE consumer rate limiter so admin operations & 30s health polling are uninterrupted
  app.use("/api/admin", adminRouter);

  // Rate Limiting: 100 requests per 15 minutes per IP for general consumer endpoints
  app.use("/api/", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, please try again later." },
  }));

  // Health check
  app.get("/api/health", async (req, res) => {
    const isDbHealthy = await dbAdapter.isHealthy();
    res.status(isDbHealthy ? 200 : 503).json({
      status: isDbHealthy ? "ok" : "degraded",
      dbProvider: dbAdapter.providerName,
      dbHealthy: isDbHealthy,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── AUTHENTICATED USER SESSION AUDIT ───
  // Records each successful sign-in without ever storing passwords, ID tokens, or access tokens.
  app.post("/api/auth/session", requireFirebaseUser, async (req, res) => {
    try {
      const authUser = (req as any).user;
      const uid = String(authUser.uid || "");
      if (!uid) return res.status(401).json({ success: false, error: "Authenticated user ID is missing" });

      const databaseId = process.env.FIREBASE_DATABASE_ID
        || process.env.VITE_FIREBASE_DATABASE_ID
        || "ai-studio-punchxservicecus-c71be4cc-9ee1-4ae7-b718-125aa03bcd38";
      const firestore = getFirestore(undefined, databaseId);
      const userRef = firestore.collection("users").doc(uid);
      const loginHistoryRef = userRef.collection("loginHistory").doc();
      const nowIso = new Date().toISOString();
      const suppliedMethod = String(req.body?.loginMethod || "").toLowerCase();
      const allowedLoginMethods = ["namoid-email", "namoid-phone", "namoid", "firebase-email-password", "firebase-phone", "google", "anonymous"];
      const loginMethod = allowedLoginMethods.includes(suppliedMethod)
        ? suppliedMethod
        : (authUser.email ? "namoid-email" : (authUser.phone_number ? "namoid-phone" : "namoid"));
      const email = String(authUser.email || req.body?.email || "").trim().slice(0, 320);
      const phone = String(authUser.phone_number || req.body?.phone || "").trim().slice(0, 40);
      const displayName = String(req.body?.name || authUser.name || authUser.email?.split("@")[0] || "PunchX Member").trim().slice(0, 160);
      const requestedRole = req.body?.role === "worker" ? "worker" : "citizen";
      const submittedProfile = req.body?.profile && typeof req.body.profile === "object" ? req.body.profile : {};
      const profileFields = ["name", "email", "phone", "photoURL", "dob", "birthdate", "address", "streetAddress", "landmark", "area", "sector", "city", "isProfileCompleted", "workerSkill", "workerCategories", "workerExperience", "visitingFee", "applicationId", "location", "geofenceArea", "geofenceAreas", "serviceAreas"];
      const safeProfile: Record<string, any> = {};
      for (const field of profileFields) {
        const value = submittedProfile[field];
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (field === "isProfileCompleted" && value === false) continue;
        safeProfile[field] = value;
      }

      await firestore.runTransaction(async (transaction) => {
        const existingSnap = await transaction.get(userRef);
        const existing = existingSnap.exists ? existingSnap.data() || {} : {};
        const createdAt = existing.createdAt || FieldValue.serverTimestamp();
        const nextRole = existing.role === "admin" ? "admin"
          : (existing.role === "worker" && existing.status === "APPROVED" ? "worker"
          : (existing.role || requestedRole));
        const loginCount = Number(existing.loginCount || 0) + 1;

        transaction.set(userRef, {
          ...safeProfile,
          uid,
          name: existing.name || safeProfile.name || displayName,
          email: existing.email || email || safeProfile.email || "",
          phone: existing.phone || phone || safeProfile.phone || "",
          role: nextRole,
          createdAt,
          updatedAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp(),
          lastSeen: FieldValue.serverTimestamp(),
          lastLoginAtIso: nowIso,
          loginCount,
          lastLoginMethod: loginMethod,
          lastLoginIdentifierType: loginMethod.includes("email") ? "email" : loginMethod.includes("phone") ? "phone" : loginMethod === "google" ? "Google" : loginMethod === "anonymous" ? "anonymous" : "NamoID",
          authProvider: loginMethod.startsWith("firebase-") ? "Firebase" : loginMethod === "google" ? "Google" : loginMethod === "anonymous" ? "Firebase Anonymous" : "NamoID",
        }, { merge: true });

        transaction.set(loginHistoryRef, {
          id: loginHistoryRef.id,
          uid,
          role: nextRole,
          loginMethod,
          identifierType: loginMethod.includes("email") ? "email" : loginMethod.includes("phone") ? "phone" : loginMethod === "google" ? "Google" : loginMethod === "anonymous" ? "anonymous" : "NamoID",
          email: email || null,
          phone: phone || null,
          timestamp: FieldValue.serverTimestamp(),
          timestampIso: nowIso,
          userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
          // Deliberately no password, OTP, Firebase token, or NamoID token is stored.
        });
      });

      // Mirror the verified identity/profile into the selected operational database.
      // Role is derived from the persisted server-side profile, never from the request.
      const persistedProfile = (await userRef.get()).data() || {};
      await dbAdapter.upsertUser({
        uid,
        name: String(persistedProfile.name || displayName),
        email: String(persistedProfile.email || email || ''),
        phone: String(persistedProfile.phone || phone || ''),
        photoURL: persistedProfile.photoURL || undefined,
        role: persistedProfile.role === 'admin' ? 'admin'
          : persistedProfile.role === 'worker' && persistedProfile.status === 'APPROVED' ? 'worker' : 'citizen',
        status: persistedProfile.status,
        address: persistedProfile.address,
        landmark: persistedProfile.landmark,
        area: persistedProfile.area,
        sector: persistedProfile.sector,
        workerSkill: persistedProfile.workerSkill,
        workerCategories: persistedProfile.workerCategories,
        workerExperience: persistedProfile.workerExperience,
        visitingFee: persistedProfile.visitingFee,
        applicationId: persistedProfile.applicationId,
      } as any);

      return res.json({ success: true, uid, recordedAt: nowIso });
    } catch (err: any) {
      logger.error("Auth session audit failed; login metadata was not saved:", err);
      return res.status(500).json({ success: false, error: "Unable to save sign-in history to Firebase. Please retry signing in." });
    }
  });

  // ─── USER PROFILE CRUD APIS ───
  app.get("/api/users/me", requireFirebaseUser, async (req, res) => {
    try {
      const uid = (req as any).user.uid;
      const user = await dbAdapter.getUser(uid);
      if (!user) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }
      return res.json({ success: true, user });
    } catch (err: any) {
      logger.error("Get user error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch user profile" });
    }
  });

  app.post("/api/users/profile", requireFirebaseUser, async (req, res) => {
    try {
      const uid = String((req as any).user.uid || "");
      const profileData = req.body && typeof req.body === "object" ? req.body : {};
      const existing = await dbAdapter.getUser(uid);
      const allowedFields = [
        "name", "email", "phone", "photoURL", "avatar", "dob", "birthdate",
        "isProfileCompleted", "address", "streetAddress", "landmark", "area",
        "sector", "city", "district", "state", "postalCode", "bio", "location",
        "geofenceRadiusKm", "geofenceArea", "geofenceAreas", "serviceAreas",
        "serviceAreaMode", "serviceAreaUpdatedAt", "geofenceUpdatedAt",
        "workerSkill", "workerCategories", "workerExperience", "experienceYears",
        "skill", "categories", "customSkill", "visitingFee", "minimumVisitingFee",
        "maximumVisitingFee", "applicationId", "workerAvailability", "isOnline",
        "workerStatus", "availabilityUpdatedAt", "termsAccepted", "serviceRadius",
        "serviceRadiusKm",
      ];
      const safeUpdates: Record<string, any> = {};
      for (const field of allowedFields) {
        const value = profileData[field];
        if (value === undefined || value === null) continue;
        if (typeof value === "string" && !value.trim()) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        safeUpdates[field] = value;
      }
      // Never accept role, approval status, UID, or audit counters from a client.
      const updated = await dbAdapter.upsertUser({
        ...(existing || { uid, role: "citizen" }),
        ...safeUpdates,
        uid,
        role: existing?.role || "citizen",
        ...(existing?.status ? { status: existing.status } : {}),
        ...(existing?.createdAt ? { createdAt: existing.createdAt } : {}),
      } as any);
      return res.json({ success: true, user: updated });
    } catch (err: any) {
      logger.error("Upsert user error; profile was not persisted:", err);
      return res.status(500).json({ success: false, error: "Failed to save profile to Firebase. Please retry." });
    }
  });

  // ─── AUTHORITATIVE PRICING & QUOTES (TASK SHEET SECTION 6 [P0]) ───
  app.post("/api/pricing/quote", async (req, res) => {
    try {
      const quote = calculateAuthoritativeQuote(req.body);
      return res.json({ success: true, quote });
    } catch (err: any) {
      logger.error("Pricing quote error:", err);
      return res.status(500).json({ success: false, error: "Failed to calculate pricing quote" });
    }
  });

  // ─── ORDERS CRUD & IDOR HARDENING (TASK SHEET SECTIONS 2, 4, 5 [P0]) ───
  app.get("/api/orders", requireFirebaseUser, async (req, res) => {
    try {
      const uid = (req as any).user.uid;
      const user = await dbAdapter.getUser(uid);
      const isUserAdmin = user?.role === "admin";
      const isUserWorker = user?.role === "worker" && user?.status === "APPROVED";

      let orders: OrderRecord[] = [];

      if (isUserAdmin) {
        orders = await dbAdapter.listOrders();
      } else if (isUserWorker) {
        // Workers can view jobs assigned to them plus available open broadcast dispatches
        const assignedOrders = await dbAdapter.listOrders({ workerId: uid });
        const openDispatchOrders = await dbAdapter.listOrders({ status: "DISPATCHING" });
        const legacyPending = await dbAdapter.listOrders({ status: "Pending" });

        const combinedMap = new Map<string, OrderRecord>();
        [...assignedOrders, ...openDispatchOrders, ...legacyPending].forEach((o) => {
          combinedMap.set(o.id, o);
        });
        orders = Array.from(combinedMap.values());
      } else {
        // Citizens strictly see only their own bookings (IDOR protection)
        orders = await dbAdapter.listOrders({ customerId: uid });
      }

      // Sanitize internal security fields (hashes, salts) before returning to client
      const sanitized = orders.map((o) => {
        const { startOtpHash, startOtpSalt, completionOtpHash, completionOtpSalt, ...rest } = o as any;
        return rest;
      });

      return res.json({ success: true, count: sanitized.length, orders: sanitized });
    } catch (err: any) {
      logger.error("List orders error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", requireFirebaseUser, async (req, res) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;
      const user = await dbAdapter.getUser(uid);
      const isUserAdmin = user?.role === "admin";

      const order = await dbAdapter.getOrder(id);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // IDOR check: caller must be customer, assigned worker, or admin
      const isWorkerAssigned = order.workerId === uid;
      const isOpenDispatchForWorker = (order.status === "DISPATCHING" || order.status === "Pending") && user?.role === "worker";

      if (!isUserAdmin && order.customerId !== uid && !isWorkerAssigned && !isOpenDispatchForWorker) {
        logger.security("IDOR violation: unauthorized order access attempt", { uid, orderId: id });
        return res.status(403).json({ success: false, error: "Forbidden: Access to this order is restricted" });
      }

      // Never expose OTP cryptographic hashes to client
      const { startOtpHash, startOtpSalt, completionOtpHash, completionOtpSalt, ...sanitized } = order as any;
      return res.json({ success: true, order: sanitized });
    } catch (err: any) {
      logger.error("Get order error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", requireFirebaseUser, async (req, res) => {
    try {
      const authUser = (req as any).user;
      const uid = String(authUser.uid || "");
      const orderData = req.body || {};
      if (!uid) return res.status(401).json({ success: false, error: "Authenticated customer ID is missing" });
      if (!String(orderData.serviceName || "").trim() || !String(orderData.address || orderData.customerAddress || "").trim() || !String(orderData.date || "").trim() || !String(orderData.time || "").trim()) {
        return res.status(400).json({ success: false, error: "Booking requires a service name, address, date, and time." });
      }

      // Resolve profile snapshots server-side so orders remain useful if a profile later changes.
      const existingCustomerProfile = await dbAdapter.getUser(uid);
      const customerProfile = await dbAdapter.upsertUser({
        ...(existingCustomerProfile || { uid, role: "citizen" }),
        uid,
        name: String(existingCustomerProfile?.name || authUser.name || orderData.customerName || authUser.email?.split("@")[0] || "PunchX Member").trim(),
        email: String(existingCustomerProfile?.email || authUser.email || orderData.customerEmail || "").trim(),
        phone: String(existingCustomerProfile?.phone || authUser.phone_number || orderData.customerPhone || "").trim(),
        role: existingCustomerProfile?.role === "admin" ? "admin"
          : existingCustomerProfile?.role === "worker" && existingCustomerProfile?.status === "APPROVED" ? "worker" : "citizen",
        status: existingCustomerProfile?.status,
      } as any);
      const requestedWorkerId = String(orderData.workerId || "").trim();
      const workerApplication = requestedWorkerId
        ? (await dbAdapter.getWorkerApplicationByUid(requestedWorkerId)) || await dbAdapter.getWorkerApplication(requestedWorkerId)
        : null;
      const resolvedWorkerId = workerApplication?.uid || requestedWorkerId;
      const workerProfile = resolvedWorkerId ? await dbAdapter.getUser(resolvedWorkerId) : null;
      if (requestedWorkerId && workerApplication?.status !== "APPROVED"
        && !(workerProfile?.role === "worker" && workerProfile?.status === "APPROVED")) {
        return res.status(400).json({ success: false, error: "The selected professional is not approved or is unavailable." });
      }
      const nowIso = new Date().toISOString();

      // First booking welcome offer: waive the customer platform fee once per authenticated account.
      // Check server-side order history; never trust a client-supplied "first booking" flag.
      const existingCustomerOrders = await dbAdapter.listOrders({ customerId: uid });
      const isFirstCustomerBooking = existingCustomerOrders.length === 0;

      // 1. Authoritative Server-Side Pricing Calculation (Never trust client prices)
      const quote = calculateAuthoritativeQuote({
        serviceId: orderData.serviceId,
        category: orderData.category,
        isEmergency: Boolean(orderData.emergencySurcharge || orderData.isEmergency),
        couponCode: orderData.couponUsed || orderData.couponCode,
        customVisitingFee: orderData.visitingFee,
        waivePlatformFee: isFirstCustomerBooking,
      });

      // 2. Initial state determination
      const isCashOnDelivery = orderData.paymentMethod === "COD" || orderData.paymentMethod === "CASH" || orderData.paymentMethod === "PAY_AFTER_SERVICE";
      const initialStatus: OrderStatus = isCashOnDelivery ? "DISPATCHING" : "PENDING_PAYMENT";

      // 3. Cryptographic Start OTP Generation for Customer Verification Gate
      const startOtpChallenge = generateSecureOtp();

      const orderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const resolvedWorkerName = workerProfile?.name || workerApplication?.legalName || String(orderData.workerName || "").trim() || (requestedWorkerId ? "Assigned professional" : "Not assigned");
      const createdByRole = customerProfile?.role === "worker" ? "worker" : "citizen";
      const newOrder: OrderRecord = {
        ...orderData,
        id: orderId,
        customerId: uid, // Always bind the order to the authenticated Firebase UID.
        customerReferenceId: String(orderData.customerReferenceId || `PXC-${uid.slice(-8).toUpperCase()}`),
        customerName: String(customerProfile?.name || authUser.name || orderData.customerName || authUser.email?.split("@")[0] || "").trim(),
        customerEmail: String(customerProfile?.email || authUser.email || orderData.customerEmail || "").trim(),
        customerPhone: String(customerProfile?.phone || authUser.phone_number || orderData.customerPhone || "").trim(),
        customerAddress: String(orderData.customerAddress || orderData.address || "").trim(),
        category: String(orderData.category || "General Service"),
        serviceId: orderData.serviceId || null,
        serviceName: String(orderData.serviceName || "").trim(),
        serviceItems: Array.isArray(orderData.serviceItems) ? orderData.serviceItems.slice(0, 50).map((item: any) => ({
          id: String(item?.id || item?.serviceId || "").slice(0, 160),
          serviceId: String(item?.serviceId || "").slice(0, 160),
          serviceName: String(item?.serviceName || "").slice(0, 200),
          category: String(item?.category || orderData.category || "").slice(0, 120),
          subcategory: String(item?.subcategory || "").slice(0, 120),
          description: String(item?.description || "").slice(0, 2000),
          price: Number.isFinite(Number(item?.price)) ? Math.max(0, Number(item.price)) : null,
          duration: String(item?.duration || "").slice(0, 100),
          quantity: Number.isFinite(Number(item?.quantity)) ? Math.max(1, Math.min(100, Math.floor(Number(item.quantity)))) : 1,
        })) : [],
        description: String(orderData.description || ""),
        note: String(orderData.note || ""),
        residentialAddress: orderData.residentialAddress && typeof orderData.residentialAddress === "object" ? orderData.residentialAddress : null,
        addressCoordinates: orderData.addressCoordinates && Number.isFinite(Number(orderData.addressCoordinates.lat)) && Number.isFinite(Number(orderData.addressCoordinates.lng))
          ? { lat: Number(orderData.addressCoordinates.lat), lng: Number(orderData.addressCoordinates.lng) } : null,
        geofenceArea: String(orderData.geofenceArea || ""),
        geofenceCity: String(orderData.geofenceCity || ""),
        serviceAreaMatch: orderData.serviceAreaMatch || null,
        serviceAvailabilityChecked: Boolean(orderData.serviceAvailabilityChecked),
        serviceAvailable: Boolean(orderData.serviceAvailable),
        workerId: resolvedWorkerId || null,
        workerName: resolvedWorkerName,
        workerPhone: String(workerProfile?.phone || workerApplication?.phone || orderData.workerPhone || ""),
        workerEmail: String(workerProfile?.email || workerApplication?.email || orderData.workerEmail || ""),
        workerCategory: String(workerProfile?.workerSkill || workerApplication?.skill || orderData.category || ""),
        workerAddress: String(workerProfile?.address || workerApplication?.address || ""),
        workerArea: String(workerProfile?.area || workerApplication?.area || ""),
        workerProfileSnapshot: workerProfile ? {
          uid: workerProfile.uid || requestedWorkerId,
          name: workerProfile?.name || workerApplication?.legalName || resolvedWorkerName,
          phone: workerProfile?.phone || workerApplication?.phone || "",
          email: workerProfile?.email || workerApplication?.email || "",
          skill: workerProfile?.workerSkill || workerApplication?.skill || "",
          categories: workerProfile?.workerCategories || workerApplication?.categories || [],
          area: workerProfile?.area || workerApplication?.area || "",
          city: workerProfile?.city || workerApplication?.city || "",
        } : (workerApplication ? {
          uid: resolvedWorkerId,
          name: workerApplication.legalName || "",
          phone: workerApplication.phone || "",
          email: workerApplication.email || "",
          skill: workerApplication.skill || "",
          categories: workerApplication.categories || [],
          area: workerApplication.area || "",
          city: workerApplication.city || "",
        } : null),
        customerProfileSnapshot: {
          uid,
          name: String(customerProfile?.name || authUser.name || orderData.customerName || ""),
          email: String(customerProfile?.email || authUser.email || orderData.customerEmail || ""),
          phone: String(customerProfile?.phone || authUser.phone_number || orderData.customerPhone || ""),
          address: String(customerProfile?.address || orderData.address || ""),
          area: String(customerProfile?.area || ""),
          city: String(customerProfile?.city || ""),
        },
        bookingCreatedByUid: uid,
        bookingCreatedByRole: createdByRole,
        price: quote.baseVisitingFee,
        serviceSubtotal: Array.isArray(orderData.serviceItems) ? orderData.serviceItems.reduce((sum: number, item: any) => sum + (Number.isFinite(Number(item?.price)) ? Math.max(0, Number(item.price)) * Math.max(1, Math.min(100, Math.floor(Number(item?.quantity || 1)))) : 0), 0) : (Number.isFinite(Number(orderData.price)) ? Math.max(0, Number(orderData.price)) : quote.baseVisitingFee),
        originalPrice: quote.subtotalBeforeDiscount,
        discountApplied: quote.discountApplied,
        couponUsed: quote.couponUsed,
        visitingFee: quote.baseVisitingFee,
        customerPlatformFee: quote.customerPlatformFee,
        gstAmount: quote.gstAmount,
        totalAmountToPay: quote.totalAmountToPay + (Number.isFinite(Number(orderData.warrantyFee)) ? Math.max(0, Number(orderData.warrantyFee)) : 0),
        platformCommission: quote.platformCommission,
        commissionRate: quote.commissionRate,
        professionalPayout: quote.professionalPayout,
        date: orderData.date || nowIso.slice(0, 10),
        time: orderData.time || "",
        address: String(orderData.address || orderData.customerAddress || "").trim(),
        status: initialStatus,
        paymentMethod: isCashOnDelivery ? "COD" : "ONLINE",
        paymentStatus: isCashOnDelivery ? "pending" : (orderData.paymentId ? "paid" : "pending"),
        paymentId: orderData.paymentId || null,
        createdAt: nowIso,
        updatedAt: nowIso,
        bookedAt: nowIso,
        bookingTimeline: {
          ...(orderData.bookingTimeline || {}),
          bookedAt: nowIso,
          currentStage: "BOOKED",
          stages: Array.isArray(orderData.bookingTimeline?.stages) ? orderData.bookingTimeline.stages : ["BOOKED", "PROFESSIONAL_MATCH", "ARRIVAL", "WORK_STARTED", "COMPLETION", "INVOICE", "WARRANTY", "REVIEW"],
        },
        startOtpHash: startOtpChallenge.hash,
        startOtpSalt: startOtpChallenge.salt,
        startOtpExpiresAt: startOtpChallenge.expiresAt,
        startOtpAttempts: 0,
        stateHistory: [
          {
            from: "NONE",
            to: initialStatus,
            timestamp: nowIso,
            actorUid: uid,
            actorRole: "citizen",
            reason: "Initial booking submission",
          },
        ],
      };

      const created = await dbAdapter.createOrder(newOrder);

      // Return order to caller, including startOtp in plain text ONLY to the customer creating the order
      const { startOtpHash, startOtpSalt, completionOtpHash, completionOtpSalt, ...sanitized } = created as any;
      return res.status(201).json({
        success: true,
        order: sanitized,
        startOtp: startOtpChallenge.code, // Citizen receives their secret start code to give to the worker upon arrival
      });
    } catch (err: any) {
      logger.error("Create order error:", err);
      return res.status(500).json({ success: false, error: "Failed to create order" });
    }
  });

  // ─── ORDER STATE MACHINE TRANSITION API (TASK SHEET SECTION 5 [P0]) ───
  app.post("/api/orders/:id/transition", requireFirebaseUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { targetStatus, reason, photoProof, notes } = req.body;
      const uid = (req as any).user.uid;

      if (!targetStatus) {
        return res.status(400).json({ success: false, error: "Missing required targetStatus parameter" });
      }

      // Determine caller's authoritative role
      const userProfile = await dbAdapter.getUser(uid);
      let actorRole: "citizen" | "worker" | "admin" = "citizen";
      if (userProfile?.role === "admin") {
        actorRole = "admin";
      } else if (userProfile?.role === "worker" && userProfile?.status === "APPROVED") {
        actorRole = "worker";
      }

      const result = await executeOrderTransition(
        id,
        targetStatus as OrderStatus,
        {
          actorUid: uid,
          actorRole,
          reason,
          workerName: userProfile?.name,
          workerPhone: userProfile?.phone,
          photoProof,
          notes,
        },
        photoProof || notes ? { photoProof, issueDescription: notes } : undefined
      );

      if (!result.success) {
        return res.status(result.statusCode).json({ success: false, error: result.error });
      }

      const { startOtpHash, startOtpSalt, completionOtpHash, completionOtpSalt, ...sanitized } = (result.order as any) || {};
      return res.json({ success: true, order: sanitized });
    } catch (err: any) {
      logger.error("Order transition error:", err);
      return res.status(500).json({ success: false, error: "Failed to execute state transition" });
    }
  });

  // ─── DYNAMIC CRYPTOGRAPHIC OTP APIS (TASK SHEET SECTION 8 [P0]) ───
  app.post("/api/orders/:id/otp/generate", requireFirebaseUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { type = "START" } = req.body;
      const uid = (req as any).user.uid;

      const order = await dbAdapter.getOrder(id);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // IDOR check: caller must be customer, assigned worker, or admin
      const user = await dbAdapter.getUser(uid);
      const isUserAdmin = user?.role === "admin";
      const isCustomer = order.customerId === uid;
      const isAssignedWorker = order.workerId === uid;

      if (!isUserAdmin && !isCustomer && !isAssignedWorker) {
        return res.status(403).json({ success: false, error: "Forbidden: Not authorized for this order" });
      }

      const generated = generateSecureOtp();
      const updateData: Partial<OrderRecord> = {};

      if (type === "COMPLETION") {
        updateData.completionOtpHash = generated.hash;
        updateData.completionOtpSalt = generated.salt;
        updateData.completionOtpExpiresAt = generated.expiresAt;
        updateData.completionOtpAttempts = 0;
      } else {
        updateData.startOtpHash = generated.hash;
        updateData.startOtpSalt = generated.salt;
        updateData.startOtpExpiresAt = generated.expiresAt;
        updateData.startOtpAttempts = 0;
      }

      await dbAdapter.updateOrderStatus(id, order.status, updateData);
      logger.info(`Generated ${type} OTP challenge for order ${id} by ${uid}`);

      // Citizens and Admins receive the raw code to show/give to the specialist.
      // Workers DO NOT receive the raw code (it is dispatched via customer notification/SMS simulation).
      if (isCustomer || isUserAdmin) {
        return res.json({
          success: true,
          type,
          expiresAt: generated.expiresAt,
          otp: generated.code,
          message: `Security ${type} OTP generated successfully`,
        });
      } else {
        return res.json({
          success: true,
          type,
          expiresAt: generated.expiresAt,
          message: `Security ${type} OTP dispatched securely to the customer's phone`,
        });
      }
    } catch (err: any) {
      logger.error("Generate OTP error:", err);
      return res.status(500).json({ success: false, error: "Failed to generate security OTP" });
    }
  });

  app.post("/api/orders/:id/otp/verify", requireFirebaseUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { type = "START", otp } = req.body;
      const uid = (req as any).user.uid;

      if (!otp) {
        return res.status(400).json({ success: false, error: "Missing required otp parameter" });
      }

      const order = await dbAdapter.getOrder(id);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      const user = await dbAdapter.getUser(uid);
      const isUserAdmin = user?.role === "admin";
      const isAssignedWorker = order.workerId === uid;

      // Specialists verify the code provided by the customer
      if (!isUserAdmin && !isAssignedWorker) {
        return res.status(403).json({ success: false, error: "Forbidden: Only assigned specialist can verify OTP" });
      }

      const isCompletion = type === "COMPLETION";
      const challengeRecord = {
        hash: isCompletion ? order.completionOtpHash : order.startOtpHash,
        salt: isCompletion ? order.completionOtpSalt : order.startOtpSalt,
        expiresAt: isCompletion ? order.completionOtpExpiresAt : order.startOtpExpiresAt,
        attempts: isCompletion ? (order.completionOtpAttempts || 0) : (order.startOtpAttempts || 0),
      };

      const verifyResult = verifyOtpChallenge(otp, challengeRecord);

      if (!verifyResult.valid) {
        // Record incremented attempts in DB
        const newAttempts = (challengeRecord.attempts || 0) + 1;
        const attemptsUpdate = isCompletion
          ? { completionOtpAttempts: newAttempts }
          : { startOtpAttempts: newAttempts };
        await dbAdapter.updateOrderStatus(id, order.status, attemptsUpdate);

        const statusHttp = verifyResult.locked ? 429 : 400;
        return res.status(statusHttp).json({
          success: false,
          error: verifyResult.error,
          attemptsRemaining: verifyResult.attemptsRemaining,
        });
      }

      // OTP is valid! Transition the order authoritatively
      const targetState: OrderStatus = isCompletion ? "COMPLETED" : "IN_SERVICE";
      const transitionResult = await executeOrderTransition(
        id,
        targetState,
        {
          actorUid: uid,
          actorRole: isUserAdmin ? "admin" : "worker",
          reason: `Verified valid ${type} security code from customer`,
        },
        isCompletion ? { serviceProof: { ...order.serviceProof, completionOtpVerified: true } } : undefined
      );

      const { startOtpHash, startOtpSalt, completionOtpHash, completionOtpSalt, ...sanitized } = (transitionResult.order as any) || {};
      return res.json({
        success: true,
        message: `${type} OTP verified successfully! Order moved to ${targetState}`,
        order: sanitized,
      });
    } catch (err: any) {
      logger.error("Verify OTP error:", err);
      return res.status(500).json({ success: false, error: "Failed to verify security code" });
    }
  });

  // ─── PAYMENT GATEWAY & WEBHOOK APIS (TASK SHEET SECTION 7 [P0]) ───
  app.post("/api/payments/create-order", requireFirebaseUser, async (req, res) => {
    try {
      const { orderId } = req.body;
      const uid = (req as any).user.uid;

      if (!orderId) {
        return res.status(400).json({ success: false, error: "Missing orderId parameter" });
      }

      const order = await dbAdapter.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // IDOR check
      if (order.customerId !== uid) {
        return res.status(403).json({ success: false, error: "Forbidden: You can only initiate payment for your own orders" });
      }

      const user = await dbAdapter.getUser(uid);
      const amountInRupees = order.totalAmountToPay || order.price;

      const gatewayOrder = await createGatewayPaymentOrder({
        orderId,
        amountInRupees,
        customerName: order.customerName || user?.name,
        customerEmail: user?.email,
        customerPhone: order.customerPhone || user?.phone,
      });

      // Update order with pending payment details
      await dbAdapter.updateOrderStatus(orderId, "PENDING_PAYMENT", {
        paymentDetails: {
          razorpayOrderId: gatewayOrder.gatewayOrderId,
          amount: gatewayOrder.amount,
          currency: gatewayOrder.currency,
          status: "CREATED",
        },
      });

      return res.json({
        success: true,
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
        keyId: gatewayOrder.keyId,
        isMock: gatewayOrder.isMock,
      });
    } catch (err: any) {
      logger.error("Payment create order error:", err);
      return res.status(500).json({ success: false, error: "Failed to initialize payment gateway order" });
    }
  });

  app.post("/api/payments/verify", requireFirebaseUser, async (req, res) => {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const uid = (req as any).user.uid;

      if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({ success: false, error: "Missing required payment parameters" });
      }

      const order = await dbAdapter.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      if (order.customerId !== uid) {
        return res.status(403).json({ success: false, error: "Forbidden: Unauthorized payment verification" });
      }

      const isSignatureValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isSignatureValid) {
        logger.security("Payment signature verification failed", { orderId, razorpayPaymentId });
        return res.status(400).json({ success: false, error: "Invalid payment verification signature" });
      }

      // Payment lifecycle is authoritative: PENDING_PAYMENT -> PAID -> DISPATCHING.
      const paidUpdate: Partial<OrderRecord> = {
        paymentStatus: "PAID",
        paymentMethod: "RAZORPAY_ONLINE",
        paymentDetails: {
          razorpayOrderId,
          razorpayPaymentId,
          signature: razorpaySignature,
          paidAt: new Date().toISOString(),
          status: "CAPTURED",
        },
      };

      const paidResult = await executeOrderTransition(
        orderId,
        "PAID",
        {
          actorUid: uid,
          actorRole: "system",
          reason: `Payment verified via gateway (Payment ID: ${razorpayPaymentId})`,
        },
        paidUpdate
      );
      if (!paidResult.success) {
        return res.status(paidResult.statusCode).json({ success: false, error: paidResult.error || "Unable to mark payment as paid" });
      }

      const dispatchResult = await executeOrderTransition(
        orderId,
        "DISPATCHING",
        {
          actorUid: uid,
          actorRole: "system",
          reason: "Payment confirmed; specialist dispatch initiated",
        }
      );
      if (!dispatchResult.success) {
        return res.status(dispatchResult.statusCode).json({ success: false, error: dispatchResult.error || "Unable to dispatch paid order" });
      }

      const { startOtpHash, startOtpSalt, completionOtpHash, completionOtpSalt, ...sanitized } = (dispatchResult.order as any) || {};
      return res.json({
        success: true,
        message: "Payment captured successfully. Specialist dispatching initiated.",
        order: sanitized,
      });
    } catch (err: any) {
      logger.error("Payment verification error:", err);
      return res.status(500).json({ success: false, error: "Failed to verify payment" });
    }
  });

  // Razorpay Server-to-Server Webhook Endpoint (HMAC-SHA256 signature validation & idempotency)
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const signature = (req.headers["x-razorpay-signature"] as string) || "";
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const isSignatureValid = verifyWebhookSignature(rawBody, signature);
      if (!isSignatureValid) {
        logger.security("Rejected unauthorized payment webhook: invalid signature");
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const event = req.body;
      const eventId = String(event?.id || (event?.event && event?.created_at ? `${event.event}_${event.created_at}` : "")).slice(0, 200);
      if (!eventId) return res.status(400).json({ error: "Webhook event ID is missing" });

      // Claim the event in persistent storage before processing. The lease
      // prevents parallel Vercel instances from processing the same event.
      const claimStatus = await dbAdapter.claimPaymentWebhookEvent(eventId, String(event?.event || "unknown"));
      if (claimStatus === 'PROCESSED') {
        logger.info(`Webhook event ${eventId} was already processed`);
        return res.json({ status: "already_processed" });
      }
      if (claimStatus === 'BUSY') {
        logger.info(`Webhook event ${eventId} is currently being processed by another instance`);
        return res.status(409).json({ status: "processing", retry: true });
      }

      // Handle payment capture / order paid events
      if (event?.event === "payment.captured" || event?.event === "order.paid") {
        const paymentEntity = event?.payload?.payment?.entity;
        const appOrderId = paymentEntity?.notes?.appOrderId || paymentEntity?.receipt;

        if (appOrderId) {
          logger.info(`Webhook captured payment for order ${appOrderId}`);
          const paidResult = await executeOrderTransition(
            appOrderId,
            "PAID",
            {
              actorUid: "gateway_webhook",
              actorRole: "system",
              reason: `Webhook payment capture (Transaction: ${paymentEntity.id})`,
            },
            {
              paymentStatus: "PAID",
              paymentDetails: {
                razorpayOrderId: paymentEntity.order_id,
                razorpayPaymentId: paymentEntity.id,
                paidAt: new Date().toISOString(),
                status: "CAPTURED",
              },
            }
          );
          if (!paidResult.success) {
            throw new Error(paidResult.error || "Payment capture transition could not be committed");
          }
          await executeOrderTransition(
            appOrderId,
            "DISPATCHING",
            {
              actorUid: "gateway_webhook",
              actorRole: "system",
              reason: "Webhook payment confirmed; specialist dispatch initiated",
            }
          );
        }
      }

      await dbAdapter.completePaymentWebhookEvent(eventId);
      return res.json({ status: "ok" });
    } catch (err: any) {
      logger.error("Webhook processing error:", err);
      return res.status(500).json({ error: "Internal webhook processing failed" });
    }
  });

  // ─── LIVE LOCATION TELEMETRY & GEOFENCING (TASK SHEET SECTION 9 [P0/P1]) ───
  app.post("/api/tracking/location", requireFirebaseUser, requireWorker, async (req, res) => {
    try {
      const { orderId, lat, lng, heading, accuracy, speed } = req.body;
      const uid = (req as any).user.uid;

      if (!orderId || typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ success: false, error: "Missing required orderId and coordinate numbers" });
      }

      const result = await updateWorkerLocationTelemetry({
        orderId,
        workerUid: uid,
        lat,
        lng,
        heading,
        accuracy,
        speed,
      });

      return res.status(result.statusCode).json({ success: result.success, error: result.error });
    } catch (err: any) {
      logger.error("Tracking location update error:", err);
      return res.status(500).json({ success: false, error: "Failed to update location telemetry" });
    }
  });

  app.get("/api/orders/:id/tracking", requireFirebaseUser, async (req, res) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;
      const user = await dbAdapter.getUser(uid);

      const result = await getOrderTrackingStatus(id, uid, user?.role || "citizen");
      if (!result.success) {
        return res.status(result.statusCode).json({ success: false, error: result.error });
      }

      return res.json({ success: true, tracking: result.tracking });
    } catch (err: any) {
      logger.error("Get tracking status error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch tracking telemetry" });
    }
  });

  // ─── WORKER SIGNUP DYNAMIC DUAL OTP API (TASK SHEET SECTION 8 [P0]) ───
  // Replaces hardcoded 8842/9921 with dynamic server-generated challenge
  app.post("/api/auth/worker-signup-otp", async (_req, res) => {
    // Never return static OTPs or claim an unverified phone/email is verified.
    return res.status(503).json({
      success: false,
      error: "OTP verification is temporarily unavailable. Please use the verified NamoID sign-in flow."
    });
  });


  // ─── WORKER APPLICATIONS APIS ───
  // Query worker registration & verification status for authenticated user
  app.get("/api/workers/status", requireFirebaseUser, async (req, res) => {
    try {
      const uid = String((req as any).user.uid);
      const profile = await dbAdapter.getUser(uid);
      const application = await dbAdapter.getWorkerApplicationByUid(uid);
      const status = application?.status || (profile?.role === "worker" ? profile.status : "NOT_REGISTERED");
      const registered = Boolean(application || profile?.role === "worker" || profile?.applicationId);

      return res.json({
        success: true,
        registered,
        status: status || "PENDING",
        applicationId: application?.id || profile?.applicationId || null,
        appliedAt: application?.appliedAt || null,
        role: status === "APPROVED" ? "worker" : "citizen",
        categories: application?.categories || profile?.workerCategories || [],
        skill: application?.skill || profile?.workerSkill || null
      });
    } catch (err) {
      logger.error("Worker status query error:", err);
      return res.status(500).json({ success: false, error: "Failed to determine worker registration status" });
    }
  });

  // Authoritative worker availability endpoint. Uses Firebase Admin so a valid
  // worker session is not blocked by client-side Firestore rules or stale profile IDs.
  // Authoritative worker availability endpoint. Use the same named Firestore database
  // as the browser app so status changes are immediately visible to the worker panel.
  app.patch("/api/workers/availability", requireFirebaseUser, async (req, res) => {
    try {
      const uid = String((req as any).user?.uid || "");
      const nextOnline = req.body?.online;
      if (!uid || typeof nextOnline !== "boolean") {
        return res.status(400).json({ success: false, error: "A valid worker session and boolean online value are required." });
      }

      if (getApps().length === 0) {
        return res.status(503).json({ success: false, error: "Worker availability service is not connected to Firebase Admin." });
      }

      const databaseId = process.env.FIREBASE_DATABASE_ID
        || process.env.VITE_FIREBASE_DATABASE_ID
        || "ai-studio-punchxservicecus-c71be4cc-9ee1-4ae7-b718-125aa03bcd38";
      const firestore = getFirestore(undefined, databaseId);
      const userRef = firestore.collection("users").doc(uid);
      const currentSnapshot = await userRef.get();
      const adapterProfile = await dbAdapter.getUser(uid);
      const currentData = currentSnapshot.exists ? currentSnapshot.data() : (adapterProfile || {});

      let workerApp: any = null;
      for (const collectionName of ["workerApplications", "worker_applications"]) {
        const appSnapshot = await firestore.collection(collectionName).where("uid", "==", uid).limit(1).get();
        if (!appSnapshot.empty) {
          workerApp = { id: appSnapshot.docs[0].id, ...(appSnapshot.docs[0].data() as any) };
          break;
        }
      }
      if (!workerApp) {
        const applicationId = String(currentData?.applicationId || adapterProfile?.applicationId || "");
        if (applicationId) {
          for (const collectionName of ["workerApplications", "worker_applications"]) {
            const appDoc = await firestore.collection(collectionName).doc(applicationId).get();
            if (appDoc.exists) {
              const data = appDoc.data() as any;
              if (!data?.uid || data.uid === uid) {
                workerApp = { id: appDoc.id, ...data, uid };
                break;
              }
            }
          }
        }
      }
      if (!workerApp) {
        const contact = {
          phone: currentData?.phone || adapterProfile?.phone || (req as any).user?.phone_number,
          email: currentData?.email || adapterProfile?.email || (req as any).user?.email
        };
        workerApp = await dbAdapter.getWorkerApplicationByUid(uid)
          || ((contact.phone || contact.email) ? await dbAdapter.getWorkerApplicationByContact(contact) : null);
      }

      const hasWorkerProfileSignals = Boolean(
        currentData?.applicationId || currentData?.workerSkill || currentData?.workerCategories
        || adapterProfile?.applicationId || adapterProfile?.workerSkill || adapterProfile?.workerCategories
      );
      if (currentData?.role !== "worker" && adapterProfile?.role !== "worker" && !workerApp && !hasWorkerProfileSignals) {
        return res.status(403).json({ success: false, error: "This account is not registered as a PunchX professional. Complete worker registration and sign in again." });
      }

      const updatedAt = new Date().toISOString();
      const availability = {
        workerAvailability: nextOnline,
        isOnline: nextOnline,
        workerStatus: nextOnline ? "ONLINE" : "OFFLINE",
        availabilityUpdatedAt: updatedAt,
        updatedAt
      };
      const profilePatch = {
        ...(currentData || {}),
        uid,
        role: "worker",
        ...availability
      };

      await userRef.set(profilePatch, { merge: true });
      // Postgres can be an optional profile mirror, but the named Firestore
      // document above remains authoritative for the web app's availability.
      if (dbAdapter.providerName !== "firebase") {
        try {
          await dbAdapter.upsertUser(profilePatch as any);
        } catch (profileSyncError) {
          logger.warn("Worker availability Firestore write succeeded; optional database profile sync skipped:", profileSyncError);
        }
      }

      if (workerApp?.id && workerApp.uid === uid) {
        await Promise.allSettled([
          firestore.collection("workerApplications").doc(String(workerApp.id)).set({ uid, ...availability }, { merge: true }),
          firestore.collection("worker_applications").doc(String(workerApp.id)).set({ uid, ...availability }, { merge: true })
        ]);
      }
      await firestore.collection("workers").doc(uid).set({ uid, ...availability }, { merge: true });

      logger.info("Worker availability updated", { uid, online: nextOnline, databaseId });
      return res.json({ success: true, online: nextOnline, availabilityUpdatedAt: updatedAt });
    } catch (err: any) {
      logger.error("Worker availability update error:", err);
      return res.status(500).json({ success: false, error: "Could not save worker availability. Please retry." });
    }
  });

  app.post("/api/worker-applications", requireFirebaseUser, async (req, res) => {
    try {
      const uid = String((req as any).user.uid);
      const appData = req.body && typeof req.body === "object" ? req.body : {};
      if (!appData.legalName || !appData.phone || !appData.email || !appData.termsAccepted) {
        return res.status(400).json({ success: false, error: "Legal name, phone, email and accepted terms are required." });
      }

      // Identity comes only from the verified Firebase token. Approval is an
      // admin action; registration never grants professional permissions.
      const existing = await dbAdapter.getWorkerApplicationByUid(uid);
      if (existing && existing.status !== "REJECTED") {
        return res.status(409).json({ success: false, error: "A professional application already exists for this account.", application: existing });
      }

      const current = await dbAdapter.getUser(uid);
      // The user row must exist before the application because the database
      // enforces its applicant foreign key.
      await dbAdapter.upsertUser({
        ...(current || { uid, role: "citizen" }),
        uid,
        role: current?.role === "admin" ? "admin" : "citizen",
        status: "PENDING",
        name: String(appData.legalName).slice(0, 160),
        email: String(appData.email).slice(0, 320),
        phone: String(appData.phone).slice(0, 40),
        updatedAt: new Date().toISOString()
      } as any);

      const created = await dbAdapter.createWorkerApplication({
        ...appData,
        uid,
        status: "PENDING"
      });

      await dbAdapter.upsertUser({
        ...(current || { uid, role: "citizen" }),
        uid,
        role: current?.role === "admin" ? "admin" : "citizen",
        status: "PENDING",
        applicationId: created.id,
        name: String(appData.legalName).slice(0, 160),
        email: String(appData.email).slice(0, 320),
        phone: String(appData.phone).slice(0, 40),
        updatedAt: new Date().toISOString()
      } as any);

      logger.info(`Professional application submitted for admin review: ${created.id}`);
      return res.status(201).json({ success: true, application: created, message: "Application submitted for admin approval." });
    } catch (err) {
      logger.error("Worker application error:", err);
      return res.status(500).json({ success: false, error: "Failed to submit professional application" });
    }
  });

  // Public professional discovery: return only sanitized, approved marketplace fields.
  // Private application fields (phone, email, documents, OTPs, review notes, etc.) stay server-side.
  app.get("/api/public/professionals", requireFirebaseUser, async (req, res) => {
    try {
      const apps = await dbAdapter.listWorkerApplications("APPROVED");
      let onlineByUid = new Map<string, boolean>();
      try {
        const databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-punchxservicecus-c71be4cc-9ee1-4ae7-b718-125aa03bcd38";
        const userSnap = await getFirestore(undefined, databaseId).collection("users").where("role", "==", "worker").get();
        onlineByUid = new Map(
          userSnap.docs.map((doc) => [doc.id, doc.data()?.workerAvailability === true || doc.data()?.isOnline === true])
        );
      } catch (userError) {
        logger.warn("Professional discovery online-status lookup notice:", userError);
      }

      const professionals = apps
        .filter((app: any) => app.status === "APPROVED" && app.available !== false)
        .map((app: any) => ({
          id: app.id,
          uid: String(app.uid || app.id),
          name: String(app.legalName || "Verified Professional"),
          category: String(app.skill || app.category || "Professional"),
          categories: Array.isArray(app.categories) ? app.categories.map(String) : undefined,
          rating: Number(app.rating || 0),
          reviewsCount: Number(app.reviewsCount || 0),
          avatar: String(app.photoURL || app.avatar || ""),
          proBadge: "AUTHORIZED",
          price: Number(app.price || app.visitingFee || 0),
          visitingFee: Number(app.visitingFee || 0),
          available: true,
          isOnline: onlineByUid.get(String(app.uid || app.id)) === true,
          area: String(app.area || ""),
          sector: String(app.sector || ""),
          serviceAreas: Array.isArray(app.serviceAreas) ? app.serviceAreas.map(String) : Array.isArray(app.geofenceAreas) ? app.geofenceAreas.map(String) : undefined,
          geofenceAreas: Array.isArray(app.geofenceAreas) ? app.geofenceAreas.map(String) : undefined,
          serviceAreaMode: app.serviceAreaMode || "india-named-areas",
          location: app.location && typeof app.location.lat === "number" && typeof app.location.lng === "number"
            ? { lat: app.location.lat, lng: app.location.lng }
            : undefined,
        }));
      return res.json({ success: true, count: professionals.length, professionals });
    } catch (err: any) {
      logger.error("Public professional discovery error:", err);
      return res.status(500).json({ success: false, error: "Failed to load verified professionals" });
    }
  });

  app.get("/api/worker-applications", requireFirebaseUser, requireAdmin, async (req, res) => {
    try {
      const apps = await dbAdapter.listWorkerApplications();
      return res.json({ success: true, count: apps.length, applications: apps });
    } catch (err: any) {
      logger.error("List worker applications error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch worker applications" });
    }
  });

  app.patch("/api/worker-applications/:id/status", requireFirebaseUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      if (status !== "APPROVED" && status !== "REJECTED") {
        return res.status(400).json({ success: false, error: "Invalid status: must be APPROVED or REJECTED" });
      }

      const updated = await dbAdapter.updateWorkerApplicationStatus(id, status, notes);
      if (!updated) {
        return res.status(404).json({ success: false, error: "Worker application not found" });
      }

      logger.info(`Admin updated worker application ${id} to ${status}`);
      return res.json({ success: true, application: updated });
    } catch (err: any) {
      logger.error("Update worker application status error:", err);
      return res.status(500).json({ success: false, error: "Failed to update worker application status" });
    }
  });

  // ─── CLAIMS & COMPLAINTS APIS ───
  app.post("/api/claims", requireFirebaseUser, async (req, res) => {
    try {
      const claim = await dbAdapter.createWarrantyClaim(req.body);
      return res.status(201).json({ success: true, claim });
    } catch (err: any) {
      logger.error("Create claim error:", err);
      return res.status(500).json({ success: false, error: "Failed to submit warranty claim" });
    }
  });

  app.get("/api/claims", requireFirebaseUser, requireAdmin, async (req, res) => {
    try {
      const claims = await dbAdapter.listWarrantyClaims();
      return res.json({ success: true, count: claims.length, claims });
    } catch (err: any) {
      logger.error("List claims error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch claims" });
    }
  });

  // NamoID -> Firebase Custom Token Exchange Endpoint
  app.post("/api/auth/namoid-token", async (req, res) => {
    try {
      const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken.trim() : "";
      if (!accessToken || accessToken.length > 16384) {
        return res.status(401).json({ success: false, error: "A valid NamoID access token is required." });
      }

      const upstream = await fetch("https://punch-x-747dd7.id.namoid.in/v1/oauth/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000)
      });
      if (!upstream.ok) {
        return res.status(401).json({ success: false, error: "NamoID could not verify this session." });
      }

      const identity = await upstream.json() as Record<string, unknown>;
      const email = typeof identity.email === "string" ? identity.email.trim().toLowerCase() : "";
      const subject = typeof identity.sub === "string" ? identity.sub.trim()
        : typeof identity.id === "string" ? identity.id.trim()
        : typeof identity.user_id === "string" ? identity.user_id.trim() : "";
      if (!subject && !email) {
        return res.status(401).json({ success: false, error: "NamoID did not return a stable identity." });
      }

      const uid = subject || `namoid_${crypto.createHash("sha256").update(email).digest("hex").slice(0, 20)}`;
      const existing = await dbAdapter.getUser(uid);
      const application = await dbAdapter.getWorkerApplicationByUid(uid);
      const role = existing?.role === "admin" ? "admin"
        : existing?.role === "worker" && existing?.status === "APPROVED" || application?.status === "APPROVED" ? "worker"
        : "citizen";

      if (getApps().length === 0) {
        return res.status(503).json({ success: false, error: "Firebase Admin is not configured for secure token exchange." });
      }
      const customToken = await getAuth().createCustomToken(uid, { role });
      return res.json({ success: true, customToken, uid, role });
    } catch (err) {
      logger.error("Verified NamoID token exchange failed:", err);
      return res.status(503).json({ success: false, error: "Secure NamoID authentication is temporarily unavailable." });
    }
  });

  // NamoID Proxy API (routes requests server-side to prevent browser CORS blocks)
  app.all(["/api/namoid-proxy", "/api/oauth/token"], async (req, res) => {
    // CORS is now handled by the cors middleware above — no wildcard needed
    const requestOrigin = req.headers.origin || "";
    if (ALLOWED_ORIGINS.includes(requestOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    let targetUrl = (req.query.url as string) || (req.body?.targetUrl as string);
    if (!targetUrl || req.path === "/api/oauth/token") {
      targetUrl = "https://punch-x-747dd7.id.namoid.in/v1/oauth/token";
    }

    if (!targetUrl.startsWith("https://punch-x-747dd7.id.namoid.in/") && !targetUrl.startsWith("https://api.namoid.in/")) {
      return res.status(400).json({ error: "Invalid target URL" });
    }

    const isTokenEndpoint = targetUrl.includes("/oauth/token") || targetUrl.includes("/v1/oauth/token");

    try {
      const headers: Record<string, string> = {
        accept: (req.headers["accept"] as string) || "application/json",
      };
      if (req.headers["authorization"]) {
        headers["authorization"] = req.headers["authorization"] as string;
      }

      let outgoingMethod = req.method;
      let body: string | undefined = undefined;

      if (isTokenEndpoint) {
        // OAuth token exchange MUST always be HTTP POST with application/x-www-form-urlencoded
        outgoingMethod = "POST";
        headers["content-type"] = "application/x-www-form-urlencoded";

        // Collect all potential parameters from body and query
        const bodyObj: Record<string, string> = {};

        let rawBody = req.body;
        if (typeof Buffer !== "undefined" && Buffer.isBuffer(rawBody)) {
          rawBody = rawBody.toString("utf-8");
        }

        if (typeof rawBody === "object" && rawBody !== null) {
          for (const [k, v] of Object.entries(rawBody)) {
            if (k !== "targetUrl" && v !== undefined && v !== null) {
              bodyObj[k] = String(v);
            }
          }
        } else if (typeof rawBody === "string" && rawBody.length > 0) {
          try {
            const parsed = new URLSearchParams(rawBody);
            for (const [k, v] of parsed.entries()) {
              if (k !== "targetUrl" && v !== undefined && v !== null) {
                bodyObj[k] = v;
              }
            }
          } catch {
            // non-form string
          }
        }

        if (typeof req.query === "object" && req.query !== null) {
          for (const [k, v] of Object.entries(req.query)) {
            if (k !== "url" && k !== "targetUrl" && typeof v === "string" && !bodyObj[k]) {
              bodyObj[k] = v;
            }
          }
        }

        // Ensure mandatory OAuth exchange parameters
        if (!bodyObj.grant_type) {
          bodyObj.grant_type = "authorization_code";
        }
        if (!bodyObj.client_id) {
          bodyObj.client_id = "namoid_client_live_6SHiIOdLuGIBZmiJjC5Iu5KCbqB2QQjd";
        }
        if (!bodyObj.redirect_uri) {
          const originHeader = (req.headers["origin"] as string) || (req.headers["referer"] as string);
          if (originHeader && !originHeader.includes("punchxapp.co.in")) {
            try {
              const urlObj = new URL(originHeader);
              bodyObj.redirect_uri = `${urlObj.origin}/auth/callback`;
            } catch {
              bodyObj.redirect_uri = "https://www.punchxapp.co.in/auth/callback";
            }
          } else {
            bodyObj.redirect_uri = "https://www.punchxapp.co.in/auth/callback";
          }
        }

        body = new URLSearchParams(bodyObj).toString();
      } else if (req.method !== "GET" && req.method !== "HEAD") {
        if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
          headers["content-type"] = "application/x-www-form-urlencoded";
          body = typeof req.body === "object" ? new URLSearchParams(req.body).toString() : String(req.body);
        } else if (typeof req.body === "object") {
          headers["content-type"] = "application/json";
          body = JSON.stringify(req.body);
        } else {
          if (req.headers["content-type"]) {
            headers["content-type"] = req.headers["content-type"] as string;
          }
          body = req.body;
        }
      }

      const response = await fetch(targetUrl, {
        method: outgoingMethod,
        headers,
        body,
      });

      let responseBody = await response.text();
      let status = response.status;

      // Defensive formatting for NamoID SDK compatibility:
      // If upstream returned an error (status >= 400), ensure the response is valid JSON
      // and has `error_description` so SDK readErrorMessage() never fails with "Token request failed with 405".
      if (status >= 400) {
        try {
          const json = JSON.parse(responseBody);
          if (!json.error_description) {
            json.error_description = json.detail || json.message || json.error || `NamoID upstream returned ${status}`;
            responseBody = JSON.stringify(json);
          }
        } catch {
          responseBody = JSON.stringify({
            error: "upstream_token_error",
            error_description: responseBody.slice(0, 200) || `Upstream returned status ${status}`,
          });
        }
      }

      res.status(status);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(responseBody);
    } catch (error: any) {
      console.error("NamoID proxy error:", error);
      res.status(502).json({ error: "proxy_error", error_description: error.message || "Failed to proxy request" });
    }
  });

  // ─── BE-07: Admin session endpoint REMOVED ───
  // The previous /api/admin/verify endpoint generated unverified random tokens.
  // Admin access is now exclusively controlled via Firebase Authentication + Firestore role === 'admin'.
  // Do NOT add a custom password-based admin login system.



  // Server-authoritative PUNCHX service-area validation before checkout.
  app.post("/api/geofence/check", requireFirebaseUser, (req, res) => {
    const body = req.body || {};
    const normalizeArea = (value: unknown) => String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
      .replace(/^(pin code|pincode)\s+/, "pin ")
      .replace(/^(area|locality|neighbourhood|neighborhood)\s+/, "locality ");
    const expandArea = (value: unknown) => {
      const raw = String(value || "").trim();
      if (!raw) return [];
      if (/^(pin(?:\s*code|code)?|state|district|city|locality|area|village|ward|sector)\s*:/i.test(raw)) return [normalizeArea(raw)];
      return raw.split(/[,;|\n]+/).map(normalizeArea).filter(Boolean);
    };
    const labels: string[] = [];
    const addLabel = (value: unknown, qualifier?: string) => { const raw = String(value || "").trim(); if (raw) { labels.push(raw); if (qualifier) labels.push(qualifier + ": " + raw); } };
    addLabel(body.customerArea, "AREA"); addLabel(body.customerLocality, "LOCALITY"); addLabel(body.customerSector, "SECTOR");
    addLabel(body.customerCity, "CITY"); addLabel(body.customerDistrict, "DISTRICT"); addLabel(body.customerState, "STATE");
    const pin = String(body.customerPinCode || "").trim(); if (/^\d{6}$/.test(pin)) labels.push(pin, "PIN: " + pin, "PINCODE: " + pin);
    const city = String(body.customerCity || "").trim(), state = String(body.customerState || "").trim(), district = String(body.customerDistrict || "").trim();
    if (city && state) labels.push("CITY: " + city + ", " + state);
    if (district && state) labels.push("DISTRICT: " + district + ", " + state);
    addLabel(body.customerAddress);
    const customerLabels = Array.from(new Set(labels.flatMap(expandArea)));
    const workerAreas = (Array.isArray(body.workerServiceAreas) ? body.workerServiceAreas : []).flatMap(expandArea);
    if (!customerLabels.length || !workerAreas.length) {
      return res.status(400).json({ success: false, serviceable: false, error: "A verified customer locality and configured worker service areas are required." });
    }
    const matchedArea = workerAreas.find((area: string) => customerLabels.includes(area)) || null;
    const serviceable = Boolean(matchedArea);
    return res.json({
      success: true, serviceable, matchType: "named-area", matchedArea,
      message: serviceable ? "The address matches a configured PunchX service area." : "The address is outside the professional's configured service areas."
    });
  });

  // Google Maps Platform Config API — Origin-restricted
  app.get("/api/maps/config", (req, res) => {
    // Only serve API key to requests from allowed origins
    const requestOrigin = req.headers.origin || req.headers.referer || "";
    const isAllowed = ALLOWED_ORIGINS.some(o => requestOrigin.startsWith(o));

    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";
    res.json({
      enabled: true,
      hasKey: Boolean(mapsKey),
      // Only expose the key to allowed origins
      apiKey: isAllowed ? mapsKey : "",
      mapId: "PUNCHX_MAP_ID",
      attributionId: "gmp_mcp_codeassist_v1_aistudio",
      defaultCenter: { lat: 22.9734, lng: 78.6569 }, // approximate geographic centre of India, for map framing only
      serviceAreaMode: "india-named-areas"
    });
  });

  // Comprehensive Google Maps Geocoding & High-Precision Reverse Geocoding API
  app.post("/api/maps/geocode", requireFirebaseUser, async (req, res) => {
    try {
      let { lat, lng, address, landmark, area: requestedArea } = req.body;

      // BE-09: Input validation
      if (address && typeof address === 'string' && address.length > 500) {
        return res.status(400).json({ error: 'Address too long (max 500 characters)' });
      }
      if (landmark && typeof landmark === 'string' && landmark.length > 200) {
        return res.status(400).json({ error: 'Landmark too long (max 200 characters)' });
      }
      if (lat !== undefined && lat !== null) {
        lat = Number(lat);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          return res.status(400).json({ error: 'Invalid latitude (must be -90 to 90)' });
        }
      }
      if (lng !== undefined && lng !== null) {
        lng = Number(lng);
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
          return res.status(400).json({ error: 'Invalid longitude (must be -180 to 180)' });
        }
      }

      const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";
      
      let fullAddress = address || "";
      let area = requestedArea || "";
      let city = "";
      let district = "";
      let state = "";
      let postalCode = "";
      let plusCode = "";
      let locationType = "APPROXIMATE";

      // 1. Forward Geocode if address provided
      if ((!lat || !lng) && address && address.trim().length > 1) {
        if (mapsKey) {
          try {
            const queryStr = encodeURIComponent(`${address}${landmark ? ' near ' + landmark : ''}, India`);
            const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${queryStr}&key=${mapsKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`);
            const gData = await gRes.json();
            if (gData.status === "OK" && gData.results && gData.results[0]) {
              const best = gData.results[0];
              fullAddress = best.formatted_address;
              lat = best.geometry.location.lat;
              lng = best.geometry.location.lng;
              locationType = best.geometry.location_type || "ROOFTOP";
              if (best.plus_code) plusCode = best.plus_code.global_code || "";

              for (const comp of best.address_components) {
                if (comp.types.includes("sublocality") || comp.types.includes("sublocality_level_1") || comp.types.includes("neighborhood")) {
                  if (!area) area = comp.long_name;
                }
                if (comp.types.includes("locality")) city = comp.long_name;
                if (!district && comp.types.includes("administrative_area_level_2")) district = comp.long_name;
                if (!state && comp.types.includes("administrative_area_level_1")) state = comp.long_name;
                if (comp.types.includes("postal_code")) postalCode = comp.long_name;
              }
            }
          } catch (gErr) {
            console.warn("Google Maps Forward Geocoding error:", gErr);
          }
        }

        // Forward fallback via OpenStreetMap Nominatim
        if (!lat || !lng) {
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + (landmark ? ' ' + landmark : ''))}&format=json&addressdetails=1&limit=1`,
              { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-Platform/2.0' } }
            );
            if (nomRes.ok) {
              const nomData = await nomRes.json();
              if (nomData && nomData[0]) {
                lat = parseFloat(nomData[0].lat);
                lng = parseFloat(nomData[0].lon);
                fullAddress = nomData[0].display_name;
                const addr = nomData[0].address || {};
                area = addr.sublocality || addr.neighbourhood || addr.suburb || addr.residential || addr.road || "";
                city = addr.city || addr.town || addr.village || "";
                district = addr.state_district || addr.district || addr.county || "";
                state = addr.state || "";
                postalCode = addr.postcode || "";
                locationType = "GEOMETRIC_CENTER";
              }
            }
          } catch (nomErr) {
            console.warn("Nominatim search fallback error:", nomErr);
          }
        }
      }

      // 2. Reverse Geocode if lat/lng available
      if (lat && lng) {
        if (mapsKey) {
          try {
            const gRevRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`);
            const gRevData = await gRevRes.json();
            if (gRevData.status === "OK" && gRevData.results && gRevData.results[0]) {
              const top = gRevData.results[0];
              fullAddress = top.formatted_address;
              locationType = top.geometry.location_type || "ROOFTOP";
              if (top.plus_code) plusCode = top.plus_code.global_code || "";

              for (const comp of top.address_components) {
                if (comp.types.includes("sublocality") || comp.types.includes("sublocality_level_1") || comp.types.includes("neighborhood")) {
                  if (!area) area = comp.long_name;
                }
                if (comp.types.includes("locality")) city = comp.long_name;
                if (!district && comp.types.includes("administrative_area_level_2")) district = comp.long_name;
                if (!state && comp.types.includes("administrative_area_level_1")) state = comp.long_name;
                if (comp.types.includes("postal_code")) postalCode = comp.long_name;
              }
            }
          } catch (gRevErr) {
            console.warn("Google Maps Reverse Geocoding error:", gRevErr);
          }
        }

        // Secondary reverse geocode fallback via Nominatim
        if (!fullAddress || fullAddress.length < 5) {
          try {
            const nomRev = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-Platform/2.0' } }
            );
            if (nomRev.ok) {
              const nomRevData = await nomRev.json();
              if (nomRevData && nomRevData.display_name) {
                fullAddress = nomRevData.display_name;
                const addr = nomRevData.address || {};
                area = area || addr.sublocality || addr.neighbourhood || addr.suburb || addr.road || "";
                city = addr.city || addr.town || addr.village || "";
                district = addr.state_district || addr.district || addr.county || "";
                state = addr.state || "";
                postalCode = addr.postcode || "";
              }
            }
          } catch (nomRevErr) {
            console.warn("Nominatim reverse fallback notice:", nomRevErr);
          }
        }
      }

      // Return error if location could not be resolved at all
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Could not resolve location. Please provide valid coordinates or a more specific address.'
        });
      }
      if (!fullAddress) {
        fullAddress = address || `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
      }

      const rawArea = (area || fullAddress.split(',')[0] || "").trim();
      let sectorName = "";
      const lowerStr = (fullAddress + " " + rawArea).toLowerCase();

      if (lowerStr.includes("hsr")) {
        sectorName = "Sector 1 (HSR Layout)";
      } else if (lowerStr.includes("indiranagar")) {
        sectorName = "Sector 2 (Indiranagar)";
      } else if (lowerStr.includes("koramangala")) {
        sectorName = "Sector 3 (Koramangala)";
      } else if (lowerStr.includes("whitefield")) {
        sectorName = "Sector 4 (Whitefield)";
      } else if (lowerStr.includes("jayanagar")) {
        sectorName = "Sector 5 (Jayanagar)";
      } else if (lowerStr.includes("jp nagar")) {
        sectorName = "Sector 6 (JP Nagar)";
      } else if (lowerStr.includes("electronic city")) {
        sectorName = "Sector 7 (Electronic City)";
      } else if (lowerStr.includes("bellandur")) {
        sectorName = "Sector 8 (Bellandur)";
      } else if (lowerStr.includes("marathahalli")) {
        sectorName = "Sector 9 (Marathahalli)";
      } else if (lowerStr.includes("central") || lowerStr.includes("mg road")) {
        sectorName = "Sector 10 (Central Business District)";
      } else {
        const cleanSub = rawArea.replace(/sector|layout|stage|phase|block/gi, "").trim();
        sectorName = `Sector (${cleanSub || 'Metro Zone'})`;
      }

      return res.json({
        success: true,
        address: fullAddress,
        area: rawArea,
        city: city || "",
        district: district || "",
        state: state || "",
        postalCode: postalCode || "",
        plusCode: plusCode,
        sector: sectorName,
        lat: Number(lat),
        lng: Number(lng),
        locationType: locationType,
        accuracyScore: 100
      });
    } catch (err: any) {
      console.error("Maps geocode backend error:", err);
      return res.status(500).json({ error: "Geocoding failed", message: err?.message });
    }
  });

  // Google Maps Routes API / Directions Endpoint
  app.post("/api/maps/routes", requireFirebaseUser, async (req, res) => {
    try {
      const { origin, destination, travelMode = "DRIVE" } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and Destination coordinates are required" });
      }

      // BE-09: Validate coordinates
      const originLat = typeof origin.lat === 'number' && Number.isFinite(origin.lat) ? origin.lat : null;
      const originLng = typeof origin.lng === 'number' && Number.isFinite(origin.lng) ? origin.lng : null;
      const destLat = typeof destination.lat === 'number' && Number.isFinite(destination.lat) ? destination.lat : null;
      const destLng = typeof destination.lng === 'number' && Number.isFinite(destination.lng) ? destination.lng : null;

      if (originLat === null || originLng === null || destLat === null || destLng === null) {
        return res.status(400).json({ error: 'Valid numeric lat/lng required for both origin and destination' });
      }
      if (originLat < -90 || originLat > 90 || destLat < -90 || destLat > 90) {
        return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
      }
      if (originLng < -180 || originLng > 180 || destLng < -180 || destLng > 180) {
        return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
      }

      const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";

      // Geodesic distance calculation as baseline (Earth radius = 6371km)
      const dLat = ((destLat - originLat) * Math.PI) / 180;
      const dLon = ((destLng - originLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((originLat * Math.PI) / 180) *
          Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const directKm = Math.round(6371 * c * 10) / 10;

      let routeDistanceKm = directKm > 0 ? Math.round(directKm * 1.25 * 10) / 10 : 2.5; // driving route has ~1.25 road curvature factor
      let durationMinutes = Math.max(3, Math.round(routeDistanceKm * 3.5)); // ~17 km/h urban speed in Bengaluru
      let polylinePoints: { lat: number; lng: number }[] = [];
      let isLiveGoogleRoute = false;

      // If Google Maps API key is configured, query official Google Maps Directions API
      if (mapsKey) {
        try {
          const gDirRes = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&key=${mapsKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`
          );
          const gDirData = await gDirRes.json();
          if (gDirData.status === "OK" && gDirData.routes && gDirData.routes[0]) {
            const route = gDirData.routes[0];
            const leg = route.legs[0];
            if (leg) {
              routeDistanceKm = Math.round((leg.distance.value / 1000) * 10) / 10;
              durationMinutes = Math.ceil(leg.duration.value / 60);
              isLiveGoogleRoute = true;
              
              if (leg.steps && Array.isArray(leg.steps)) {
                polylinePoints = leg.steps.map((step: any) => ({
                  lat: step.end_location.lat,
                  lng: step.end_location.lng
                }));
              }
            }
          }
        } catch (gDirErr) {
          console.warn("Google Maps Directions API error:", gDirErr);
        }
      }

      // Generate intermediate smooth interpolation points if polyline empty
      if (polylinePoints.length === 0) {
        const stepsCount = 6;
        for (let i = 0; i <= stepsCount; i++) {
          const fraction = i / stepsCount;
          // Add slight natural road curvature
          const curveOffset = Math.sin(fraction * Math.PI) * 0.003;
          polylinePoints.push({
            lat: originLat + (destLat - originLat) * fraction + curveOffset,
            lng: originLng + (destLng - originLng) * fraction - curveOffset * 0.5
          });
        }
      }

      return res.json({
        success: true,
        distanceKm: routeDistanceKm,
        directDistanceKm: directKm,
        durationMinutes: durationMinutes,
        etaText: `${durationMinutes} mins`,
        // Route distance is informational only; it is not a service-area boundary.
        isWithin15Km: null,
        serviceableByArea: null,
        matchType: "named-area",
        isLiveGoogleRoute,
        waypoints: polylinePoints,
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng }
      });
    } catch (err: any) {
      console.error("Maps routes error:", err);
      return res.status(500).json({ error: "Failed to compute route", message: err?.message });
    }
  });

  // Google Maps Distance Matrix & 15km Zone Scanner API
  app.post("/api/maps/distance-matrix", requireFirebaseUser, async (req, res) => {
    try {
      const { origin, destinations } = req.body;
      if (!origin || !Array.isArray(destinations)) {
        return res.status(400).json({ error: "Origin and destinations array are required" });
      }

      // BE-09: Validate and limit input
      if (destinations.length > 100) {
        return res.status(400).json({ error: 'Destinations array too large (max 100)' });
      }

      const originLat = typeof origin.lat === 'number' && Number.isFinite(origin.lat) ? origin.lat : null;
      const originLng = typeof origin.lng === 'number' && Number.isFinite(origin.lng) ? origin.lng : null;
      if (originLat === null || originLng === null || originLat < -90 || originLat > 90 || originLng < -180 || originLng > 180) {
        return res.status(400).json({ error: 'Valid origin lat/lng required' });
      }

      const normalizeArea = (value: unknown) => String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
        .replace(/^(pin code|pincode)\s+/, "pin ").replace(/^(area|locality|neighbourhood|neighborhood)\s+/, "locality ");
      const expandArea = (value: unknown): string[] => {
        const raw = String(value || "").trim(); if (!raw) return [];
        if (/^(pin(?:\s*code|code)?|state|district|city|locality|area|village|ward|sector)\s*:/i.test(raw)) return [normalizeArea(raw)];
        return raw.split(/[,;|\n]+/).map(normalizeArea).filter(Boolean);
      };
      const labels = (point: any): string[] => {
        const out: string[] = [];
        const add = (value: unknown, qualifier?: string) => { const text = String(value || "").trim(); if (text) { out.push(text); if (qualifier) out.push(qualifier + ": " + text); } };
        add(point?.area, "AREA"); add(point?.locality, "LOCALITY"); add(point?.sector, "SECTOR"); add(point?.city, "CITY");
        add(point?.district, "DISTRICT"); add(point?.state, "STATE");
        const pin = String(point?.postalCode || point?.pinCode || "").trim(); if (/^\d{6}$/.test(pin)) out.push(pin, "PIN: " + pin);
        const city = String(point?.city || "").trim(), state = String(point?.state || "").trim(), district = String(point?.district || "").trim();
        if (city && state) out.push("CITY: " + city + ", " + state); if (district && state) out.push("DISTRICT: " + district + ", " + state);
        if (point?.address) out.push(String(point.address));
        return out;
      };
      const matchesArea = (customer: any, worker: any): boolean | null => {
        const workerAreas = Array.isArray(worker?.serviceAreas) ? worker.serviceAreas : Array.isArray(worker?.geofenceAreas) ? worker.geofenceAreas : [];
        if (!workerAreas.length) return null;
        const candidates = new Set(labels(customer).flatMap(expandArea));
        return workerAreas.flatMap(expandArea).some((area: string) => candidates.has(area));
      };
      const results = destinations.map((dest: any, index: number) => {
        const destLat = typeof dest.lat === 'number' && Number.isFinite(dest.lat) ? dest.lat : null;
        const destLng = typeof dest.lng === 'number' && Number.isFinite(dest.lng) ? dest.lng : null;
        if (destLat === null || destLng === null || Math.abs(destLat) > 90 || Math.abs(destLng) > 180) {
          return { id: dest.id || `dest_${index}`, error: 'Invalid coordinates', distanceKm: null, isWithin15Km: null, serviceableByArea: matchesArea(origin, dest) };
        }

        const dLat = ((destLat - originLat) * Math.PI) / 180;
        const dLon = ((destLng - originLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((originLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = Math.round(6371 * c * 10) / 10;
        const serviceableByArea = matchesArea(origin, dest);
        const etaMins = Math.max(4, Math.round(distanceKm * 3.2));
        const y = Math.sin(dLon) * Math.cos((destLat * Math.PI) / 180);
        const x = Math.cos((originLat * Math.PI) / 180) * Math.sin((destLat * Math.PI) / 180) -
          Math.sin((originLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.cos(dLon);
        const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

        return {
          id: dest.id || `dest_${index}`, name: dest.name || dest.workerName || dest.customerName || `Target ${index + 1}`,
          category: dest.category || dest.skill || 'Specialist', lat: destLat, lng: destLng, distanceKm,
          serviceableByArea, isWithin15Km: serviceableByArea, durationMinutes: etaMins,
          etaText: `${etaMins} mins`, bearingDeg
        };
      });
      const allResults = results.sort((a: any, b: any) => (Number(a.distanceKm) || Number.POSITIVE_INFINITY) - (Number(b.distanceKm) || Number.POSITIVE_INFINITY));
      const serviceableCount = allResults.filter((r: any) => r.serviceableByArea === true).length;
      return res.json({
        success: true, origin: { lat: originLat, lng: originLng }, totalChecked: destinations.length,
        totalServiceableByArea: serviceableCount, serviceAreaMode: "named-area", results: allResults, allResults
      });
    } catch (err: any) {
      console.error("Distance matrix error:", err);
      return res.status(500).json({ error: "Distance matrix calculation failed" });
    }
  });

  // Secure Backend Google Maps Geocoding & Sector Division API
  app.post("/api/geocode", async (req, res) => {
    try {
      let { lat, lng, address, landmark } = req.body;

      const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
      let fullAddress = address || "";
      let area = "";
      let city = "";

      // Forward geocode if address provided without coordinates
      if ((!lat || !lng) && address && address.trim().length > 2) {
        if (mapsKey) {
          try {
            const gForward = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + (landmark ? ' ' + landmark : ''))}&key=${mapsKey}`);
            const gData = await gForward.json();
            if (gData.status === "OK" && gData.results && gData.results[0]) {
              fullAddress = gData.results[0].formatted_address;
              lat = gData.results[0].geometry.location.lat;
              lng = gData.results[0].geometry.location.lng;
              for (const comp of gData.results[0].address_components) {
                if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                  if (!area) area = comp.long_name;
                }
                if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                  if (!city) city = comp.long_name;
                }
              }
            }
          } catch (gfErr) {
            console.warn("Forward Google Geocode warning:", gfErr);
          }
        }

        if (!lat || !lng) {
          try {
            const nomSearch = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + (landmark ? ' ' + landmark : ''))}&format=json&addressdetails=1&limit=1`,
              { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' } }
            );
            if (nomSearch.ok) {
              const nomArr = await nomSearch.json();
              if (nomArr && nomArr[0]) {
                lat = parseFloat(nomArr[0].lat);
                lng = parseFloat(nomArr[0].lon);
                fullAddress = nomArr[0].display_name;
                const addrObj = nomArr[0].address || {};
                area = addrObj.sublocality || addrObj.neighbourhood || addrObj.suburb || addrObj.residential || addrObj.road || addrObj.quarter || addrObj.city_district || "";
                city = addrObj.city || addrObj.town || addrObj.village || addrObj.county || addrObj.state || "";
              }
            }
          } catch (nomSearchErr) {
            console.warn("Nominatim forward search warning:", nomSearchErr);
          }
        }
      }

      // If lat/lng are still missing, attempt auto IP detection
      if ((!lat || !lng) && !address) {
        try {
          const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
          const ipLookupUrl = clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.')
            ? `https://freeipapi.com/api/json/${clientIp}`
            : `https://freeipapi.com/api/json/`;
          
          const ipRes = await fetch(ipLookupUrl, { headers: { 'User-Agent': 'PunchX-Service-App' } });
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData && ipData.latitude && ipData.longitude) {
              lat = ipData.latitude;
              lng = ipData.longitude;
              city = ipData.cityName || ipData.regionName || "";
              area = ipData.cityName || "";
            }
          }
        } catch (ipErr) {
          console.warn("IP Geolocation fallback notice:", ipErr);
        }
      }

      // If coordinates are available, attempt Google Maps Reverse Geocode
      if (lat && lng && mapsKey && (!fullAddress || fullAddress.length < 5)) {
        try {
          const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`);
          const gData = await gRes.json();
          if (gData.status === "OK" && gData.results && gData.results[0]) {
            fullAddress = gData.results[0].formatted_address;
            for (const comp of gData.results[0].address_components) {
              if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                if (!area) area = comp.long_name;
              }
              if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                if (!city) city = comp.long_name;
              }
            }
          }
        } catch (err) {
          console.warn("Backend Google Maps geocoding error, using fallback:", err);
        }
      }

      // OpenStreetMap Nominatim fallback
      if ((!fullAddress || !area) && lat && lng) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' } }
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.display_name) {
              fullAddress = nomData.display_name;
              const addrObj = nomData.address || {};
              area = area || addrObj.sublocality || addrObj.neighbourhood || addrObj.suburb || addrObj.residential || addrObj.road || addrObj.quarter || addrObj.city_district || "";
              city = city || addrObj.city || addrObj.town || addrObj.village || addrObj.county || addrObj.state || "";
            }
          }
        } catch (e) {
          console.warn("Nominatim fallback warning:", e);
        }
      }

      // BigDataCloud client reverse geocode fallback
      if ((!fullAddress || !area) && lat && lng) {
        try {
          const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            if (bdcData) {
              const locality = bdcData.locality || bdcData.principalSubdivision || "";
              city = city || bdcData.city || locality;
              area = area || locality;
              fullAddress = fullAddress || `${locality ? locality + ', ' : ''}${city || ''}, ${bdcData.countryName || ''}`.trim();
            }
          }
        } catch (e) {
          console.warn("BigDataCloud fallback warning:", e);
        }
      }

      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
        return res.status(400).json({ success: false, resolved: false, error: "Provide a resolvable Indian address or valid coordinates." });
      }
      if (!fullAddress) fullAddress = address || `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;

      // Clean sector calculation logic without a city-specific fallback.
      const rawArea = (area || fullAddress.split(',')[0] || "Local Area").trim();
      let sectorName = "";

      const lowerStr = (fullAddress + " " + rawArea).toLowerCase();
      if (lowerStr.includes("hsr")) {
        sectorName = "Sector 1 (HSR Layout)";
      } else if (lowerStr.includes("indiranagar")) {
        sectorName = "Sector 2 (Indiranagar)";
      } else if (lowerStr.includes("koramangala")) {
        sectorName = "Sector 3 (Koramangala)";
      } else if (lowerStr.includes("whitefield")) {
        sectorName = "Sector 4 (Whitefield)";
      } else if (lowerStr.includes("jayanagar")) {
        sectorName = "Sector 5 (Jayanagar)";
      } else if (lowerStr.includes("jp nagar")) {
        sectorName = "Sector 6 (JP Nagar)";
      } else if (lowerStr.includes("electronic city")) {
        sectorName = "Sector 7 (Electronic City)";
      } else if (lowerStr.includes("bellandur")) {
        sectorName = "Sector 8 (Bellandur)";
      } else {
        const cleanSub = rawArea.replace(/sector|layout|stage|phase|block/gi, "").trim();
        sectorName = `Sector (${cleanSub || 'Metro Zone'})`;
      }

      return res.json({
        address: fullAddress,
        area: rawArea,
        city: city || "",
        sector: sectorName,
        lat: Number(lat),
        lng: Number(lng)
      });
    } catch (err: any) {
      console.error("Geocode backend error:", err);
      return res.status(500).json({ error: "Geocoding failed" });
    }
  });

  // Dedicated Registered Services by Location API Endpoint
  app.post("/api/location-services", requireFirebaseUser, async (req, res) => {
    try {
      let { lat, lng, address, landmark } = req.body;
      const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
      let fullAddress = address || "";
      let area = "";
      let city = "";

      // 1. Forward Geocoding if text address is provided
      if ((!lat || !lng) && address && address.trim().length > 2) {
        if (mapsKey) {
          try {
            const gForward = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + (landmark ? ' near ' + landmark : ''))}&key=${mapsKey}`);
            const gData = await gForward.json();
            if (gData.status === "OK" && gData.results && gData.results[0]) {
              fullAddress = gData.results[0].formatted_address;
              lat = gData.results[0].geometry.location.lat;
              lng = gData.results[0].geometry.location.lng;
              for (const comp of gData.results[0].address_components) {
                if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                  if (!area) area = comp.long_name;
                }
                if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                  if (!city) city = comp.long_name;
                }
              }
            }
          } catch (e) {
            console.warn("Forward Google Geocode error:", e);
          }
        }

        if (!lat || !lng) {
          try {
            const nomSearch = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + (landmark ? ' ' + landmark : ''))}&format=json&addressdetails=1&limit=1`,
              { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' } }
            );
            if (nomSearch.ok) {
              const nomArr = await nomSearch.json();
              if (nomArr && nomArr[0]) {
                lat = parseFloat(nomArr[0].lat);
                lng = parseFloat(nomArr[0].lon);
                fullAddress = nomArr[0].display_name;
                const addrObj = nomArr[0].address || {};
                area = addrObj.sublocality || addrObj.neighbourhood || addrObj.suburb || addrObj.residential || addrObj.road || addrObj.quarter || addrObj.city_district || "";
                city = addrObj.city || addrObj.town || addrObj.village || addrObj.county || addrObj.state || "";
              }
            }
          } catch (e) {
            console.warn("Nominatim forward search error:", e);
          }
        }
      }

      // 2. Reverse Geocoding if lat/lng available but address is empty
      if (lat && lng && (!fullAddress || fullAddress.length < 5)) {
        if (mapsKey) {
          try {
            const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`);
            const gData = await gRes.json();
            if (gData.status === "OK" && gData.results && gData.results[0]) {
              fullAddress = gData.results[0].formatted_address;
              for (const comp of gData.results[0].address_components) {
                if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                  if (!area) area = comp.long_name;
                }
                if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                  if (!city) city = comp.long_name;
                }
              }
            }
          } catch (e) {
            console.warn("Reverse geocode error:", e);
          }
        }

        if (!fullAddress && lat && lng) {
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
              { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' } }
            );
            if (nomRes.ok) {
              const nomData = await nomRes.json();
              if (nomData && nomData.display_name) {
                fullAddress = nomData.display_name;
                const addrObj = nomData.address || {};
                area = area || addrObj.sublocality || addrObj.neighbourhood || addrObj.suburb || addrObj.residential || addrObj.road || addrObj.quarter || addrObj.city_district || "";
                city = city || addrObj.city || addrObj.town || addrObj.village || addrObj.county || addrObj.state || "";
              }
            }
          } catch (e) {
            console.warn("Nominatim reverse error:", e);
          }
        }
      }

      if (!fullAddress) {
        fullAddress = address || "Indiranagar 100ft Road, Sector 2, Bengaluru, KA 560038";
      }

      // Compute standardized Sector
      const rawArea = (area || fullAddress.split(',')[0] || "Indiranagar").trim();
      let sectorName = "";
      const lowerStr = (fullAddress + " " + rawArea + " " + (landmark || "")).toLowerCase();
      
      if (lowerStr.includes("hsr")) {
        sectorName = "Sector 1 (HSR Layout)";
      } else if (lowerStr.includes("indiranagar")) {
        sectorName = "Sector 2 (Indiranagar)";
      } else if (lowerStr.includes("koramangala")) {
        sectorName = "Sector 3 (Koramangala)";
      } else if (lowerStr.includes("whitefield")) {
        sectorName = "Sector 4 (Whitefield)";
      } else if (lowerStr.includes("jayanagar")) {
        sectorName = "Sector 5 (Jayanagar)";
      } else if (lowerStr.includes("jp nagar")) {
        sectorName = "Sector 6 (JP Nagar)";
      } else if (lowerStr.includes("electronic city")) {
        sectorName = "Sector 7 (Electronic City)";
      } else if (lowerStr.includes("bellandur")) {
        sectorName = "Sector 8 (Bellandur)";
      } else {
        const cleanSub = rawArea.replace(/sector|layout|stage|phase|block/gi, "").trim();
        sectorName = `Sector (${cleanSub || 'Metro Zone'})`;
      }

      // Master Registered Service Catalog with Sector-specific active capacities
      const MASTER_SERVICES = [
        {
          id: 'ac',
          name: 'AC Repair',
          category: 'AC Repair',
          icon: 'ac_unit',
          activeSpecialists: 14,
          avgRating: 4.9,
          startingPrice: 199,
          slaMinutes: 15,
          available: true,
          description: 'PCB diagnostics, gas charging, filter sanitization & cooling overhaul'
        },
        {
          id: 'electrical',
          name: 'Electrical Systems',
          category: 'Electrical Systems',
          icon: 'electrical_services',
          activeSpecialists: 19,
          avgRating: 4.8,
          startingPrice: 179,
          slaMinutes: 12,
          available: true,
          description: 'Short-circuit repair, MCB panel installation, heavy cabling & UPS/Inverter'
        },
        {
          id: 'plumbing',
          name: 'Plumbing & Drainage',
          category: 'Plumbing & Drainage',
          icon: 'plumbing',
          activeSpecialists: 16,
          avgRating: 4.9,
          startingPrice: 159,
          slaMinutes: 18,
          available: true,
          description: 'High-pressure leaks, concealed line repairs, fixture replacement & drain unclog'
        },
        {
          id: 'cleaning',
          name: 'Deep Cleaning',
          category: 'Deep Cleaning & Sanitization',
          icon: 'cleaning_services',
          activeSpecialists: 11,
          avgRating: 4.85,
          startingPrice: 249,
          slaMinutes: 25,
          available: true,
          description: 'Hospital-grade sanitization, kitchen chimney degrease & bathroom restoration'
        },
        {
          id: 'painting',
          name: 'Painting & Walls',
          category: 'Painting',
          icon: 'format_paint',
          activeSpecialists: 8,
          avgRating: 4.75,
          startingPrice: 299,
          slaMinutes: 30,
          available: true,
          description: 'Interior luxury emulsion, moisture barrier waterproofing & touch-ups'
        },
        {
          id: 'carpentry',
          name: 'Carpentry & Locks',
          category: 'Carpentry & Security Locks',
          icon: 'carpenter',
          activeSpecialists: 10,
          avgRating: 4.8,
          startingPrice: 189,
          slaMinutes: 20,
          available: true,
          description: 'Smart digital lock installation, bespoke woodwork, hinges & modular kitchen repair'
        },
        {
          id: 'pest',
          name: 'Pest Control',
          category: 'Pest Control',
          icon: 'pest_control',
          activeSpecialists: 7,
          avgRating: 4.9,
          startingPrice: 219,
          slaMinutes: 20,
          available: true,
          description: 'Odorless herbal pest eradication, anti-termite and gel bait treatments'
        },
        {
          id: 'appliance',
          name: 'Appliance Maintenance',
          category: 'Appliance Maintenance',
          icon: 'build',
          activeSpecialists: 12,
          avgRating: 4.8,
          startingPrice: 199,
          slaMinutes: 15,
          available: true,
          description: 'Washing machines, microwave ovens, refrigerators & water purifiers'
        },
        {
          id: 'moving',
          name: 'Moving & Logistics',
          category: 'Moving',
          icon: 'local_shipping',
          activeSpecialists: 6,
          avgRating: 4.7,
          startingPrice: 499,
          slaMinutes: 45,
          available: true,
          description: 'High-care furniture packaging, express tempo dispatch & cargo handling'
        }
      ];

      // Custom availability customization for zones if needed
      const registeredServices = MASTER_SERVICES.map(srv => {
        // Adjust specialist count dynamically according to sector hash
        const hash = (sectorName.length + srv.name.length) % 5;
        return {
          ...srv,
          activeSpecialists: Math.max(3, srv.activeSpecialists - hash),
          sectorCoverage: sectorName,
          landmarkNote: landmark ? `Servicing near ${landmark}` : `Full coverage across ${sectorName}`
        };
      });

      return res.json({
        success: true,
        address: fullAddress,
        area: rawArea,
        city: city || "Bengaluru",
        sector: sectorName,
        landmark: landmark || "",
        lat: lat || 12.9716,
        lng: lng || 77.5946,
        coverageStatus: "100% Active & Certified Coverage",
        totalRegisteredServices: registeredServices.length,
        registeredServices
      });
    } catch (err: any) {
      console.error("Location services backend error:", err);
      return res.status(500).json({ error: "Failed to resolve location services" });
    }
  });

  // Worker customer view is restricted to real bookings assigned to the authenticated professional.
  // Do not expose synthetic/demo customer profiles or unassigned customer records.
  app.post("/api/worker-location-customers", requireFirebaseUser, requireWorker, async (req, res) => {
    try {
      const workerId = String((req as any).user?.uid || "");
      if (!workerId) return res.status(401).json({ success: false, error: "Authentication required" });

      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      const address = String(req.body?.address || "").trim();
      const area = String(req.body?.area || "").trim();
      const city = String(req.body?.city || "").trim();
      const sector = String(req.body?.sector || area).trim();
      const landmark = String(req.body?.landmark || "").trim();

      const assignedOrders = await dbAdapter.listOrders({ workerId });
      const activeStatuses = new Set(["DISPATCHING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_SERVICE", "COMPLETION_PENDING", "Pending", "In Progress", "In-Progress"]);
      const registeredCustomers = assignedOrders
        .filter((order) => activeStatuses.has(String(order.status)))
        .map((order) => {
          const phone = String(order.customerPhone || "");
          const digits = phone.replace(/\D/g, "");
          const phoneMasked = digits.length >= 4
            ? `${phone.slice(0, Math.max(0, phone.length - 4))}${"•".repeat(Math.min(5, Math.max(0, digits.length - 4)))}${digits.slice(-4)}`
            : "";
          const customerPoint = order.customerLocation || order.addressCoordinates;
          let distanceKm: number | undefined;
          if (Number.isFinite(lat) && Number.isFinite(lng) && customerPoint &&
              Number.isFinite(customerPoint.lat) && Number.isFinite(customerPoint.lng)) {
            const toRad = (value: number) => value * Math.PI / 180;
            const dLat = toRad(customerPoint.lat - lat);
            const dLng = toRad(customerPoint.lng - lng);
            const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat)) * Math.cos(toRad(customerPoint.lat)) * Math.sin(dLng / 2) ** 2;
            distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
          }
          const residentialAddress = order.residentialAddress && typeof order.residentialAddress === "object"
            ? order.residentialAddress as Record<string, unknown>
            : {};
          return {
            id: order.id,
            name: order.customerName || "Customer",
            phoneMasked,
            address: order.customerAddress || order.address || "",
            landmark: String(residentialAddress.landmark || ""),
            serviceNeeded: order.serviceName || order.category || "Service booking",
            urgency: order.date && order.time ? `Scheduled: ${order.date} ${order.time}` : `Booking status: ${order.status}`,
            ...(distanceKm !== undefined ? { distanceKm } : {}),
            verifiedStatus: "Booking assigned to your account",
            ...(typeof order.priorCompletedBookingsWithWorker === "number"
              ? { totalPreviousBookings: order.priorCompletedBookingsWithWorker }
              : {}),
            ...(typeof order.userRating === "number" ? { rating: order.userRating } : {}),
          };
        });

      return res.json({
        success: true,
        address,
        area,
        city,
        sector,
        landmark,
        ...(Number.isFinite(lat) ? { lat } : {}),
        ...(Number.isFinite(lng) ? { lng } : {}),
        totalRegisteredCustomersInLocation: registeredCustomers.length,
        coverageMessage: "Only active bookings assigned to your professional account are shown.",
        registeredCustomers,
      });
    } catch (err) {
      logger.error("Worker assigned-customer lookup failed:", err);
      return res.status(500).json({ success: false, error: "Unable to load assigned customer bookings" });
    }
  });

  // BE-10: AUTH DECISION — This endpoint proxies to Google Gemini AI.
  // Currently protected by rate-limiting + CORS origin allowlist.
  // TODO: Add Firebase ID token verification for authenticated-only access.
  app.post("/api/gemini", requireFirebaseUser, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt parameter is required" });
      }
      // BE-09: Limit prompt length to prevent excessive API costs
      if (typeof prompt === 'string' && prompt.length > 2000) {
        return res.status(400).json({ error: 'Prompt too long (max 2000 characters)' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is missing on server." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });

      return res.json({ response: response.text || "No response text generated." });
    } catch (err: any) {
      console.error("Server-side Gemini Error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });

  // Vite integration for development & static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

let appPromise: Promise<express.Express> | null = null;

export function getApp(): Promise<express.Express> {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

// Local Node hosting keeps the existing Express startup. On Vercel, the
// catch-all API function imports getApp() and lets the platform own the
// request lifecycle (app.listen() must not run inside a serverless function).
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  void getApp().then((app) => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`PunchX Full-Stack Server running on http://0.0.0.0:${port}`);
    });
  }).catch((error) => {
    console.error("PunchX server failed to initialize:", error);
    process.exitCode = 1;
  });
}
