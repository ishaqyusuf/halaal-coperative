# ADR — Fail closed on production uploads until private storage is ready

Status: superseded in transport detail by [private direct evidence uploads](ADR-20260924-private-direct-evidence-uploads.md). The fail-closed decision remains in effect while `DASHBOARD_PRIVATE_BLOB_ENABLED=0`.

Date: 24 September 2026
Status: Accepted as an interim launch safety gate; persistent storage implementation pending.

## Context

Dashboard member documents, opening-balance sources, payment proofs and support attachments use a local file plus JSON sidecar under `.local/uploads`. A successful POST returns a URL even though no durable object store is configured for the planned Vercel deployment. The former 10 MB UI/server allowance also exceeded Vercel's 4.5 MB Function request-body limit. Turbopack traces the whole project because the local adapter reads dynamic file paths.

## Decision

Refuse filesystem upload and download in production or Vercel runtimes with HTTP 503. Keep local development uploads available at a shared 4 MiB client/server limit. Do not suppress the tracing warning as evidence of persistence. Use an approved private object store with tenant/purpose authorization and documented retention before enabling production uploads; the candidate path is in [`../runbooks/private-upload-storage-readiness.md`](../runbooks/private-upload-storage-readiness.md).

## Consequences

Production users cannot attach new evidence through these controls until the private provider is approved, configured and tested. They receive an explicit unavailable response instead of a misleading saved URL. A later 10 MB allowance requires direct browser-to-private-store transfer, not a larger Function request. Existing local files are not migrated or declared production-durable by this change.
