import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getPunchxFirestore } from '../firebaseAdmin.js';

const NAMOID_USERINFO_URL = 'https://punch-x-747dd7.id.namoid.in/v1/oauth/userinfo';

function fail(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Method not allowed');
  }

  try {
    const accessToken = typeof req.body?.accessToken === 'string'
      ? req.body.accessToken.trim()
      : '';

    // Never mint a Firebase custom token from client-supplied profile data.
    // Ask NamoID's UserInfo endpoint to authenticate the access token and use
    // only the identity returned by NamoID itself.
    if (!accessToken || accessToken.length > 16384) {
      return fail(res, 401, 'NamoID session token is missing. Please restart sign-in.');
    }

    const upstream = await fetch(NAMOID_USERINFO_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      console.warn('NamoID UserInfo rejected token:', upstream.status);
      return fail(res, 401, 'NamoID could not verify this sign-in. Please request a new email OTP.');
    }

    const identity = await upstream.json() as Record<string, unknown>;
    const email = typeof identity.email === 'string' ? identity.email.trim().toLowerCase() : '';
    const subject = typeof identity.sub === 'string' ? identity.sub.trim()
      : typeof identity.id === 'string' ? identity.id.trim()
      : typeof identity.user_id === 'string' ? identity.user_id.trim() : '';

    if (!subject && !email) {
      return fail(res, 401, 'NamoID did not return a stable user identity. Please contact support.');
    }

    // Preserve the UID mapping used by existing PunchX profiles. A verified
    // NamoID subject is preferred; email is a deterministic fallback only
    // when the provider does not supply a subject.
    const uid = subject || `namoid_${createHash('sha256').update(email).digest('hex').slice(0, 20)}`;
    if (uid.length > 128) {
      return fail(res, 401, 'NamoID returned an invalid account identifier.');
    }

    const firestore = getPunchxFirestore();
    const userRef = firestore.collection('users').doc(uid);
    const existing = await userRef.get();
    let role = existing.data()?.role === 'admin' ? 'admin'
      : existing.data()?.role === 'worker' && existing.data()?.status === 'APPROVED' ? 'worker'
      : 'citizen';

    if (!existing.exists) {
      let workerApps = await firestore.collection('workerApplications').where('uid', '==', uid).limit(1).get();
      if (workerApps.empty && email) {
        workerApps = await firestore.collection('workerApplications').where('email', '==', email).limit(1).get();
      }
      if (!workerApps.empty && workerApps.docs[0].data().status === 'APPROVED') role = 'worker';
    }

    // Keep Firebase custom claims to application-specific fields only. Email
    // and name belong in the profile document, not developer custom claims.
    const customToken = await getAuth().createCustomToken(uid, { role });

    return res.status(200).json({ success: true, customToken, uid, role });
  } catch (error: any) {
    console.error('Verified NamoID → Firebase token exchange failed:', error);
    const message = String(error?.message || '');
    if (message.includes('Firebase Admin is not configured')) {
      return fail(res, 503, 'Firebase Admin credentials are missing in Vercel. Configure FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
    }
    if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('credential')) {
      return fail(res, 503, 'Firebase Admin credentials are invalid or lack permission to mint Firebase custom tokens.');
    }
    return fail(res, 503, 'The verified NamoID session could not be linked to Firebase. Check the Firebase Admin configuration and try again.');
  }
}
