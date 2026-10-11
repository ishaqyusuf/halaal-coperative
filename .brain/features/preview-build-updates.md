# Preview native build updates

Implemented in source on 11 October 2026; hosted activation and signed Preview
upgrade acceptance remain open. [Operational steps](../../docs/releases/android-preview-download.md).

- Dedicated global `MobileBuildRegistry` stores one validated Android Preview
  record under `mobile.build.android.preview.v1`. Transaction-scoped advisory
  locking, revision checks, monotonic build numbers and idempotent retry govern
  publishing/withdrawal. No tenant, ledger or account records are involved.
- Standalone API and hosted Dashboard Next adapters share the same handler.
  Publisher access uses a dedicated constant-time-compared bearer and exact
  backend header. Production identities disable this Preview facility.
- Marketing `/apk` reads the same database without a publisher token. All
  responses are no-store; only validated active Expo artifact destinations are
  redirected. Non-Preview is 404; safe database failures are 503.
- Normal Android Preview EAS builds wait, verify exact provider/source identity,
  and use the shared publisher; iOS, Production and OTA do not publish APKs.
- Native installation is Preview-package-only, verifies hash/size/package/native
  version/app version/signature, and requires Android permission/confirmation.
  Launch/foreground/manual checks coordinate with OTA through one lock.
  React Native uses AbortController plus a cleared timer, never AbortSignal.timeout.
- Session storage is retained. Resume snapshots bind exact user, tenant,
  membership and target build; forms and drafts are excluded. Access gates and
  incoming deep links take precedence. Session changes during download abort
  handoff. Existing compatible binaries can use the local RNSentry identity
  reader and browser fallback; otherwise one-time APK bootstrap is needed.

## QA alignment

The existing server-owned exact-domain authorization and ordinary signed-session
entry remain authoritative. Mobile now exposes the profile chooser on More and
the personal-access gate, supports profile search, closes after switching, and
prevents duplicate submissions. Transient failures retain QA authorization;
server rejection/expiry clears it. Malformed expiry fails closed. Production
client config renders no QA panel; a Production deployment identity overrides a
conflicting Preview server flag. All roles/tenant/cache transitions remain native
to Halaalvest; no EwaTrade identities or credentials were copied.

## Evidence

Local generated migration and required `bun db:migrate` / `bun db:push` pass.
Update contract/API/registry/redirect/publisher/restoration tests, 19 isolated
actual-client scenarios, QA server permission tests, SecureStore expiry fixture,
and mobile contract checks pass. Native module compiles in a disposable Android
Dev build. See the [delivery task](../tasks/2026-10-11-preview-build-updates.md)
for final validation and remaining hosted/device gaps.

Current QA entry is domain-only across Mobile, Dashboard and Marketing. No tester credential is requested or submitted. The server exact-domain allowlist and non-Production guards authorize expiring system receipts; legacy credential APIs remain compatible.
