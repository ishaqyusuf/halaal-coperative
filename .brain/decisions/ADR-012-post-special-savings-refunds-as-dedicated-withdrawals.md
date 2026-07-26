# ADR-012: Post Special-Savings Refunds As Dedicated Withdrawals

## Status

Accepted

## Context

A member may ask the cooperative to return an excess payment that was allocated to special savings. Reversing the source contribution is incorrect when that contribution also contains commitment savings, while merely resolving the support case does not prove that money left the cooperative.

## Decision

Post an approved special-savings refund as one tenant- and member-scoped `MemberSpecialSavingsWithdrawal`, linked one-to-one to the originating support case and to its balanced ledger transaction.

The posting requires a money-impact support case, an explicit financial-adjustment requirement, approved finance review, a linked member, sufficient posted special savings, a payment date, and an external payment reference. It debits Member Savings, credits Cash / Bank, decrements the member savings snapshot, writes audit evidence, and resolves the support case atomically.

Financial-adjustment approval remains governance evidence only. No balance changes occur until finance explicitly posts the withdrawal.

## Consequences

- Mixed commitment and special-savings receipts can be refunded partially without reversing valid commitment savings.
- Every supported refund has durable payment, ledger, processor, member, case, and audit evidence.
- A support case can produce at most one special-savings withdrawal.
- Opening special savings and posted contribution special savings count toward availability; previous withdrawals reduce it.
- Other financial corrections still require their own product-specific posting workflows.
