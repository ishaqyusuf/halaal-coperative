# ADR: Pin patched Nano ID for the mobile router runtime

Date: 29 September 2026
Status: Accepted for source; signed-artifact verification open

## Context

The exact Bun lock selected `nanoid@3.3.11` below Expo Router 6.0.24, React Navigation 7 and Gorhom Portal, and `3.3.17` at the root. The mobile entrypoint imports Expo Router and React Navigation. The [zero-size custom-generator advisory](https://github.com/advisories/GHSA-2v37-7h3g-55p8) identifies `3.3.18` as the patched 3.x version; the lock also reported two older Nano ID high advisories. Package selection establishes mobile-bundle presence, not that this app passes an attacker-controlled generator size.

## Decision

Pin `nanoid` to `3.3.18` in the root Bun overrides. All selected parents declare compatible 3.x ranges, including Expo Router `^3.3.8`, React Navigation `^3.3.11`, Gorhom Portal `^3.3.1`, PostCSS `^3.3.16`, and Trigger core's exact `3.3.18`. This is a supported in-major runtime patch. Keep the whole-lock zero-critical gate and signed-artifact verification open.

## Verification and limits

The refreshed lock SHA-256 is `996ab2c343429b1342e430dfda9dc14812fdcbe71e82bce353607df0d346381b`. `bun install --frozen-lockfile` and direct mobile TypeScript pass. A local production-variant iOS Expo export with unreachable `.invalid` API/dashboard origins bundled 3,140 modules into a 9,906,931-byte Hermes file (SHA-256 `27586f29dc17732e93224c07e2212bcb2da22caa9411835b821dd632e9aed2ce`). Its diagnostic source map lists the selected mobile Nano ID module as `nanoid@3.3.18/non-secure/index.js`. The exact-lock audit changed from 1 critical/57 high to 1 critical/54 high and has no Nano ID group. The critical `giget/tar@6.2.1` remains.

The lock refresh also synchronized already-modified workspace manifests on shared `main`; its broad diff is not solely attributable to Nano ID. A forced local install left nine ignored Bun symlinks pointing to the old Nano ID copy, so those links were corrected before the export. Future clean release installs and signed Apple/Google artifacts need independent module/version checks. No cloud build, deployment, upload, policy publication or store submission occurred.
