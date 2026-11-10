import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApp } from '../server';

// Keep this dedicated Vercel route on the same authenticated Express implementation
// used in local development and by the API catch-all.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req as any, res as any);
  } catch (error) {
    console.error('PUNCHX worker customer API initialization failed:', error);
    return res.status(500).json({
      success: false,
      error: 'The PUNCHX worker customer API could not be initialized.',
    });
  }
}
