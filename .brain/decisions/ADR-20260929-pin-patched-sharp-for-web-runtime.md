# ADR: Pin patched sharp for the web image runtime

Date: 29 September 2026
Status: Accepted for source; deployment verification open

## Context

The exact Bun lock selected `sharp@0.35.3` through Next 16.3.3's optional `sharp:^0.35.3` dependency. The current marketing and dashboard production-build traces include that package and its native binary. The [sharp/libheif advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) affects versions before 0.35.4 when processing untrusted image input and identifies 0.35.4 as patched. This is a plausible web runtime path through Next image optimization, although the local trace does not prove that an attacker can submit a malicious AVIF/HEIF image to the deployed app. The remaining whole-lock critical finding is nested `giget/tar@6.2.1`, whose observed use is remote-template/build tooling rather than the traced web runtime; forcing tar 7 across giget's declared tar 6 major is not a supported substitute.

## Decision

Pin `sharp` to `0.35.4` in the root Bun `overrides`. This satisfies Next's declared `^0.35.3` range and updates the selected native/libvips packages without changing Next or application image behavior. Keep the dependency gate open for the nested tar critical, other high findings and accepted Linux artifact verification.

## Verification and limits

The lock SHA-256 is `f72395d2a25373bd928b23b698660c81c274f6324e0b5b278bc96b44a6b3a5e3`; `bun install --frozen-lockfile` passes. The installed patched package reports sharp `0.35.4`, libheif `1.23.2` and libvips `8.18.6`. Exact-lock audit changes from 1 critical/58 high to 1 critical/57 high, with no `sharp` advisory group. Both local optimized web builds pass. Their fresh Next external-file traces contain `sharp@0.35.4` and no `sharp@0.35.3` references (32 marketing and 105 dashboard trace files).

Bun's ignored local hoist links initially still pointed to `0.35.3` after the lock update. Five local links (the shared sharp/native/libvips links and two Next 16.3.3 sharp links) were corrected before the final trace rebuild; this is local install hygiene, not a tracked source change. A clean Linux deployment install must independently confirm the patched binary and libheif version. No cloud build, deployment or submission occurred under the owner's hold.
