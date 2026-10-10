# ADR-030: Separate Repayment Posting From Collection Evidence

- Status: Accepted
- Date: 2026-08-30

## Context

Repayment servicing needs both financial posting and operational follow-up. Presenting both as one generic action risks treating a promise, call note, or escalation as proof that money was received. Financial writes also require stronger transaction, idempotency, expected-state, ledger, and audit guarantees than a follow-up note.

## Decision

Repayment posting and collection follow-up are separate commands, permissions, forms, success receipts, database paths, and evidence types.

- Repayment posting requires `review_financing`, live connectivity, a fresh authoritative facility state, explicit amount/date/reference/review, and a UUID command id. A Serializable transaction allocates to the earliest unpaid obligations and atomically records repayment, loan, schedule, ledger, audit, and idempotency evidence.
- Collection follow-up requires `record_collection_follow_up`. It records bounded nonfinancial stage, priority, note, next action, promise date, actor, audit, and idempotency evidence. It cannot mutate outstanding principal, schedule amounts/statuses, repayment history, or ledger values.
- Mobile labels collection evidence as nonfinancial and reports explicitly on success that outstanding principal did not change.
- Form presentation follows the shared mobile rule: compact repayment inputs use a content-aware floating bottom sheet; the longer collection composer uses a full-screen sheet with keyboard-safe scrolling. Neither uses a native popup modal.

## Consequences

- Reporting and audit consumers can distinguish cash evidence from servicing activity without inference.
- A follow-up cannot accidentally close or partially satisfy an obligation.
- Repayment retry/race behavior is independently testable from collection workflow behavior.
- Future notification or escalation automation must consume collection evidence without converting it into a financial posting.
