# PUNCHX Supabase deployment setup

The Express backend connects to Supabase PostgreSQL through the Node `pg` driver. The browser never receives the database connection string.

## Vercel Preview environment (test first)

In the Vercel project for `punchx-full-info`, open **Settings → Environment Variables** and add these for **Preview** only:

- `PUNCHX_DB_PROVIDER` = `supabase`
- `SUPABASE_DB_URL` = the PostgreSQL **Transaction Pooler** connection URI from Supabase → Project Settings → Database → Connection string. Use the pooler host and port shown by Supabase (normally port 6543). Replace the password placeholder with the database password.

Do not prefix either variable with `VITE_`. Do not put the connection URI in frontend code, GitHub files, build arguments, or chat.

Redeploy the Preview deployment after saving the variables. Check `/api/health`; it must return `dbProvider: "postgres"`, `dbHealthy: true`, and `status: "ok"`.

## Admin bridge secret

Set `ADMIN_API_KEY` as a server-only Vercel environment variable in Preview and Production. Generate a new random value with at least 32 characters. Do not reuse the legacy value found in old Git history. Rotate any previously deployed value before enabling the updated bridge.

## Production cutover

Do not switch Production to Supabase until Preview passes:
1. NamoID login and logout, including switching between two accounts.
2. Customer profile create/update and session restore.
3. Professional application submission, pending status, admin approval and rejection.
4. Customer booking create/list/detail and professional assignment/status transitions.
5. Admin dashboard overview, user directory, claims and complaints.
6. Razorpay order creation, signature verification, webhook replay/idempotency and invoice flow.

After those checks, set the same two database variables for **Production**, redeploy, and verify `/api/health` before opening traffic.

## Data and migration notes

- The additive PUNCHX compatibility migrations applied during this integration are tracked under `supabase/migrations/`. The two pre-existing core schema migrations were already recorded in Supabase before this PR and are not reconstructed here; do not run a fresh-project `supabase db push` until those baseline migrations are brought into source control.
- The compatibility tables preserve the current Express adapter contract while the canonical Supabase booking schema remains intact.
- Operational tables have RLS enabled and explicit deny policies for `anon` and `authenticated`; only the server-side database connection is intended to access them.
- Active service categories and service items have public read-only policies.
- No existing Firebase records were copied or deleted by these schema migrations. Firebase remains the identity provider and fallback database until the Preview and Production cutovers are separately verified.
