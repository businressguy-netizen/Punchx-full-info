import type { VercelRequest, VercelResponse } from '@vercel/node';

// BE-08: Trusted PUNCHX origin allowlist (matches server.ts)
const ALLOWED_ORIGINS = [
  "https://www.punchxapp.co.in",
  "https://punchxapp.co.in",
  "http://localhost:5173",
  "http://localhost:3000",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // BE-08 FIX: Only allow requests from trusted PUNCHX origins (no wildcard)
  const requestOrigin = (req.headers.origin as string) || "";
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  let targetUrl = (req.query.url as string) || (req.body?.targetUrl as string);
  if (!targetUrl || req.url?.includes("/api/oauth/token")) {
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

    let outgoingMethod = req.method || "POST";
    let body: string | undefined = undefined;

    if (isTokenEndpoint) {
      outgoingMethod = "POST";
      headers["content-type"] = "application/x-www-form-urlencoded";

      const bodyObj: Record<string, string> = {};
      const rawBody = req.body;

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
          // ignore
        }
      }

      if (typeof req.query === "object" && req.query !== null) {
        for (const [k, v] of Object.entries(req.query)) {
          if (k !== "url" && k !== "targetUrl" && typeof v === "string" && !bodyObj[k]) {
            bodyObj[k] = v;
          }
        }
      }

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
        body = req.body;
      }
    }

    const response = await fetch(targetUrl, {
      method: outgoingMethod,
      headers,
      body,
    });

    let responseBody = await response.text();
    const status = response.status;

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
    return res.send(responseBody);
  } catch (error: any) {
    console.error("NamoID proxy error:", error);
    return res.status(500).json({ error: "proxy_internal_error", error_description: error?.message || "Failed to proxy NamoID request" });
  }
}
