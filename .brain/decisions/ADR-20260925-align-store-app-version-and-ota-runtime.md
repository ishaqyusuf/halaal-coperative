# ADR: Align the first store app version and OTA runtime

Status: Accepted source policy, 25 September 2026. No current-source signed store candidate exists.

## Context

The production mobile source used version and Expo runtime `0.2.0`, while the initial App Store Connect iOS draft showed version `1.0`. Apple associates an uploaded build with its bundle version and version record. Expo delivers OTA updates only to compatible runtime versions. A stale binary version would therefore complicate first-release selection, and a runtime change can strand older validation binaries on their existing update stream.

## Decision

The production app identity, including store-QA and Production EAS profiles, resolves user-facing app version and Expo runtime to `1.0.0`. Development and Preview identities remain on `0.2.0` for their separate internal channels. One source constant supplies both version and runtime. The exact iOS IPA and Android AAB source inspectors reject store artifacts carrying a different version or runtime.

Follow-up, 26 September: the two constants now live in `apps/mobile/release-version.js`, a plain JavaScript module that Expo's Node config evaluator can load. `release-version.ts` reexports that single source for TypeScript artifact checks. An extensionless import of the old TypeScript file made `expo config` and `eas env:list` fail before contacting Expo; an explicit `.ts` import worked only on the local Node 25 runtime and was not retained as a cloud-worker assumption. The new Node config regression evaluates development and production validation identities directly.

The App Store Connect iOS draft was changed from `1.0` to `1.0.0` and reload-verified under the Zeroes Organization on 25 September 2026. Before upload, confirm that saved version record still exactly matches the signed IPA's `CFBundleShortVersionString`, and inspect the finished binary. The remote iOS build number and Android versionCode remain separately managed by EAS. Do not publish a `1.0.0` OTA update until a compatible signed candidate has passed device and backend QA.

## Consequences

Existing `0.2.0` validation binaries cannot receive `1.0.0` runtime updates; they are not release candidates. Store-QA and Production use separate update channels but share the reviewed native runtime version. A later native-code change must advance the runtime with its compatible build. This source policy does not establish signing, live endpoints, StoreKit/Play Billing, or console acceptance.

Sources: [Apple build association](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds), [Apple bundle version format](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring), and [Expo runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).
