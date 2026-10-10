# ADR: Pin patched fast-uri within AJV's supported major

Date: 28 September 2026
Status: Accepted for source; deployment verification open

## 29 September 2026 update

Two later high advisories affect the former 3.1.6 pin: [authority injection through an unvalidated port](https://github.com/advisories/GHSA-qw65-cvwx-89v3) and [host confusion from a malformed bracket](https://github.com/advisories/GHSA-58mr-gqgx-xq4g). Both patch at 3.1.7, still within every selected AJV 8 parent's `^3.0.1` range. The root override now pins 3.1.7. Compared with v111, only the manifest override and one lock version/integrity entry changed; lock SHA-256 `c0a356e42076fd5aa625be2292b60bedc079c009b8ae79e1bfb4ed582f05cb18`. Exact-lock audit moved from **0 critical/11 high/45 moderate/6 low** to **0 critical/9 high/45 moderate/6 low**, removing just those two IDs and adding none. Frozen install, actual AJV parent resolution, normal URI/invalid-port/malformed-bracket/valid-IPv6 fixtures, mobile TypeScript/Expo config, optimized marketing build and local iOS JS export pass. Two ignored local Bun links retained 3.1.6 after install and were corrected. Clean accepted artifacts, remaining highs, signed device QA, draft policies and the owner cloud hold remain open. The 28 September details below are historical.

## Context

The exact Bun lock selected `fast-uri@3.1.0` through AJV 8.18.0. The [malformed IPv6 SSRF advisory](https://github.com/advisories/GHSA-f65p-4m7j-42xc) and six other high advisories affect 3.1.0 and are patched in 3.1.6. AJV declares `fast-uri: ^3.0.1`; dashboard Sentry build tooling, Prisma/Trigger tooling and other workspaces carry AJV. Source search found no direct first-party `fast-uri` call. A dependency graph is not proof of a reachable server-side request path.

## Decision

Pin the transitive `fast-uri` dependency to 3.1.6 in the root Bun override. This stays inside AJV's declared major, avoids a blanket dependency update, and ensures a clean install selects the patched parser. Keep the remaining audit gate open until exact deployed API/web artifacts and caller reachability are checked.

## Verification and limit

The frozen lock installs. The installed parser rejects a malformed IPv6 host, AJV compiles a schema, API TypeScript passes, and both optimized local web builds pass. Exact-lock audit findings fall from 79 to 72 (3 critical, 69 high), with no `fast-uri` group. Two ignored local Bun symlinks initially still pointed to 3.1.0 and were corrected; future clean installs must independently verify their resolved copy. These source and macOS checks do not verify the Linux deployment archive or signed mobile app.
