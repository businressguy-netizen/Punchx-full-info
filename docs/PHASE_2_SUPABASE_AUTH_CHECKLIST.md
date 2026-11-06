# Phase 2 — Supabase Auth integration checklist

## Implemented preparation
- Added `src/backend/auth/supabaseAuth.ts` with remote Supabase Auth token verification.
- Added authoritative role lookup from `public.profiles` using a server-only Supabase secret key.
- Added reusable `requireSupabaseUser`, `requireSupabaseRole`, and `requireSupabaseAdmin` middleware.
- The middleware is not mounted on production routes yet; existing NamoID/Firebase login remains unchanged until the new provider flow and profile migration are ready.

## Server environment required before enabling
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server only; never use a VITE_ prefix)

## NamoID provider decision
The current website uses NamoID's hosted OIDC flow. Before changing login, verify that the NamoID tenant exposes a compatible OIDC issuer URL, client ID, client secret, discovery document, and approved callback/redirect URLs for Supabase Auth. Configure it as a Supabase Auth custom OIDC provider only after the issuer metadata and token audience/claims are verified. Do not infer that the existing browser callback can be reused as-is.

## Required implementation and tests before cutover
1. Configure and test NamoID as a Supabase Auth provider in a non-production environment.
2. Add Supabase client SDK and lockfile changes, session persistence, refresh handling, sign-out, callback handling, and password/account recovery UI.
3. Create profiles safely for newly authenticated users; never let a user self-assign the `admin` or `professional` role.
4. Migrate existing identities using a verified import strategy. Do not assume Firebase password hashes are directly portable; use a controlled password reset/re-verification if required.
5. Add integration tests for expired/invalid tokens, missing profiles, role escalation attempts, admin authorization, logout, and session refresh.
6. Only then route the application through Supabase Auth. Keep Firebase available until user and workflow reconciliation is signed off.

## Current state
- Supabase Auth middleware is a server-side scaffold only and is not yet used by application routes.
- No Supabase Auth users or profiles have been created or imported.
- Existing NamoID/Firebase authentication is unchanged.
- No Firebase services have been disabled and no production environment variables have been changed.
