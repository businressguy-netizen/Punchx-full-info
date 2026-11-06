# PUNCHX authentication provider decision

## Decision
Use Supabase Auth directly as the sole identity provider. Do not add NamoID as a federated OIDC dependency for the initial migration.

## Why this is the preferred route
- Supabase Auth issues the same access/refresh tokens used by the new Supabase database and backend.
- Removes the current NamoID -> custom Firebase token exchange -> Firebase Auth chain.
- Avoids coupling login success to a third-party OIDC tenant's issuer, audience, callback, and token-exchange configuration.
- Centralizes account recovery, session refresh, logout, user identity, and authorization around Supabase.
- Keeps the architecture simpler to operate and troubleshoot.

## Login methods
1. Email OTP/magic link as the first provider-independent login method.
2. Phone OTP for the Indian customer/professional experience after an SMS provider (for example MSG91 or Twilio) is configured and tested in Supabase Auth.
3. Admin accounts must use invited/provisioned accounts and server-controlled role assignment. Public sign-up must never create an admin or approved professional role.

## Security and migration rules
- Use the Supabase publishable key in browser code only.
- Keep Supabase secret/service-role keys and database credentials server-side.
- The server verifies Supabase access tokens against Supabase Auth and reads the authoritative role from the protected profiles table.
- Never trust a role from localStorage, browser state, user-editable metadata, or a signup request.
- Do not create anonymous sessions as a fallback for failed authentication.
- Do not import or assume Firebase passwords are portable. Validate supported password-hash import; otherwise require a secure reset/re-verification.
- Do not remove NamoID/Firebase code or switch production login until Supabase login, profile provisioning, password recovery, role authorization, and existing-user migration have passed staging tests.

## Current status
This is an architecture decision only. The live login remains unchanged. SMS provider credentials, Supabase Auth email settings, redirect allowlists, and production environment variables have not been configured. No user accounts have been imported or created.
