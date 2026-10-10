# Local iOS signing inventory after v123 — 29 September 2026

## Question and result

Can the owner-confirmed Zeroes Organization identity sign a local HalaalVest Preview iOS app and close the earlier Expo SecureStore Keychain startup failure without creating credentials or invoking cloud services? **No, not with the locally accessible signing material.** This was a read-only inspection of the active macOS keychain and standard local provisioning-profile paths. It did not request an Apple login, open a private key, create a certificate/profile, sign an app or start a build.

`security find-identity -p codesigning` reported **0 identities and 0 valid identities** in the active keychain search list. `security find-identity -v -p codesigning` independently reported **0 valid identities**. Both standard locations, `~/Library/MobileDevice/Provisioning Profiles` and `~/Library/Developer/Xcode/UserData/Provisioning Profiles`, are absent and contain **0 local `.mobileprovision` files**. This does not prove no certificate/profile exists in Apple’s portal or an EAS remote credential store; neither was queried under the owner cloud hold. Xcode 27.0 is installed.

The disposable v118 generated Preview project uses bundle `com.halaalvest.mobile.preview` and `CODE_SIGN_ENTITLEMENTS=HalaalVestPreview/HalaalVestPreview.entitlements` in Debug and Release. That file contains only `aps-environment=development`; the project file has no `DEVELOPMENT_TEAM` assignment. The prior [unsigned simulator build](halaalvest-v118-ios-preview-simulator.md) compiled and packaged the privacy manifest but its process had no `application-identifier` or `keychain-access-groups` entitlements. Expo SecureStore returned Keychain `-34018`, so it never reached a healthy app screen. A generated entitlement file by itself does not confer the signed entitlements.

## Exact next inputs

For a properly signed **local simulator** check, an authorized Apple Development code-signing certificate **with its matching private key** for Organization Team `ZXC78SPCV4` must be accessible to Xcode; the Preview target must select that team and produce an app signature carrying the appropriate application identifier and Keychain access group for `com.halaalvest.mobile.preview`. A simulator build cannot establish TestFlight/device signing or StoreKit transaction behavior.

For a **physical device** Preview build, additionally verify/register the distinct Preview App ID `com.halaalvest.mobile.preview` under that team, its Push Notifications capability if used, and a matching iOS App Development provisioning profile covering the selected Apple Development certificate and device UDID. No such local profile was found; the portal state of the Preview App ID/profile is unverified. A later public/TestFlight HalaalVest candidate instead uses `com.halaalvest.mobile` and needs a matching Organization Apple Distribution identity and distribution profile plus the separate release gates. The current check does not establish any of those credentials.

The existing booted iPhone 17 Pro simulator `9209F941-FEAD-44FE-A513-A86C21405DC2` was not touched; no new simulator was created. The Zeroes release identity, source lock and [v123 recovery packet](/private/tmp/halaalvest-release-source-main-20260929-v123/manifest.json) were not modified. The owner cloud build/deploy/OTA/submission hold remains active.
