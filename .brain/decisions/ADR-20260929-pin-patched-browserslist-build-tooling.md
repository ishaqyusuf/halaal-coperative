# ADR: Pin patched Browserslist for shared build tooling

Date: 29 September 2026
Status: Accepted for source; clean release-artifact verification open

## Context and decision

The lock selected `browserslist@4.28.2` for Expo Metro, Babel, webpack and related build tools. Two high advisories affect versions through 4.28.6: [unbounded result-cache growth](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) and [prototype write/crash from hostile custom statistics](https://github.com/advisories/GHSA-73wf-gq98-2v4g). The [upstream 4.28.7 release](https://github.com/browserslist/browserslist/releases/tag/4.28.7) includes the fixes. Every selected parent accepts the patched 4.x version. Add a root Bun override for `browserslist:4.28.7`; do not collapse unrelated brace-expansion or js-yaml major lines into one version.

## Verification and limits

Bun 1.3.0 refreshed the lock itself. Compared with the preceding v108 lock, the only changes are the override, the Browserslist entry, two required browser-data child entries, and compatible updates to `electron-to-chromium` and `node-releases`; workspace sections and previous overrides are unchanged. Lock SHA-256 `d7fd2f7a6a71c51db802d04ac6861294fd423190153a76847c1252e95ade0638` audits at **0 critical/25 high/47 moderate/6 low**, removing only the two Browserslist highs. Frozen install passed. Thirteen ignored Bun links still pointed to 4.28.2 after install and were corrected locally; the current Expo Metro parent resolves 4.28.7. Normal defaults and maintained-Node queries, mobile TypeScript, focused Expo-config test, optimized local marketing build and a 3,140-module local iOS JS export pass.

This supports a shared build-tool patch, not proof of every caller or a clean signed artifact. The owner cloud hold, remaining high groups, accepted native/Linux artifacts, provider/device QA and draft-policy gates remain open.
