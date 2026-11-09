import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getApp } from "../server";

// This catch-all serves Express routes that do not have a dedicated Vercel
// function. Specific api/*.ts functions continue to take precedence.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req as any, res as any);
  } catch (error) {
    console.error("PUNCHX Express API initialization failed:", error);
    return res.status(500).json({
      success: false,
      error: "The PUNCHX API could not be initialized."
    });
  }
}
