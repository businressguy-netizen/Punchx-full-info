import type { NextFunction, Request, Response } from 'express';

export interface SupabaseAuthenticatedUser {
  id: string;
  email?: string;
  phone?: string;
  role: 'citizen' | 'professional' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: SupabaseAuthenticatedUser;
    }
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}

/**
 * Verify the bearer token with Supabase Auth itself. Do not decode JWT payloads
 * locally and do not trust user-editable app/user metadata for authorization.
 */
export async function verifySupabaseAccessToken(token: string): Promise<{ id: string; email?: string; phone?: string }> {
  const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
  const publishableKey = requiredEnv('SUPABASE_PUBLISHABLE_KEY');

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Supabase access token is invalid or expired');
  }

  const user = await response.json() as { id?: string; email?: string; phone?: string };
  if (!user.id) throw new Error('Supabase Auth returned no user ID');
  return { id: user.id, email: user.email, phone: user.phone };
}

/**
 * Read the authoritative role from public.profiles using a server-only secret.
 * SUPABASE_SECRET_KEY must never be exposed to Vite/browser code.
 */
async function getAuthoritativeProfileRole(userId: string): Promise<'citizen' | 'professional' | 'admin'> {
  const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
  const secretKey = requiredEnv('SUPABASE_SECRET_KEY');
  const url = new URL(`${supabaseUrl}/rest/v1/profiles`);
  url.searchParams.set('id', `eq.${userId}`);
  url.searchParams.set('select', 'role');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) throw new Error('Unable to verify the account role');
  const rows = await response.json() as Array<{ role?: string }>;
  const role = rows[0]?.role;
  if (role !== 'citizen' && role !== 'professional' && role !== 'admin') {
    throw new Error('Account profile is missing or has an invalid role');
  }
  return role;
}

export async function requireSupabaseUser(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const identity = await verifySupabaseAccessToken(match[1]);
    const role = await getAuthoritativeProfileRole(identity.id);
    req.supabaseUser = { ...identity, role };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid authentication session',
    });
  }
}

export function requireSupabaseRole(...allowedRoles: Array<'citizen' | 'professional' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.supabaseUser) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.supabaseUser.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient account permissions' });
    }
    return next();
  };
}

export const requireSupabaseAdmin = requireSupabaseRole('admin');
