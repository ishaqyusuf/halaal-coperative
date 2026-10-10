# Mobile pilot release and rollback

Status: implementation preparation only, 2026-09-07. **Not a release approval.**
Tests, device execution, provider activation, publication and cutover have not
been authorized for the current implementation-first phase.

## Release record

Before a release owner can approve a candidate, record all of these in one
versioned release evidence directory. Empty fields are blockers, not defaults.

| Required record | Current disposition |
| --- | --- |
| Release owner, incident lead, finance reviewer, privacy/storage owner | Unassigned; owner must name accountable people |
| Commit and clean candidate patch, API/DB version, dependency lock | Not frozen |
| Android artifact ID, package/version, SHA-256, signing owner | No candidate built in this phase |
| Expo runtime/update IDs and channel; previous compatible known-good build | Must be captured from the actual artifacts |
| Billing provider, exact NGN prices/setup/add-ons/tax handling, webhook ownership | Ticket 16 decision and implementation open |
| Private storage region, access/scanning/retention/deletion/backup ownership | Ticket 18 decision and implementation open |
| Sentry project, release, owner, alerts and privacy-approved event receipt | Operational verification open; never put secrets in this record |
| Android test matrix, per-screen screenshots, real command and cleanup receipts | Tickets 29–32 deferred |
| Cooperative cohort, informed limitations, support route and escalation contacts | Owner approval required |

## Implementation and platform boundaries

- Mobile sign-in is cooperative number plus password. Recovery stays in the
  public auth gate; account provisioning is authorized staff/web work. There
  is no mobile Activate membership feature.
- SaaS subscription billing is separate from member contributions, repayments,
  share capital, levies and cooperative ledgers. A plan request is not payment.
- Checkout returns trigger signed server reads. Neither a URL parameter nor
  opening/closing a provider page is proof of payment or entitlement activation.
- Existing proof-link fields are not secure native uploads. Do not announce
  camera/file upload availability until Ticket 18 is implemented and accepted.
- Offline mode is cached reads and scoped drafts, never queued financial posting.
- Current device acceptance direction is Android first. iOS is not certified
  by an Android pass or a responsive HTML preview.

## Future testing sequence — do not execute in this phase

1. Run the scoped type/contract/regression checks, including newly authored
   checkout URL, release URL and Sentry policy cases. Fix failures first.
2. Build an isolated Android development candidate with the correct API/env.
   Record identifiers and checksum; do not reuse a production database for QA.
3. Use ordinary `@ishaq.qa.test` sessions. Cover every route and owned sheet,
   populated/empty/error/offline/stale/denied states, each input's keyboard,
   day/month/year swipes, nested Back, light/dark and large text/TalkBack.
4. Run the real-contract journeys. Record authoritative before/after state,
   exact retry/duplicate behavior, signed tenant/role denial, and cleanup receipts.
5. Complete the native integration matrix, release-mode performance budgets,
   private source-map verification and controlled diagnostic smoke checks.
6. Freeze a preview candidate and repeat critical journeys/upgrade/rollback.
   No deployment or pilot credit follows merely from building an APK.

## Staged rollout

Stages are internal operators → explicitly approved cooperative pilot → broader
rollout. Advancing a stage requires the release owner's written sign-off,
reviewed evidence, no unresolved money-safety/tenant-isolation blocker and an
identified previous known-good compatible release. Cohort sizes and observation
windows must be agreed by the owner; this document does not invent approval.

Stop immediately for a tenant/role data leak, duplicated/lost money command,
incorrect entitlement transition, exposed private evidence, secret/PII telemetry,
crash loop, forced-update loop, or inaccessible critical form/confirmation.
Preserve the candidate, support references and audit IDs; do not copy private
payloads into the public incident record.

## Rollback procedure

1. Incident lead stops promotion and records candidate/runtime/update IDs,
   affected cohort, failure classification and last known-good release.
2. Suspend the affected provider workflow through its approved operational
   control. Do not disable authentication, remove tenant guards, delete invoices,
   or undo cooperative ledgers to hide a symptom.
3. Release owner selects the recorded compatible known-good Expo update/build.
   Use the repository-owned EAS runner/update script with explicit environment,
   account, channel and runtime. Inspect those inputs before publishing; no
   unqualified latest-update or cross-runtime rollback is permitted.
4. For native/runtime incompatibility, use an approved replacement build. An OTA
   update cannot supply a missing native camera, file-picker or other module.
5. Finance reviewer reconciles command receipts, provider references and ledger
   evidence. Resolve money corrections through audited business commands; never
   restore a whole database over newer valid financial events.
6. Resume only after the failure is fixed, the affected tests rerun, the prior
   release remains recoverable and the owner signs the incident closure.

## Operator/member release-note checklist

- [ ] Describe only accepted plan, billing, invoice and capacity behavior.
- [ ] Explain offline read/draft limits and confirmation before money posting.
- [ ] Explain supported file types/access/retention only after Ticket 18 acceptance.
- [ ] Identify supported Android versions/build and recovery/update guidance.
- [ ] Provide ordinary support and private escalation paths with named owners.
- [ ] List deliberate web-first boundaries and known limitations explicitly.

## Go/no-go

Current decision: **NO-GO for production/pilot cutover**. Provider integration,
private evidence, deferred tests, candidate artifacts and owner decisions remain
open. Documentation preparation does not close Ticket 33 acceptance.
