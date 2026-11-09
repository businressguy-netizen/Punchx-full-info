import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getApp } from "../server";

// Shared Express entry point for backend routes without a dedicated Vercel
// function. Dedicated endpoints (including the consolidated maps handler)
// retain precedence over this catch-all.
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
