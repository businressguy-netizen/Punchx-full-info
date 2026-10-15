# PunchX Platform: Progress Report & Integration Roadmap

**Report date:** October 15, 2026  
**Document version:** 1.1.0 (reviewed and corrected)  
**Purpose:** Describe the current reported state, identify integration gaps, and provide a safer checklist for connecting the Admin Dashboard to the PunchX backend.

> **Important status note:** This document is a plan and review of the supplied report, not proof that either repository has been inspected or that the listed features work in production. Treat every prior “Verified” label as a claim that must be backed by current test results, CI output, and/or a reproducible demo. Do not describe the platform as production-ready until the acceptance checks in this document pass.

## 1. Repositories and scope

- **Admin Command Center:** `C:\Users\my359\Desktop\Admin-dashboard-punchx` (reported local port: `5173`)
- **Main consumer platform:** `C:\Users\my359\Desktop\Punchx-full-info` (reported local port: `3000`)

These are machine-specific local paths, not repository URLs. Confirm the actual repository names, branches, deployment targets, and environment variables before following the instructions.

## 2. Reported current state — verification required

The previous report describes the following modules. Their implementation status cannot be independently established from this Markdown file alone.

| Area | Capability described in the original report | Evidence required before calling it verified |
|---|---|---|
| Platform bridge | Admin-to-core API, platform settings, health checks | Automated auth tests, integration tests, safe configuration persistence, and logs |
| Worker operations | Worker directory, duty state, dispatch, KYC, payouts | Role/permission tests, audit records, data validation, and tested state transitions |
| Executive overview | GMV, booking counts, service-area indicators | Reconciliation against the database and documented definitions |
| Citizen/provider management | Search, profiles, suspension, KYC decisions | Server-side authorization, reason validation, audit logs, and privacy controls |
| Promotions | Banners, scheduling, click-through metrics | Scheduling tests, authorization checks, and analytics definitions |
| Payments | Transaction ledger, refunds, retries, commissions | Verified payment-provider webhooks, idempotency, refund authorization, and reconciliation |
| Offers and broadcasts | Coupons and multi-channel messaging | Coupon validation, usage limits, consent/unsubscribe handling, and delivery logs |
| Reports and exports | Date filters and CSV/Excel exports | Access controls, correct aggregation, export tests, and safe CSV output |
| Governance | Permission matrix and audit logs | Server-enforced permissions; client-side persona switching must never grant real privileges |

**Use accurate status labels:**
- **Implemented:** code exists.
- **Tested:** a named automated or manual test passed.
- **Staging-verified:** verified in the staging environment with evidence.
- **Production-verified:** verified in production with monitoring and rollback procedures.
- **Planned:** not yet implemented or not yet demonstrated.

A successful build alone does not verify security, database persistence, payment correctness, GPS accuracy, or end-to-end behavior.

## 3. Corrected roadmap

### Milestone 1 — Secure and connect the core systems

1. Inspect both repositories, their package scripts, current branches, CI configuration, route conventions, and database adapter interfaces.
2. Configure Firebase using server-side credentials or the hosting provider's workload identity/secret manager. Never commit service-account keys.
3. Add the admin API routes only after confirming that the referenced database adapter methods exist and have the expected input/output types.
4. Configure authentication and server-side role-based authorization for every administrative operation.
5. Configure exact allowed origins, API rate limits, request validation, structured error handling, and audit logging.
6. Run tests for authorized and unauthorized requests, database persistence, and deployment configuration.

### Milestone 2 — Operational reliability

1. **Worker location:** implement authenticated location updates using WebSockets or Server-Sent Events where appropriate. Validate freshness, consent, access boundaries, and retention. Do not expose a worker's location to unauthorized users.
2. **Payment webhooks:** verify the payment provider's webhook signature against the raw request body, persist event IDs, handle retries idempotently, and reconcile payment/refund states. Never trust a browser redirect as proof of payment.
3. **Dispatch assistance:** begin with transparent, deterministic matching rules and measured outcomes. Add AI recommendations only after validating the inputs, privacy implications, fallback behavior, and human override.
4. **Disputes:** add a permission-controlled case workflow with evidence retention, status history, and auditable decisions.

### Milestone 3 — Hardening and scale

1. Define audit-log retention and archival policies; restrict access to archived records.
2. Add monitoring, alerts, backups, restore tests, dependency scanning, and incident-response procedures.
3. Build and test a mobile-friendly supervisor experience.
4. Load-test the critical booking, dispatch, and payment paths before increasing traffic.

## 4. Firebase credentials — safer setup

The original instructions suggest downloading a Firebase service-account private key and placing it inside the project directory. **Do not commit that file, upload it to GitHub, include it in a client bundle, or share it in screenshots or chat.** Prefer the hosting provider's secret manager or workload identity when supported.

For local development only, if a service-account JSON file is necessary:

1. Download it from Firebase Console → Project settings → Service accounts, after confirming the correct Firebase project.
2. Store it **outside the repository** where practical, restrict local file permissions, and add the path to your local environment configuration.
3. Add relevant secret filenames to `.gitignore` (for example, `firebase-service-account.json` and `.env*`), while keeping a safe `.env.example` with placeholders. Check `git status` and repository history to ensure no secret was committed.
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of that local file. Do not assume a relative path will resolve consistently across process managers or deployment platforms.
5. In production, use the host's secret manager/workload identity when possible. If a JSON key is unavoidable, store it as a secret and rotate it according to a documented process.

Example local `.env` (replace the path with your own local path; do not commit real values):

```env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/repository/firebase-service-account.json
ADMIN_API_KEY=
PORT=3000
```

Do not put a Firebase service-account key in a `VITE_*` variable or any other frontend-exposed configuration. Variables prefixed with `VITE_` are typically bundled into client-side code.

**Database fallback warning:** an in-memory fallback, if the application actually implements one, is temporary and loses its data when the process restarts. It is not evidence of durable storage or production readiness. Verify the actual adapter selection and fail safely in production if the required database is not configured.

## 5. Admin Bridge — security and integration corrections

The original sample contains this unsafe pattern:

```ts
const expectedKey = process.env.ADMIN_API_KEY || 'punchx_admin_secure_live_key_2026_9941a8';
```

Remove the hardcoded fallback. A predictable or committed fallback can allow unauthorized access. If the credential is missing, the application should fail closed rather than silently using a default.

### Required integration checks before writing the route

- Confirm the real `dbAdapter` exports and the exact signatures of every method used.
- Confirm whether the project uses Express, and match its installed version and TypeScript settings.
- Authenticate the caller and enforce permissions **on the server** for each route. A single shared API key is not a substitute for per-user identity, role checks, least privilege, or revocation.
- Validate request bodies, path parameters, query parameters, enums, and pagination with a schema validator.
- Apply request-size limits, rate limiting, safe error responses, and security logging.
- Use HTTPS in production and keep credentials in environment secrets.
- Do not allow the admin bridge to bypass normal booking, payment, KYC, or account-state business rules.
- Avoid returning sensitive identity/KYC data by default; return only fields needed for the authorized task.
- Add tests for missing/invalid credentials, insufficient permissions, malformed input, database errors, and audit logging.

### Illustrative authentication guard

This is a **guard example only**, not a complete production authorization system. Integrate it with the project's established authentication and role-based authorization middleware. It uses Node's timing-safe comparison to avoid a simple string comparison for the API key.

```ts
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requireAdminApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const expectedKey = process.env.ADMIN_API_KEY;
  const suppliedKey = req.header('x-admin-key');

  // Fail closed when configuration is absent or invalid.
  if (!expectedKey || expectedKey.length < 32 || !suppliedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const expected = Buffer.from(expectedKey, 'utf8');
  const supplied = Buffer.from(suppliedKey, 'utf8');

  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  return next();
}
```

Additional cautions:
- Generate a unique, random secret of sufficient entropy and configure it through a secret manager or local untracked environment file. Never use the example value from the previous report.
- Do not accept a shared admin key from a browser application. Any key embedded in frontend JavaScript can be extracted by users. The browser should authenticate to a backend that enforces user identity and permissions; keep service-to-service credentials server-side.
- If a browser-based admin UI calls the main API directly, use an appropriate admin sign-in/session mechanism, CSRF protection where relevant, strict CORS, and server-enforced permissions. CORS is not authentication.
- Do not log the API key, authorization header, private credentials, or sensitive personal data.

### Route mounting

The previous report suggests mounting `/api/admin` in `server.ts`. Do this only after confirming the server's actual setup and middleware order. Authentication, authorization, validation, and rate limiting must apply to all sensitive routes. If a global rate limiter is present, place the admin router according to the application's intended rate-limit policy—not merely to bypass a limiter.

Do not copy the original route handlers blindly. They call adapter methods such as `listUsers`, `upsertUser`, `listWorkerApplications`, `updateWorkerApplicationStatus`, `listOrders`, and `updateOrderStatus`; verify each method exists and that its types and business rules match. The sample also lacks robust validation, per-operation permission checks, consistent error handling, and audit events.

Recommended endpoint behavior:
- `/health`: return minimal operational status; do not expose secrets, internal paths, or unnecessary infrastructure detail. Decide whether the endpoint is public or authenticated.
- User, worker, and order routes: apply resource-level authorization, schema validation, safe field allowlists, and auditable state transitions.
- Payment/refund routes: use dedicated server-side business logic and verified provider events. Do not perform financial operations by directly changing a status field.
- All routes: return appropriate HTTP status codes, handle exceptions centrally, and avoid leaking stack traces or database details.

## 6. Environment configuration

Keep real `.env` files and secrets out of version control. Commit only placeholder examples such as `.env.example`.

Example placeholders (adapt to the actual codebase):

```env
# Main backend — local development only
PORT=3000
ADMIN_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173
GOOGLE_APPLICATION_CREDENTIALS=
```

```env
# Admin frontend — only public configuration belongs here
VITE_MAIN_API_URL=http://localhost:3000
```

Do not place `ADMIN_API_KEY`, Firebase private keys, payment secrets, or any other server credential in frontend environment variables. Confirm whether `ALLOWED_ORIGINS` is actually read as a comma-separated string or as an array in the server code; configure it according to the implementation. In production, use the exact HTTPS admin origin rather than a broad wildcard.

## 7. Production deployment checklist

1. Deploy the core backend to the chosen host and configure production secrets there.
2. Deploy the admin frontend behind strong authentication, ideally with MFA and restricted access.
3. Set the public API base URL to the actual production backend domain.
4. Configure exact CORS origins, HTTPS, secure cookies where applicable, and rate limits.
5. Confirm the backend—not the frontend—enforces admin permissions.
6. Configure database backups and verify a restore, not just that backups are enabled.
7. Verify health checks and alerts without exposing private infrastructure details.
8. Run staging smoke tests and a rollback rehearsal before production release.
9. Verify the payment provider's production webhook configuration and signature validation.
10. Review logs for accidental secrets and personal data.

## 8. Acceptance checklist

### Repository and build
- [ ] Confirm both repository URLs, branches, package scripts, and current CI status.
- [ ] Install dependencies from the lockfile and run lint, type-check, unit tests, and production builds.
- [ ] Confirm the actual admin route and adapter method signatures.
- [ ] Remove hardcoded credentials and rotate any secret that may have been committed or exposed.

### Security and data
- [ ] Missing or invalid credentials are rejected.
- [ ] A normal citizen or professional cannot access admin operations.
- [ ] Each admin role can perform only its permitted actions.
- [ ] Invalid request data is rejected without changing the database.
- [ ] Sensitive identity and KYC fields are not unnecessarily returned or logged.
- [ ] Admin actions create useful audit records without storing secrets.
- [ ] Production fails safely when required database configuration is missing.
- [ ] Data survives application restarts and is confirmed in the intended database.

### Payments and operations
- [ ] Webhook signatures are verified and duplicate events are idempotent.
- [ ] Refunds and commissions are reconciled against the payment provider.
- [ ] Location access is limited to authorized, relevant users.
- [ ] Monitoring, backups, restore tests, and incident procedures are in place.

### Release decision
- [ ] All critical checks pass in staging.
- [ ] Production deployment and rollback are documented.
- [ ] The report's status labels are updated to match evidence.

## 9. Immediate next actions

1. Inspect the current code in both repositories and establish what is implemented versus merely described.
2. Remove the hardcoded admin-key fallback; rotate any exposed key.
3. Confirm the real database adapter methods and how Firebase credentials are loaded.
4. Add server-side authentication, authorization, validation, error handling, and audit tests.
5. Run CI and end-to-end tests, then connect the dashboard to the backend in staging.
6. Update this report with dated evidence and only then mark individual items as verified.