# ADR: Patch both selected js-yaml major lines

Date: 29 September 2026
Status: Accepted for source; clean release-artifact verification open

## Context and decision

The lock selected `js-yaml@3.15.0` for `@istanbuljs/load-nyc-config` (`^3.13.1`) and `4.1.1` for Expo xcpretty, ESLint configuration and cosmiconfig (`^4.1.0`/`^4.1.1`). The current [incomplete merge-limit advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh) patches at 3.15.2 and 4.3.2; those versions also clear the other currently reported js-yaml findings. Keep the separate major lines and select those same-major patches in the lock, without a global one-version override.

Only the two existing `bun.lock` js-yaml version/integrity entries changed from v110, using exact Bun-generated metadata from a disposable two-version probe. No manifest or workspace entry changed. Frozen install passed; a normal lockfile-only install preserved the lock byte for byte. As with the prior brace patch, re-audit after future lock regeneration because no manifest override pins these exact patches.

## Verification and limits

Lock SHA-256 `9114797e586ebc8d7388be549d583443645eb33860df46edb4294c29e4f49956` audits at **0 critical/11 high/45 moderate/6 low**, down from 0 critical/16 high/46 moderate/6 low. All six js-yaml advisory IDs disappeared and none was added. Five ignored local Bun links still resolved old copies after install and were corrected. The installed Istanbul 3.x and Expo/ESLint/cosmiconfig 4.x parents resolve the patched copies; both APIs round-trip representative nested YAML and parse a bounded 50-link alias/merge chain. Mobile TypeScript, focused Expo-config test, app-config lint, optimized local marketing build and 3,140-module iOS JS export pass.

This validates local source/tool behavior, not every untrusted YAML caller or the accepted clean native/Linux artifact. The owner cloud hold, remaining highs, signed mobile/store QA and draft-policy gates remain open.
