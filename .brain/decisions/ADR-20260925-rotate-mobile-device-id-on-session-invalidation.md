# ADR — Rotate the mobile device ID after session invalidation

Date: 25 September 2026
Status: Accepted in source; signed-device verification pending.

## Context

The mobile app stored a generated installation device ID in SecureStore across sign-out and server-driven session revocation. The server removes the old account's device sessions and push registrations, but a later user on the same installation could reuse that identifier. The identifier also scopes local app-lock data with the user ID.

## Decision

Delete the stored device ID during local session invalidation, alongside token/profile, private report, draft, read-cache and app-lock cleanup. This covers explicit sign-out and unauthorized/server-revoked sessions. The app-lock provider re-reads the ID when the authenticated user changes, so the next session receives a fresh value. Generate that value with Expo Crypto's native random UUID function; do not fall back to a timestamp and `Math.random`. Keep the ID stable during token refresh, sign-in persistence and cooperative-role switching within a session.

The local security clearer still removes the prior app-lock record using the prior identity. A newly generated ID is not proof that server, analytics, diagnostics or processor copies of the old ID are erased. Verify sign-out, revocation, subsequent sign-in, app-lock and push/session behavior in signed Android and iOS builds before claiming device-level deletion.
