# ADR: Pin patched Socket.IO parser in the release lockfile

Date: 28 September 2026
Status: Accepted in source; deployed behavior unverified

## Context

The previous dependency audit identified `socket.io-parser` 4.2.6 in the workspace lockfile. The [published advisory](https://github.com/advisories/GHSA-2m8v-j782-fhvr) lists versions before 4.2.7 as affected by attachment-buffer memory exhaustion and 4.2.7 as patched. The Trigger.dev and email-preview dependency paths request `~4.2.4`, which accepts 4.2.7.

## Decision

Pin `socket.io-parser` to 4.2.7 through the root Bun override so a future install cannot select 4.2.6 while those parent packages remain on their current ranges. Remove the override once parent dependencies and an audited lockfile resolve a patched parser on their own.

## Validation and limits

`bun install --frozen-lockfile` passes and the lockfile resolves `socket.io-parser@4.2.7` with no 4.2.6 entry. Jobs and email TypeScript checks pass; 20 associated tests pass with 66 assertions. The advisory endpoint for a full fresh `bun audit` still returns `ConnectionRefused`, so this is a version-range fix for one finding, not a clean audit or runtime exploit test. No cloud jobs or web deployment was started under the owner's hold.
