# ADR: Validate tar 7 beneath giget 1 for release tooling

Date: 29 September 2026
Status: Accepted for source after local compatibility checks; clean release artifact verification open

## Context

The exact Bun lock still selected `giget@1.2.5` → `tar@6.2.1` through Trigger CLI's `c12@1.11.2`, despite a patched root tar 7. The [node-tar decompression advisory](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) marked tar versions through 7.5.18 critical. A later [member-selection recursion advisory](https://github.com/advisories/GHSA-r292-9mhp-454m) marks versions through 7.5.20 high and identifies 7.5.21 as patched. `giget` declares `tar:^6.2.1`; no published tar 6 patch exists, so a root 7.5.21 override crosses its declared major range. This is an exceptional integration decision, not an upstream-supported version relationship.

## Decision

Pin `tar` to `7.5.21` in root Bun overrides after checking giget's actual archive-extraction API and the HalaalVest Trigger/Expo paths. The override also stays within the other selected tar 7 parents' ranges. Keep remote or untrusted template sources out of release config. Revalidate the giget integration and actual clean installed resolution whenever giget, c12, Trigger, Bun or tar changes. The earlier no-override triage and ADR comments describe the state before this compatibility check; this decision supersedes that blocker for local source only.

## Verification and limits

The lock SHA-256 is `8c686764d7dd6a74a1120f458b75f14f3bc49c4dc71fe44cba3f399ea1595086`. Relative to the immediately preceding Nano ID lock, no workspace section changed. The nested `giget/tar@6.2.1` entry and its eight other now-unused tar-6-only dependency entries were removed; root tar moved from 7.5.19 to 7.5.21. A frozen Bun install passes. The exact installed giget 1.2.5 module resolves tar 7.5.21 after correcting ten stale ignored local Bun links. Localhost-only giget fixtures extracted benign subdirectory files correctly and wrote nothing outside the destination for `../` traversal and symlink-then-file archives; the malicious symlink was not retained. These fixtures cover the exercised archive shapes, not every crafted tar or all upstream giget behavior.

Trigger CLI `--version` returned 4.5.16, the local jobs Trigger config imported, jobs TypeScript passed, and a local Bun jobs-task bundle included 943 modules. A production-variant iOS Expo JS export with unreachable `.invalid` service origins completed at 3,140 modules. The exact-lock audit changed from **1 critical/54 high** to **0 critical/46 high**, removing only the tar advisory group (1 critical, 8 high, 3 moderate) and adding none. `git diff --check` passed. Zero critical is now a local whole-lock result, not a claim about a clean Linux install, an accepted Trigger/deployment archive, a signed mobile artifact or provider/device QA. No cloud build, deployment, upload, OTA, policy publication or store submission occurred under the owner hold.
