# Preview native builds share one delivery registry

Accepted — 11 October 2026.

Use a dedicated global Prisma `MobileBuildRegistry` rather than tenant settings
for internal Android Preview release metadata. Marketing `/apk` and the app
checker consume the same revisioned record. The existing root EAS runner calls
the shared local-infra-kit publisher only after validating the exact finished
Halaalvest build and source. Delivery metadata is not release-assurance evidence.

Halaalvest's hosted API lives in Dashboard: explicit Next route adapters and the
standalone API share one Hono handler. Production environment identity overrides
Preview configuration. Neither account/tenant roles nor client flags authorize
publication. A separate token/backend pair owns writes.

The Preview-only native module verifies local APK bytes and installed signing
identity before Android's permission/installer handoff. OTA remains compatible
and serialized with native work. Resume snapshots bind user/tenant/membership and
never contain auth material or financial drafts. Existing auth, paid-access and
role gates retain authority after restart. QA access remains server-governed and
available from signed-in settings and access recovery without granting access.
