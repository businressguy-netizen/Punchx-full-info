# PUNCHX Supabase migration plan

## Target architecture
- Supabase Auth replaces Firebase Authentication.
- Supabase PostgreSQL replaces Firestore as the system of record.
- Express remains the trusted backend for privileged workflows.
- The browser uses Supabase Auth with a publishable key; database writes, admin operations, payment operations, and WhatsApp webhook processing stay server-side.
- Never expose a Supabase secret/service-role key or database connection string in VITE variables or browser storage.

## Phase sequence
1. Database foundation (this phase): core relational schema, booking lifecycle, payment/invoice/commission ledgers, WhatsApp event idempotency, indexes, and locked-down RLS.
2. Authentication foundation: Supabase client, server-side JWT verification, profile provisioning, admin role authorization, password recovery, and OAuth provider configuration.
3. Data access migration: replace Firebase client and Admin SDK access with typed Supabase/Postgres repositories; preserve existing user, worker, order, claims, complaints, and review workflows.
4. Booking workflow: request submission, admin accept/reject, WhatsApp confirmation webhook, professional assignment, service completion and final price.
5. Payments and invoices: Razorpay order creation, webhook verification, invoice generation and WhatsApp delivery; never trust client payment claims.
6. Data migration and cutover: export Firebase records, transform and reconcile counts/references, import users and business data, test logins and workflows, then switch production traffic.
7. Firebase retirement: only after sign-off, disable Firebase Auth/Firestore usage and remove SDKs, credentials, rules and project dependencies.

## Authentication migration warning
Firebase users' existing passwords must not be assumed portable. Validate Firebase password-hash compatibility before selecting an import path. If existing password hashes cannot be safely imported, use a controlled account-recovery/password-reset or re-verification flow. Reconfigure OAuth providers and redirect URLs in Supabase Auth before cutover. Do not delete or disable Firebase users during preparation.

## Database security model
All application tables have RLS enabled. Direct anon and authenticated table grants are revoked; application data access is server-only. The backend must authenticate Supabase JWTs and enforce profile roles on every privileged endpoint. Do not authorize from user-editable user metadata. Keep payment secrets, WhatsApp tokens, and database credentials server-side.

## Environment variables to configure later
- VITE_SUPABASE_URL — project URL (public)
- VITE_SUPABASE_PUBLISHABLE_KEY — publishable key (public)
- SUPABASE_URL — server project URL
- SUPABASE_PUBLISHABLE_KEY — server-side Auth client key
- SUPABASE_SECRET_KEY — server-only Auth Admin/API secret, if required
- SUPABASE_DB_URL — server-only Postgres connection string (use the project's recommended pooled connection string for the runtime)
- Razorpay and WhatsApp credentials will be configured separately when those phases are approved and ready.

## Current safety state
- The Supabase project contains schema only; no customer or order records have been migrated.
- Firebase remains enabled and unchanged.
- No production traffic has been switched.
- No credentials have been written to source control.
