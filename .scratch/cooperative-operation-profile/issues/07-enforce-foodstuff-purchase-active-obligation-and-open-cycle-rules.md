# 07 - Enforce Foodstuff Purchase Active Obligation And Open-Cycle Rules

**What to build:** Foodstuff Purchase applications respect open-cycle requirements, payback caps, and maximum unpaid approved obligations per member.

**Blocked by:** 06 - Gate Foodstuff Purchase By Operation Profile.

**Status:** completed

- [x] Foodstuff Purchase applications require an open cycle when the tenant setting requires it.
- [x] Approved unpaid Foodstuff Purchase applications count against the active obligation cap.
- [x] Submitted, under-review, rejected, and cancelled applications do not count against the active obligation cap.
- [x] Applications are blocked with a clear operational error when the member has reached the active obligation cap.
- [x] Receipt settlement remains possible for approved unpaid applications even when new applications are closed.
- [x] Tests cover open-cycle enforcement, active obligation caps, non-counted statuses, and tenant isolation.
