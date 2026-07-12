# 05 - Enforce Procurement Active Obligation Limits

**What to build:** A cooperative can limit each member to a configured number of unpaid active procurement obligations, preventing another request when the member must finish the current one first.

**Blocked by:** 04 - Gate Procurement By Operation Profile.

**Status:** done

- [x] Procurement request submission checks the configured maximum active obligations per member.
- [x] Purchased or active procurement with unpaid repayment schedules counts against the cap.
- [x] Submitted, under-review, rejected, cancelled, completed, and approved-but-not-purchased procurement do not count as active obligations for this cap.
- [x] Requests are blocked with a clear operational error when the member has reached the active obligation cap.
- [x] Staff and member request flows both enforce the same cap.
- [x] Tests cover cap enforcement, non-counted statuses, and tenant isolation.
