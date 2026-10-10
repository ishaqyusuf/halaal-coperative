# ADR: Pin patched Next.js for public web apps

Date: 28 September 2026
Status: Accepted for source; deployment verification open

## Context

The Bun audit groups Next findings under an aggregate range that did not reflect the individual critical advisories. Both the [AVIF image-optimization RCE](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) and the [Windows-hosted server RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36) affect Next 16.0.0 through versions below 16.3.3. Dashboard and marketing were pinned to 16.3.0. The AVIF issue is relevant to a public optimizer regardless of the Windows-specific issue's host condition.

## Decision

Pin dashboard, marketing and the tenant-url workspace's development Next dependency to 16.3.3; require `^16.3.3` for tenant-url peers. Leave `@react-email/preview-server`'s hard-pinned 16.1.7 as a development-only tool, not a public server. Leave `giget/tar@6.2.1` in its build/config-tool path pending an upstream-compatible upgrade: forcing its tar 6 dependency to tar 7 would cross a major boundary without a verified template-extraction workflow. Root tar 7.5.19 is already at the critical advisory's patched version.

## Verification and limit

The frozen lock installs; tenant-url TypeScript and fresh optimized marketing/dashboard builds pass. After correcting a stale ignored local Bun hoist link, all 32 marketing and 105 dashboard external-file traces list only Next 16.3.3. The exact-lock audit still returns 79 high/critical findings because it includes the nested development/build copies. Source builds and macOS traces do not verify a clean Linux deployment archive, server image configuration, or signed mobile artifact. Keep the dependency release gate open.
