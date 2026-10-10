# Logly generic business attribution

Status: Source implementation complete and parent-agent review accepted; deployment acceptance pending.

- [x] Add generic business group and account references from verified tenant/session context.
- [x] Add capture-time signed context for dashboard/public tenant navigation and native profile lifecycle.
- [x] Validate proxy signatures/project/capture time and strip untrusted identifiers.
- [x] Preserve existing origin/collection/platform gates and sensitive metadata projection.
- [x] Expose browser/native custom event APIs with permitted metadata and verified audience/group precedence.
- [x] Cover capture snapshots, scope changes, logout reset, pseudonymous keys, tampering and public tenant attribution with focused tests.
- [x] Parent independent review and combined contract acceptance.
- [ ] Provision attribution secret only through the authorized release process after collector rollout.
- [ ] Verify actual dashboard/native events and per-business filters in deployed Logly.
- [ ] Separate future milestone: tenant-authorized merchant analytics reporting API/UI.

Validation: `bun test packages/events/src apps/api/src/routers/mobile-auth.route.test.ts` passes 40 tests / 177 assertions. Events, API, Dashboard, Marketing and Mobile TypeScript checks pass. Scoped `git diff --check` passes. Independent SDK-agent review identified and prompted fixes for UTF-8 batch limits, same-scope native queue renewal, expiry retry and changed browser privacy signals; regression tests cover all four. The reviewer re-reviewed and found no remaining critical finding; parent review additionally requested the now-implemented custom-event APIs and consistent audience metadata. The final same-page expiry renewal helper regression passes (8 assertions), the events package typecheck passes, and parent review accepted its timer/retry/disposal lifecycle. No UI appearance changed; visual testing is not applicable. No Prisma/database change, migration or deployment performed.
