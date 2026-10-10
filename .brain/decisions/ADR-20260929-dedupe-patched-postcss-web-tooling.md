# ADR: Deduplicate web-tool PostCSS to the patched root copy

Date: 29 September 2026
Status: Accepted for source; clean release-artifact verification open

## Context and decision

The v112 lock selected PostCSS 8.5.23 at the root, but `@tailwindcss/postcss@4.1.18` and `shadcn@4.11.0` still selected 8.5.9. Their parent ranges (`^8.4.41` and `^8.5.6`) accept 8.5.23. Expo Metro declares `~8.4.32` and selects 8.4.49; that range does not accept the patched 8.5 line. Select the existing 8.5.23 package for the two compatible web-tool parents only, leaving Expo's copy and its release finding open. This is a lock-only update without a global PostCSS override that would cross Expo's declared range.

Bun 1.3.0 accepted narrow replacement of the two nested PostCSS entries with its existing root 8.5.23 metadata, then a normal lockfile-only install deduplicated both nested entries. Relative to v112, the final lock removes exactly `@tailwindcss/postcss/postcss@8.5.9` and `shadcn/postcss@8.5.9`; all other package and workspace entries remain. Final lock SHA-256 `e69ef808ffee03c23ecdf25a722b87322bb05cbc9d816825aeb1628eb1b5066b`. Recheck these selections after future lock regeneration.

## Verification and limits

Frozen install passes on the normalized lock. Three ignored local Bun links retained 8.5.9 and were corrected. Both web-tool parents resolve 8.5.23 and parse a representative stylesheet; Expo Metro still resolves 8.4.49. Local optimized marketing and dashboard builds, mobile TypeScript/Expo-config test, and a 3,140-module iOS JS export pass. The exact-lock audit remains **0 critical/9 high/45 moderate/6 low**, with no finding added or removed because Expo's older copy still carries the PostCSS advisory IDs. The clean accepted Linux/native artifacts, remaining highs, signed QA, draft policies and owner cloud hold remain release gates.
