# ADR — Use the verified Zeroes Organization iOS release identity

Date: 29 September 2026
Status: Accepted for source configuration; cloud release held.

## Context

The owner confirmed ZEROES AND ONE TECH HUB NIG LIMITED as the Apple team for both public iOS releases. The signed-in App Store Connect session exposes that Organization team. For HalaalVest, the previously verified draft record has Apple Developer Team ID `ZXC78SPCV4`, registered bundle identifier `com.halaalvest.mobile`, and App Store Connect app ID `6815838235`. The interim personal-team handoff is superseded; its account-access finding remains historical context, not an active release blocker. The owner has not lifted the cloud build/deploy/OTA/submission hold.

## Decision

Keep those three values together in `packages/domain/src/modules/ios-release-identity.ts` with `publisher: organization` and `status: approved`. Validation rejects a pending/personal record or any mismatch with the verified Zeroes HalaalVest record. Production Expo config uses its bundle; development and Preview bundle/package identities and the Android Production package remain unchanged. Both `store-qa` and `production` EAS iOS submission profiles pin the same Team ID and App Store app ID. The scoped EAS runner checks both profiles against the central record before authentication for iOS store-QA/Production builds and submissions. It does not initiate a cloud action on its own. Use the scoped runner for any eventual release command; direct EAS CLI bypasses this repository guard.

The exact iOS IPA inspector compares the root bundle with the central approved ID. The Apple server verifier uses that bundle and requires private `APPLE_APP_ID` to equal `6815838235`; a mismatch fails before Apple root-certificate or signing-key handling. The API response shape, Google verification, Android package and cooperative role permissions do not change.

## Remaining evidence

The existing App Store Connect draft is the intended HalaalVest release record again, but account visibility and matching source fields are not signing or sale readiness. Before a permitted build or upload, verify the exact Organization signing certificate and provisioning profile, App ID push capability, products and Nigerian prices on this app, agreements/tax/banking, financial-service classification, effective public policies, server Apple credentials and notifications, and the signed candidate IPA/runtime on device. The sibling public iOS release needs its own verified bundle and ASC app record; this ADR pins only HalaalVest values. No cloud build, upload, OTA, deployment or submission was performed for this correction.
