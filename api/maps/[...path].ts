import type { VercelRequest, VercelResponse } from "@vercel/node";
import distanceMatrixHandler from "../../src/api-handlers/maps/distance-matrix";
import geocodeHandler from "../../src/api-handlers/maps/geocode";
import routesHandler from "../../src/api-handlers/maps/routes";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url || "").split("?")[0].replace(/\\/+$/, "");
  if (pathname.endsWith("/distance-matrix")) return distanceMatrixHandler(req, res);
  if (pathname.endsWith("/geocode")) return geocodeHandler(req, res);
  if (pathname.endsWith("/routes")) return routesHandler(req, res);
  return res.status(404).json({ success: false, error: "Maps endpoint not found" });
}
