# Android Preview download

The Marketing `/apk` route reads the same `MobileBuildRegistry` row as the native
updater. Set `HALAALVEST_ENV=preview` on Marketing. Conflicting Vercel Production
identity disables the route before database access. The active validated record
returns 307 and `Cache-Control: no-store`; absent/withdrawn records return 404;
unavailable or invalid records return a generic 503 with `Retry-After: 60`.

Use Halaalvest's own Preview database on both Marketing and Dashboard/API.
The configured Preview marketing origin on 11 October was
`https://halaal-vest-marketing-git-preview-ishaqyusufs-projects.vercel.app`;
its `/apk` returned 404 before this source was deployed. Do not advertise a
custom `preview.halaalvest.com` domain without verifying its ownership/routing.
No access-protection setting is changed by this implementation.

## Activation

1. Deploy the generated `preview_mobile_build_registry` migration to the isolated
   Preview database, following the repository release workflow. Local migration
   and `db:push` were applied; hosted migration is a separate release step.
2. On Dashboard/API set `APP_UPDATE_BACKEND=preview` and a newly generated private
   `APP_UPDATE_PUBLISH_TOKEN` (at least 32 characters). Use no EwaTrade secrets.
3. In root `.env.preview`, set `APP_UPDATE_API_URL` to the verified Halaalvest
   Preview Dashboard/API HTTPS origin and the matching publisher token. No
   publisher token belongs in Expo public env or Marketing.
4. Deploy Dashboard/API and Marketing. Verify anonymous check/read responses and
   the actual configured `/apk` origin. If protection blocks tester access,
   obtain approval for the exact access change; EwaTrade approvals do not apply.
5. Commit/review the intended source and use the normal command below. It retains
   existing source/account/environment guards, waits for one exact Android build,
   re-reads its ID, checks project/owner/profile/channel/commit, hashes the APK and
   publishes a monotonically versioned record. `--no-wait` is refused.

```sh
bun run eas:build --preview --platform android --expected-commit <full-sha> --non-interactive
bun app:update status --backend preview
bun app:update withdraw --backend preview --expected-revision <revision>
```

If publication fails after a successful build, the command returns a nonzero
result and a precise `bun app:update publish ...` recovery command. It never
rebuilds just to retry publication. The shared local-infra-kit publisher provides
bounded artifact transfer and exact Expo CDN redirect allowlisting.

## Installation and recovery

Only `com.halaalvest.mobile.preview` on the Preview update channel can discover
and install APKs. Native package identity is authoritative after OTA. One new
binary embeds the module; older compatible runtimes use their existing local
RNSentry identity reader and browser APK handoff, or need one-time `/apk`
bootstrap if that reader/updater is absent.

Users choose Download & install, grant Android source permission when needed,
and confirm Android's installer. Private-cache downloads verify byte count,
SHA-256, package, native version code, app version, and installed signing
certificate. The registry is rechecked immediately before handoff; replacement,
withdrawal and account/membership changes fail closed. Cancellation permits retry.

In-place same-signature upgrades preserve Android app data, including ordinary
session and QA SecureStore records. Route snapshots contain no tokens or drafts:
they bind user, tenant and active membership to the exact target build, expire in
24 hours and restore only approved browsing routes after normal access checks.
Incoming deep links take priority. Compatible OTA and native operations share a
lock; a registry outage does not block automatic compatible OTA discovery.

## Acceptance still required before rollout completion

Verify a signed Preview-to-Preview upgrade with the real Halaalvest release key,
retained synthetic QA session and role, permission handoff, cancel/retry, final
installation, cold launch and route/deep-link behavior. Also verify actual
publication/replacement/withdrawal through the deployed `/apk` origin. Local
client mocks or a development APK are not signed Preview installation evidence.

## Domain-only QA entry

Deploy the generated `20261011113609_qa_domain_entry_receipts` migration with the registry migration. Configure exact QA domains in `EMAIL_QA_DOMAIN_ROUTES`, `QA_ACCELERATOR_ENABLED=true`, and a private `QA_ACCELERATOR_SECRET` of at least 32 characters on the non-Production API. Current Mobile, Dashboard and Marketing ask only for QA Domain. No tester credential is needed. Domains must have active QA memberships; Production stays disabled. Existing credential APIs remain compatible with older clients.
