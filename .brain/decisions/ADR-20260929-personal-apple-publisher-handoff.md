# ADR — Fail closed until a personal-team iOS publisher identity is reviewed

Date: 29 September 2026
Status: Superseded by [the confirmed Zeroes Organization publisher decision](ADR-20260929-zeroes-organization-ios-release-identity.md).

This ADR records the temporary personal-team hold before the owner confirmed the Organization team on 29 September. Its pending-identity instructions are historical and must not be applied to the current source.

## Context

The owner selected their personal Apple team for the public iOS release. Source still pinned the earlier Zeroes Organization Team ID `ZXC78SPCV4`, App Store Connect app ID `6815838235`, and bundle `com.halaalvest.mobile` in the iOS submit profiles, Expo production config, IPA inspector and Apple transaction verifier. That draft company-team record is historical preparation, not the owner's selected release target. Reusing its submit profile could direct a signed build to the wrong publisher. The Android Play package `com.halaalvest.mobile`, and iOS/Android development and Preview identities, are separate and remain unchanged.

## Decision

The checked-in `packages/domain/src/modules/ios-release-identity.ts` is the source of the future personal-team iOS identity. It is deliberately `pending` with no Team ID, bundle ID or App Store Connect app ID. It cannot silently fall back to the company IDs. The production Expo iOS config omits a bundle ID while pending and validates the central record if marked approved. Both EAS iOS submit profiles have had their company IDs removed. The scoped EAS runner checks a completed, non-company personal identity and matching Team ID/App Store app ID in **both** profiles before authentication for store-QA or Production iOS builds and submissions. Android builds/submissions are unaffected. Direct use of EAS outside this repository runner is not covered by the runner guard; no direct CLI release should be used.

The exact IPA inspector compares its root bundle to the approved personal identity; the Apple server verifier uses the same bundle and rejects `APPLE_APP_ID` unless it equals that approved App Store Connect app ID. Pending identity leaves new Apple verification unavailable rather than granting access against the former company app. The API response shape, role permissions, Google verifier and Android package do not change.

## Handoff fields and checks

Obtain from the owner/account record: (1) the **personal Apple Developer Team ID**, (2) the exact iOS bundle identifier registered under that team or a verified completed transfer, and (3) the matching **App Store Connect numeric app ID**. Enter all three in the central record, mark it `approved`, and pin the Team ID and app ID in both `apps/mobile/eas.json` iOS submit profiles. Set the server's `APPLE_APP_ID` to that same app ID. Recheck App ID capabilities, push/APNs, subscriptions and product identifiers, App Store Server API and notification access, signing certificate/provisioning, agreements, classification, exact signed IPA metadata, and personal-team eligibility before any approved build or upload. The prior company record and its subscription drafts are not evidence of products or sale readiness on the personal record. Any publisher or bundle transfer decision needs separate console evidence.

The owner cloud hold remains in force. This source work created no personal-team record, credential, build, upload, OTA update, deployment or submission. It also does not decide Apple policy eligibility for a financial app.

## Account-access checkpoint — 29 September 2026

The coordinating App Store Connect inspection reports that the currently signed-in Apple ID shows only ZEROES AND ONE TECH HUB NIG LIMITED in its team selector; the intended personal team is not accessible from that session. The owner has been asked whether a different Apple ID holds the personal team or whether to revise the publisher choice. Until that answer and an exact accessible account record exist, keep the identity `pending` and do not populate IDs, sign, build, upload or submit. This checkpoint does not reverse the owner’s earlier personal-team choice.
