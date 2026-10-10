# ADR — Stage account-deletion fulfilment

Date: 24 September 2026
Status: Accepted for local implementation; production deployment remains gated.

## Context

HalaalVest accepts authenticated and email-verified account-deletion requests, but a cooperative account can be linked to shared financial/audit records and administrative roles. A single “delete” action cannot truthfully represent identity verification, login revocation, financial retention, processor erasure and completion contact. The existing internal revocation query was not available to operators, and anonymising the user email would otherwise remove the only known completion-contact route.

## Decision

Keep distinct request states. A platform owner first records identity and scope verification. A separate explicit action then documents administrator handover and retention review, enforces last-administrator/platform-owner safeguards, revokes authentication/device/push access, anonymises login identifiers and moves the request to `processing`. Database-backed signed-session user lookups exclude soft-deleted users so an already-issued web cookie cannot continue to authorize the account. The pre-anonymisation account email is held as restricted processing evidence for the later completion notice. This action returns `erasureComplete: false`; shared financial records and processor outcomes remain pending. No fixed retention period or completed-erasure claim is invented.

Because one user login can have multiple cooperative memberships, a verified platform operator now reads the complete current membership scope before revocation and acknowledges each membership's ID, cooperative and role. The serializable revocation transaction re-reads all memberships and requires that exact reviewed set, including roles, before removing the global login. A membership added, removed or changed after review blocks revocation and requires a fresh review. This is an account-scope safeguard, not authority to erase shared cooperative records or a substitute for identity verification.

The request notice version is derived from the exact in-app notice copy and complete public deletion-policy source as a SHA-256 content fingerprint. Both authenticated and external email-verified request paths validate against that current version; an outdated client must refresh before submitting. Existing request records keep their original version. The fingerprint binds the request text across surfaces but does not establish owner/legal approval, policy publication or completed fulfilment. The generated public-policy review packet includes the in-app text and version for review.

The public email-verification confirmation displays that same in-app scope and consequences before consent. Otherwise its stored version would cover text the public requester never saw. The separate external-link and verification explanations remain in the public deletion-policy object and are included in the same fingerprint.

## Consequences

Operators can perform a real access-revocation step without falsely closing the request. The stored contact is sensitive and needs an approved purpose limit, access control, deletion/retention rule and tested notification path before completion. Future erasure work must classify records by obligation, erase eligible personal data, document retained records, reconcile processors, notify the account holder and then clear or restrict the temporary contact. Production use waits for credential rotation, hosting, policy approval and end-to-end tests.
