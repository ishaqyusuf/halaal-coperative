# ADR: Remind existing users about current platform documents without blocking use

Status: Accepted, 28 September 2026. The owner clarified that existing signed-in users need not be blocked.

## Decision

When both current Terms and Privacy documents are approved, effective and available, an existing signed-in user whose account lacks an exact version-and-hash record for either document sees a clear reminder linking to the account acknowledgement screen. The reminder is informational: normal dashboard and mobile use, support and account-deletion access continue. A draft or unavailable bundle and a failed acceptance-history read do not produce a potentially false reminder or an access gate. The reminder clears after the current records are available. New-user launch signup still requires the approved current documents and explicit acceptance as decided in [the marketing-launch ADR](ADR-20260926-require-legal-acceptance-at-marketing-launch.md).

## Consequences

The dashboard checks the signed-in account's current record before showing a workspace banner. Mobile checks on focus of More and links to its in-app Platform documents screen. This does not publish the draft documents, assert legal consent on behalf of a user, or relax the separate legal approval and public-route release gates. Signed-device and deployed behavior remain to be verified.
