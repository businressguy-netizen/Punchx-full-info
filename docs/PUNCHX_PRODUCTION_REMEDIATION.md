# PunchX Production Remediation Strategy

## Goal

Turn PunchX into a reliable citizen-to-professional home-services marketplace while keeping the existing React/Firebase application stable during the migration to a more scalable backend architecture.

## Non-negotiable release rule

Development and testing happen in GitHub/preview environments. Production deployment to Vercel happens only after explicit release approval from the founder.

## Current target architecture

```text
Citizen Web / Mobile
        |
        v
  Authentication
        |
        v
 Booking / Service API
        |
  +-----+------------------+
  |                        |
  v                        v
Matching / Dispatch     Payments
  |                        |
  v                        v
PostgreSQL + PostGIS    Gateway/Webhooks
  |
  +--> Redis geo/cache
  |
  +--> Notifications
  |
  +--> Professional app
  |
  +--> Admin operations
```

## Phase 0 — Stability gate

Before production release:

- TypeScript compile must pass.
- Lint must pass for changed production code.
- Production build must pass.
- Firebase initialization must fail gracefully instead of crashing the entire application.
- Lazy-loaded routes/screens must recover from stale chunks.
- Authentication/session restoration must be deterministic.
- Citizen, professional and admin routes must be smoke-tested.
- No secrets may be committed to Git.

## Phase 1 — Marketplace UX

### Citizen flow

`Home → Service → Facility/Exact Work → Serviceability → Address → Time Slot → Review → Payment → Confirmation → Professional Assignment → Tracking → Completion → Rating`

### Professional flow

`Registration → Verification → Service/Area Setup → Availability → New Job → Accept/Reject → On The Way → Arrived → In Progress → Completion OTP → Completed → Earnings`

### Admin flow

`Dashboard → Citizens → Professionals → Verification → Bookings → Dispatch → Complaints → Payments → Commissions → Analytics`

Every primary button must have one clear purpose and every successful action must lead to the next expected state.

## Phase 2 — Dispatch and location

The current Firebase workflow remains the short-term source of truth while the scalable service layer is introduced.

Target capabilities:

- service skill matching
- service-area/geofence eligibility
- professional availability
- distance-aware candidate selection
- transactional job claiming
- reassignment when a professional rejects or times out
- real-time customer status updates
- professional location updates only during active jobs

PostgreSQL/PostGIS is the target persistent spatial layer. Redis is the target high-speed location/cache layer. Neither should be introduced until the data model and failure recovery behavior are defined and tested.

## Phase 3 — Payments and settlement

Payment integration must use the selected gateway's supported marketplace/split-settlement/payout capabilities and applicable Indian regulatory requirements. Do not implement a custom "smart contract escrow" merely as an application feature.

Required lifecycle:

`Payment initiated → Gateway confirmation → Booking secured → Service delivered → Completion verification → Settlement/payout → Reconciliation`

Webhook signatures, idempotency keys, refund handling and failed-payout recovery are mandatory.

## Phase 4 — Professional onboarding

Professional records should support:

- identity status
- service skills
- service zones
- availability
- bank/payout status
- verification status
- ratings
- completed jobs
- complaints/quality flags

Any Aadhaar/PAN/KYC integration must use an authorized provider and the legally permitted verification flow. Sensitive identity documents must not be stored unnecessarily in client-side storage.

## Phase 5 — Observability

Replace static claims about uptime with actual monitoring.

Required monitoring:

- public HTTPS health check
- application startup errors
- API latency/error rate
- Firebase availability/error metrics
- booking creation failures
- payment webhook failures
- notification delivery failures
- professional assignment latency

Alerts should reach the engineering/operator channel before customers report an outage.

## Phase 6 — Web and domain reliability

The current frontend can remain on Vercel while the platform is stabilized. CDN/WAF/DNS changes should be introduced only when they solve a measured requirement.

Required domain checks:

- canonical `www` hostname
- redirect from apex domain
- valid TLS
- DNS ownership and records
- no stale deployment aliases
- cache behavior verified after every production release

## Phase 7 — Brand/search identity

PunchX should consistently identify itself as a hyperlocal home-services marketplace.

Required:

- Organization schema
- WebSite schema
- Service schema
- consistent title/description metadata
- canonical URLs
- Open Graph metadata
- app-store naming such as `PunchX: Home Services & Repairs` where appropriate
- official social/profile links
- sitemap and robots configuration

Trademark registration and legal brand clearance should be handled with qualified trademark counsel; technical SEO cannot substitute for legal protection.

## Release gates

A release is ready only when:

1. Build passes.
2. No blocking runtime errors are present.
3. Citizen booking completes successfully in preview.
4. Professional receives and can claim a job.
5. Customer sees the job status update.
6. Completion flow works.
7. Payment/webhook behavior is verified in sandbox/test mode.
8. Admin can inspect the booking.
9. Mobile and desktop smoke tests pass.
10. Production deployment is explicitly approved.

## Migration principle

Do not rewrite the entire system in one step. Stabilize the existing application first, establish reliable contracts and data models, then migrate high-value workloads from Firebase to PostgreSQL/PostGIS/Redis incrementally. This keeps the marketplace operational while reducing migration risk.
