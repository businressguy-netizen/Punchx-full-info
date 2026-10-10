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
import { getFirestore } from "firebase-admin/firestore";

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
    } else {
      initializeApp({
        credential: applicationDefault()
      });
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
  isEventProcessed,
  recordProcessedEvent,
} from "./src/backend/paymentService.js";
import {
  updateWorkerLocationTelemetry,
  getOrderTrackingStatus,
} from "./src/backend/trackingService.js";
import { OrderRecord, OrderStatus } from "./src/types.js";

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
  if (!user || !user.uid) {
    return res.status(401).json({ success: false, error: "Unauthorized: Authentication required" });
  }

  try {
    const userProfile = await dbAdapter.getUser(user.uid);
    // Allow worker if profile role is worker or status is APPROVED or PENDING (review bypassed for testing)
    if (userProfile && (userProfile.role === "worker" || userProfile.status === "APPROVED" || userProfile.status === "PENDING")) {
      (req as any).workerProfile = userProfile;
      return next();
    }

    // Check worker application in database
    const workerApp = await dbAdapter.getWorkerApplicationByUid(user.uid)
      || (userProfile?.phone ? await dbAdapter.getWorkerApplicationByContact({ phone: userProfile.phone }) : null);

    if (workerApp) {
      (req as any).workerApp = workerApp;
      return next();
    }

    logger.security("Unauthorized worker endpoint access attempt", { uid: user.uid, status: workerApp?.status });
    return res.status(403).json({
      success: false,
      error: "Forbidden: Verified and approved specialist authorization required"
    });
  } catch (err) {
    logger.error("Worker verification error:", err);
    return res.status(500).json({ success: false, error: "Internal worker authorization check failed" });
  }
};

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://www.punchxapp.co.in",
  "https://punchxapp.co.in",
  "http://localhost:5173",
  "http://localhost:3000",
];

async function startServer() {
  const app = express();

// PUNCHX geofence: 4 km in smaller towns, 8 km in major urban markets.
function getPunchXServiceRadiusKm(city?: string): 4 | 8 {
  const normalized = String(city || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const largeCities = ['kolkata','bengaluru','bangalore','mumbai','delhi','new delhi','hyderabad','chennai','pune','ahmedabad','jaipur','lucknow','kanpur','nagpur','indore','bhopal','patna','ranchi','bhubaneswar','cuttack','visakhapatnam','vizag','surat','vadodara','ludhiana','agra','nashik','coimbatore','kochi','thiruvananthapuram','guwahati','mysuru','mysore','noida','gurugram','gurgaon','faridabad','ghaziabad','durgapur','asansol','siliguri'];
  return largeCities.some(name => normalized === name || normalized.startsWith(name + ' ')) ? 8 : 4;
}


  const PORT = 3000;

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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  }));

  // Rate Limiting: 100 requests per 15 minutes per IP
  app.use("/api/", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, please try again later." },
  }));

  // Body size limits to prevent DoS via large payloads & capture rawBody for webhook HMAC verification
  app.use(express.json({
    limit: "1mb",
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Health check
  app.get("/api/health", async (req, res) => {
    const isDbHealthy = await dbAdapter.isHealthy();
    res.json({
      status: "ok",
      dbProvider: dbAdapter.providerName,
      dbHealthy: isDbHealthy,
      timestamp: new Date().toISOString(),
    });
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
      const uid = (req as any).user.uid;
      const profileData = req.body;
      const updated = await dbAdapter.upsertUser({ ...profileData, uid });
      return res.json({ success: true, user: updated });
    } catch (err: any) {
      logger.error("Upsert user error:", err);
      return res.status(500).json({ success: false, error: "Failed to update user profile" });
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
      const uid = (req as any).user.uid;
      const orderData = req.body;

      // 1. Authoritative Server-Side Pricing Calculation (Never trust client prices)
      const quote = calculateAuthoritativeQuote({
        serviceId: orderData.serviceId,
        category: orderData.category,
        isEmergency: Boolean(orderData.emergencySurcharge || orderData.isEmergency),
        couponCode: orderData.couponUsed || orderData.couponCode,
        customVisitingFee: orderData.visitingFee,
      });

      // 2. Initial state determination
      const isCashOnDelivery = orderData.paymentMethod === "COD" || orderData.paymentMethod === "CASH" || orderData.paymentMethod === "PAY_AFTER_SERVICE";
      const initialStatus: OrderStatus = isCashOnDelivery ? "DISPATCHING" : "PENDING_PAYMENT";

      // 3. Cryptographic Start OTP Generation for Customer Verification Gate
      const startOtpChallenge = generateSecureOtp();

      const orderId = orderData.id || `ORD-${Date.now()}`;
      const newOrder: OrderRecord = {
        ...orderData,
        id: orderId,
        customerId: uid, // Server enforces caller UID
        category: orderData.category || "General Service",
        workerName: orderData.workerName || "Matching Specialist...",
        price: quote.baseVisitingFee,
        originalPrice: quote.subtotalBeforeDiscount,
        discountApplied: quote.discountApplied,
        couponUsed: quote.couponUsed,
        visitingFee: quote.baseVisitingFee,
        customerPlatformFee: quote.customerPlatformFee,
        gstAmount: quote.gstAmount,
        totalAmountToPay: quote.totalAmountToPay,
        platformCommission: quote.platformCommission,
        commissionRate: quote.commissionRate,
        professionalPayout: quote.professionalPayout,
        date: orderData.date || new Date().toISOString().slice(0, 10),
        status: initialStatus,
        createdAt: new Date().toISOString(),
        startOtpHash: startOtpChallenge.hash,
        startOtpSalt: startOtpChallenge.salt,
        startOtpExpiresAt: startOtpChallenge.expiresAt,
        startOtpAttempts: 0,
        stateHistory: [
          {
            from: "NONE",
            to: initialStatus,
            timestamp: new Date().toISOString(),
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
      const eventId = event?.id || `${event?.event}_${event?.created_at}`;

      // Idempotency check: prevent duplicate replay of the same webhook event
      if (isEventProcessed(eventId)) {
        logger.info(`Webhook event ${eventId} already processed, acknowledging idempotently`);
        return res.json({ status: "already_processed" });
      }

      recordProcessedEvent(eventId, event?.event || "unknown");

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
          if (paidResult.success) {
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
      }

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
  app.post("/api/auth/worker-signup-otp", async (req, res) => {
    try {
      const { action = "generate", phone, email, phoneOtp, emailOtp, challengeId } = req.body;

      if (action === "generate") {
        if (!phone || !email) {
          return res.status(400).json({ success: false, error: "Phone and email are required to generate verification codes" });
        }
        const phoneChallenge = generateSecureOtp();
        const emailChallenge = generateSecureOtp();
        const newChallengeId = `CHAL-${Date.now()}`;

        // Save in memory or db
        (global as any).__workerOtpChallenges = (global as any).__workerOtpChallenges || new Map();
        (global as any).__workerOtpChallenges.set(newChallengeId, {
          phoneChallenge,
          emailChallenge,
          phone,
          email,
          createdAt: Date.now(),
        });

        // In development/test mode, provide the codes in the response so onboarding functions seamlessly
        return res.json({
          success: true,
          challengeId: newChallengeId,
          message: "Verification codes dispatched to mobile phone and email inbox",
          debugCodes: process.env.NODE_ENV !== "production" ? {
            phoneCode: phoneChallenge.code,
            emailCode: emailChallenge.code,
          } : undefined,
        });
      }

      if (action === "verify") {
        if (!challengeId || !phoneOtp || !emailOtp) {
          return res.status(400).json({ success: false, error: "Missing challengeId or OTP inputs" });
        }

        const map = (global as any).__workerOtpChallenges;
        const stored = map ? map.get(challengeId) : null;
        if (!stored) {
          return res.status(400).json({ success: false, error: "Challenge session expired or invalid" });
        }

        const phoneValid = verifyOtpChallenge(phoneOtp, stored.phoneChallenge);
        const emailValid = verifyOtpChallenge(emailOtp, stored.emailChallenge);

        if (!phoneValid.valid) {
          return res.status(400).json({ success: false, error: `Invalid mobile OTP: ${phoneValid.error}` });
        }
        if (!emailValid.valid) {
          return res.status(400).json({ success: false, error: `Invalid email OTP: ${emailValid.error}` });
        }

        map.delete(challengeId);
        return res.json({ success: true, message: "Dual phone and email verification successful" });
      }

      return res.status(400).json({ success: false, error: "Invalid action" });
    } catch (err: any) {
      logger.error("Worker signup OTP error:", err);
      return res.status(500).json({ success: false, error: "OTP processing failed" });
    }
  });

  // ─── WORKER APPLICATIONS APIS ───
  // Query worker registration & verification status for authenticated user
  app.get("/api/workers/status", requireFirebaseUser, async (req, res) => {
    try {
      const uid = (req as any).user.uid;
      const userProfile = await dbAdapter.getUser(uid);
      const workerApp = await dbAdapter.getWorkerApplicationByUid(uid)
        || (userProfile?.phone || (req as any).user?.phone_number 
            ? await dbAdapter.getWorkerApplicationByContact({ 
                phone: userProfile?.phone || (req as any).user?.phone_number,
                email: userProfile?.email || (req as any).user?.email
              })
            : null);

      if (!workerApp && (!userProfile || userProfile.role !== "worker")) {
        return res.json({
          success: true,
          registered: false,
          status: "NOT_REGISTERED",
          message: "No specialist registration found for this account"
        });
      }

      // Under review bypassed: auto-approve registered worker
      const status = "APPROVED";
      return res.json({
        success: true,
        registered: true,
        status: "APPROVED",
        applicationId: workerApp?.id || "APP-AUTO-APPROVED",
        appliedAt: workerApp?.appliedAt || new Date().toISOString(),
        role: "worker",
        categories: workerApp?.categories || userProfile?.workerCategories || ["Electrician"],
        skill: workerApp?.skill || userProfile?.workerSkill || "Electrician"
      });
    } catch (err: any) {
      logger.error("Worker status query error:", err);
      return res.status(500).json({ success: false, error: "Failed to determine worker registration status" });
    }
  });

  app.post("/api/worker-applications", requireFirebaseUser, async (req, res) => {
    try {
      const uid = (req as any).user.uid;
      const appData = req.body;

      if (!appData.legalName || !appData.phone || !appData.email) {
        return res.status(400).json({ success: false, error: "Missing required registration details: legalName, phone, and email are required" });
      }

      // Auto-approve worker application (Admin review bypassed for testing)
      const created = await dbAdapter.createWorkerApplication({
        ...appData,
        uid,
        status: "APPROVED"
      });

      // Update user profile in database to worker role and APPROVED status directly
      await dbAdapter.upsertUser({
        uid,
        name: appData.legalName,
        email: appData.email,
        phone: appData.phone,
        role: "worker",
        status: "APPROVED",
        applicationId: created.id,
        workerSkill: created.skill,
        workerCategories: created.categories,
        visitingFee: created.visitingFee
      });

      logger.info(`Worker application submitted and auto-approved: ${created.id} by uid ${uid}`);
      return res.status(201).json({ success: true, application: created });
    } catch (err: any) {
      logger.error("Worker application error:", err);
      return res.status(500).json({ success: false, error: "Failed to submit worker application" });
    }
  });

  // Public professional discovery: return only sanitized, approved marketplace fields.
  // Private application fields (phone, email, documents, OTPs, review notes, etc.) stay server-side.
  app.get("/api/public/professionals", requireFirebaseUser, async (req, res) => {
    try {
      const apps = await dbAdapter.listWorkerApplications("APPROVED");
      let onlineByUid = new Map<string, boolean>();
      try {
        const userSnap = await getFirestore().collection("users").where("role", "==", "worker").get();
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
      const { idToken, identity } = req.body;
      const uid = identity?.sub || identity?.id || (identity?.email ? `namoid_${crypto.createHash('sha256').update(identity.email).digest('hex').substring(0, 20)}` : null);
      if (!uid) {
        return res.status(400).json({ success: false, error: "Missing user identity" });
      }

      // Authoritative role lookup from server-side database (NEVER trust client-provided role)
      let authoritativeRole = "citizen";
      const existingUser = await dbAdapter.getUser(uid);
      if (existingUser && existingUser.role) {
        authoritativeRole = existingUser.role;
      } else {
        // Check if there is an approved worker application for this user
        const workerApp = await dbAdapter.getWorkerApplicationByUid(uid)
          || (identity?.email ? await dbAdapter.getWorkerApplicationByContact({ email: identity.email }) : null);
        if (workerApp && workerApp.status === "APPROVED") {
          authoritativeRole = "worker";
        }
      }

      if (getApps().length > 0) {
        try {
          const customToken = await getAuth().createCustomToken(uid, {
            email: identity?.email || "",
            name: identity?.name || "",
            role: authoritativeRole,
          });
          return res.json({ success: true, customToken, uid, role: authoritativeRole });
        } catch (adminErr: any) {
          logger.warn("Firebase Admin custom token generation notice:", adminErr?.message || adminErr);
        }
      }

      return res.json({ success: false, uid, role: authoritativeRole, message: "Firebase Admin custom token generation fallback" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Token exchange failed" });
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
      defaultCenter: { lat: 12.9716, lng: 77.5946 }, // Bengaluru tech corridor center
      maxRadiusKm: 4.0,
      radiusPolicy: { smallCityKm: 4, largeCityKm: 8 }
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
        isWithin15Km: routeDistanceKm <= getPunchXServiceRadiusKm(req.body?.city || origin?.city || origin?.area),
        radiusKm: getPunchXServiceRadiusKm(req.body?.city || origin?.city || origin?.area),
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

      const radiusKm = getPunchXServiceRadiusKm(req.body?.city || origin?.city || origin?.area);
      const results = destinations.map((dest: any, index: number) => {
        const destLat = typeof dest.lat === 'number' && Number.isFinite(dest.lat) ? dest.lat : null;
        const destLng = typeof dest.lng === 'number' && Number.isFinite(dest.lng) ? dest.lng : null;
        if (destLat === null || destLng === null) {
          return { id: dest.id || `dest_${index}`, error: 'Invalid coordinates', distanceKm: 0, isWithin15Km: false };
        }

        const dLat = ((destLat - originLat) * Math.PI) / 180;
        const dLon = ((destLng - originLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((originLat * Math.PI) / 180) *
            Math.cos((destLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = Math.round(6371 * c * 10) / 10;
        const isWithin15Km = distanceKm <= radiusKm;
        const etaMins = Math.max(4, Math.round(distanceKm * 3.2));

        // Bearing angle in degrees (-180 to 180)
        const y = Math.sin(dLon) * Math.cos((destLat * Math.PI) / 180);
        const x =
          Math.cos((originLat * Math.PI) / 180) * Math.sin((destLat * Math.PI) / 180) -
          Math.sin((originLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.cos(dLon);
        const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

        return {
          id: dest.id || `dest_${index}`,
          name: dest.name || dest.workerName || dest.customerName || `Target ${index + 1}`,
          category: dest.category || dest.skill || 'Specialist',
          lat: destLat,
          lng: destLng,
          distanceKm,
          isWithin15Km,
          durationMinutes: etaMins,
          etaText: `${etaMins} mins`,
          bearingDeg
        };
      });

      // Filter and sort by distance
      const within15KmList = results.filter(r => r.isWithin15Km).sort((a, b) => a.distanceKm - b.distanceKm);

      return res.json({
        success: true,
        origin: { lat: originLat, lng: originLng },
        totalChecked: destinations.length,
        totalWithin15Km: within15KmList.length,
        maxRadiusKm: radiusKm,
        radiusKm,
        results: within15KmList,
        allResults: results
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

      // Default fallbacks if address missing
      if (!fullAddress) {
        fullAddress = address || "Indiranagar 100ft Road, Sector 2, Bengaluru, KA 560038";
      }

      // Clean sector calculation logic
      const rawArea = (area || fullAddress.split(',')[0] || "Indiranagar").trim();
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
        city: city || "Bengaluru",
        sector: sectorName,
        lat: lat || 12.9716,
        lng: lng || 77.5946
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

  // Dedicated Registered Customers by Worker Location API Endpoint
  app.post("/api/worker-location-customers", async (req, res) => {
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

      // Standardize Sector
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

      // Sector Specific Registered Customer Pool
      const SECTOR_CUSTOMER_DATABASE: Record<string, Array<{
        id: string;
        name: string;
        phoneMasked: string;
        address: string;
        landmark: string;
        serviceNeeded: string;
        urgency: string;
        distanceKm: number;
        verifiedStatus: string;
        totalPreviousBookings: number;
        rating: number;
      }>> = {
        'Sector 2 (Indiranagar)': [
          {
            id: 'CUST-IN-101',
            name: 'Priya Narayanan',
            phoneMasked: '+91 98450 •••••',
            address: 'Flat 304, Royal Palms, 12th Main Road',
            landmark: 'Near 100ft Road Corner, Indiranagar',
            serviceNeeded: 'AC PCB Diagnostic & Gas Refill',
            urgency: '⚡ Immediate Dispatch (within 15m)',
            distanceKm: 0.4,
            verifiedStatus: 'Verified Resident (Premium)',
            totalPreviousBookings: 6,
            rating: 4.9
          },
          {
            id: 'CUST-IN-102',
            name: 'Vikramaditya Rao',
            phoneMasked: '+91 99002 •••••',
            address: 'Villa 18, Defence Colony, 2nd Avenue',
            landmark: 'Near Chinmaya Mission Hospital',
            serviceNeeded: 'MCB Panel Tripping & Heavy Power Cabling',
            urgency: 'Scheduled: Today 4:30 PM',
            distanceKm: 0.8,
            verifiedStatus: 'Verified Resident (Owner)',
            totalPreviousBookings: 3,
            rating: 5.0
          },
          {
            id: 'CUST-IN-103',
            name: 'Ananya Deshmukh',
            phoneMasked: '+91 97411 •••••',
            address: 'Apt 502, Skyline Residency, CMH Road',
            landmark: 'Opposite Metro Pillar 148',
            serviceNeeded: 'Under-Sink Pipe Leak & Tap Valve Replacement',
            urgency: '⚡ Immediate Dispatch (within 20m)',
            distanceKm: 1.1,
            verifiedStatus: 'Verified Citizen',
            totalPreviousBookings: 5,
            rating: 4.8
          },
          {
            id: 'CUST-IN-104',
            name: 'Siddharth Menon',
            phoneMasked: '+91 96321 •••••',
            address: 'House #44, 4th Cross, HAL 2nd Stage',
            landmark: 'Behind BDA Complex',
            serviceNeeded: 'Deep Kitchen Chimney & Tile Degreasing',
            urgency: 'Scheduled: Tomorrow Morning',
            distanceKm: 1.4,
            verifiedStatus: 'Verified Resident',
            totalPreviousBookings: 2,
            rating: 4.9
          }
        ],
        'Sector 1 (HSR Layout)': [
          {
            id: 'CUST-HSR-201',
            name: 'Rahul Kulkarni',
            phoneMasked: '+91 98860 •••••',
            address: 'Plot 82, 27th Main, Sector 1',
            landmark: 'Near NIFT Campus & HSR Club',
            serviceNeeded: 'Dual Split Inverter AC Servicing',
            urgency: '⚡ Immediate Dispatch (within 15m)',
            distanceKm: 0.5,
            verifiedStatus: 'Verified Resident (Gold)',
            totalPreviousBookings: 8,
            rating: 5.0
          },
          {
            id: 'CUST-HSR-202',
            name: 'Meera Nambiar',
            phoneMasked: '+91 98441 •••••',
            address: 'Apt B-201, Green Glen, 14th Main',
            landmark: 'Near Agara Lake Road',
            serviceNeeded: 'Main Line Concealed Drain Unclogging',
            urgency: '⚡ Priority Dispatch (within 20m)',
            distanceKm: 0.9,
            verifiedStatus: 'Verified Resident',
            totalPreviousBookings: 4,
            rating: 4.8
          },
          {
            id: 'CUST-HSR-203',
            name: 'Karthik Balaji',
            phoneMasked: '+91 97312 •••••',
            address: 'House 112, 19th Main, Sector 2',
            landmark: 'Behind CPWD Quarters',
            serviceNeeded: 'Smart Digital Lock Installation & Wood Trim',
            urgency: 'Scheduled: Today 5:00 PM',
            distanceKm: 1.2,
            verifiedStatus: 'Verified Citizen',
            totalPreviousBookings: 3,
            rating: 4.9
          }
        ],
        'Sector 3 (Koramangala)': [
          {
            id: 'CUST-KOR-301',
            name: 'Rohan Singhania',
            phoneMasked: '+91 99160 •••••',
            address: 'Villa 7, 4th Block, 80ft Road',
            landmark: 'Near Sony World Signal',
            serviceNeeded: 'AC Capacitor Repair & Filter Sterilization',
            urgency: '⚡ Immediate Dispatch (within 15m)',
            distanceKm: 0.6,
            verifiedStatus: 'Verified Resident (Premium)',
            totalPreviousBookings: 7,
            rating: 4.9
          },
          {
            id: 'CUST-KOR-302',
            name: 'Tanvi Gokhale',
            phoneMasked: '+91 98800 •••••',
            address: 'Flat 102, Palm Meadows, 5th Block',
            landmark: 'Opposite Jyoti Nivas College',
            serviceNeeded: 'Emergency Kitchen Water Heater Wiring',
            urgency: '⚡ Priority Dispatch (within 25m)',
            distanceKm: 0.8,
            verifiedStatus: 'Verified Resident',
            totalPreviousBookings: 3,
            rating: 4.85
          }
        ]
      };

      // Default or dynamic fallback customers if exact sector key doesn't match default list
      let sectorCustomers = SECTOR_CUSTOMER_DATABASE[sectorName];
      if (!sectorCustomers || sectorCustomers.length === 0) {
        sectorCustomers = [
          {
            id: `CUST-LOC-001`,
            name: 'Aditya Verma',
            phoneMasked: '+91 98451 •••••',
            address: `Main Boulevard, ${rawArea}`,
            landmark: landmark ? `Near ${landmark}` : `Central ${rawArea}`,
            serviceNeeded: 'AC Cooling Diagnostic & General Service',
            urgency: '⚡ Immediate Dispatch (within 15m)',
            distanceKm: 0.5,
            verifiedStatus: 'Verified Resident',
            totalPreviousBookings: 4,
            rating: 4.9
          },
          {
            id: `CUST-LOC-002`,
            name: 'Sneha Kulkarni',
            phoneMasked: '+91 97312 •••••',
            address: `2nd Cross Avenue, ${rawArea}`,
            landmark: `Opposite Community Park, ${rawArea}`,
            serviceNeeded: 'Electrical Distribution Board Inspection',
            urgency: 'Scheduled: Today 4:00 PM',
            distanceKm: 0.9,
            verifiedStatus: 'Verified Citizen',
            totalPreviousBookings: 2,
            rating: 4.8
          },
          {
            id: `CUST-LOC-003`,
            name: 'Rajesh Nair',
            phoneMasked: '+91 96110 •••••',
            address: `Block 4, Palm Residency, ${rawArea}`,
            landmark: `Behind Commercial Hub, ${rawArea}`,
            serviceNeeded: 'Bathroom Fixture & Concealed Pipe Leak Fix',
            urgency: '⚡ Priority Dispatch (within 20m)',
            distanceKm: 1.3,
            verifiedStatus: 'Verified Resident',
            totalPreviousBookings: 5,
            rating: 5.0
          }
        ];
      }

      return res.json({
        success: true,
        address: fullAddress,
        area: rawArea,
        city: city || "Bengaluru",
        sector: sectorName,
        landmark: landmark || "",
        lat: lat || 12.9716,
        lng: lng || 77.5946,
        totalRegisteredCustomersInLocation: sectorCustomers.length,
        coverageMessage: `Service partner visibility active exclusively for registered customers in ${sectorName}`,
        registeredCustomers: sectorCustomers
      });
    } catch (err: any) {
      console.error("Worker location customers backend error:", err);
      return res.status(500).json({ error: "Failed to resolve registered customers for location" });
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
        model: "gemini-3.6-flash",
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PunchX Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
