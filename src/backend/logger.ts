// ─── PUNCHX Sanitized Backend Logger Utility ───
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'bearer',
  'secret',
  'apikey',
  'api_key',
  'gemini_api_key',
  'privatekey',
  'serviceaccount',
];

/**
 * Recursively sanitizes objects to prevent leaking secrets, authorization headers, or private tokens into backend logs.
 */
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('Bearer ') || obj.length > 256) {
      return '[REDACTED_SECRET]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED_SENSITIVE_VALUE]';
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }

  return obj;
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? sanitize(meta) : '');
  },

  warn(message: string, meta?: any) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? sanitize(meta) : '');
  },

  error(message: string, error?: any, meta?: any) {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      error?.message || error || '',
      meta ? sanitize(meta) : ''
    );
  },

  security(message: string, meta?: any) {
    console.warn(
      `[SECURITY_AUDIT] ${new Date().toISOString()} - ${message}`,
      meta ? sanitize(meta) : ''
    );
  },
};
