# ADR: Inspect the exact iOS IPA before EAS submission

Status: Accepted technical gate, 25 September 2026. No signed IPA or store upload has passed it.

## Context

The EAS submission runner already selects one finished store-distribution build by exact ID. Android also downloads its AAB and inspects release origins and identity. iOS previously reached `eas submit` after metadata inspection alone. Hermes bytecode does not reliably expose complete endpoint strings, so applying the Android literal-origin scanner to an IPA could yield a misleading pass.

## Decision

For iOS store-QA and Production submission, download the exact selected EAS IPA over public HTTPS, validating each redirect before following it. Reject missing, empty or oversized artifacts. Before invoking `eas submit`, require one root app with the reviewed bundle identifier and display name, app version and Expo runtime `1.0.0`, the reviewed Expo update URL, and the ten app-owned privacy data declarations with linked App Functionality purpose and tracking false. Log the inspected SHA-256 and remove the private temporary copy after the command. Missing or malformed archive/plist content fails closed. The standalone scanner can inspect a local candidate without submitting it.

This gate checks packaged identity and declared app-owned privacy metadata only. It does not verify Apple signing, entitlement correctness, merged SDK privacy disclosures, actual collection, runtime API/dashboard/legal origins, device behavior, or App Store Connect answers. Those require the final signed IPA, Xcode/Apple evidence and a connected signed-device network and purchase test. Do not treat a synthetic fixture or a local CLI pass as a release acceptance.
