# 08 - Gate Payment Receipt Categories By Operation Profile

**What to build:** Receipt forms show only categories valid for the cooperative's services, while still allowing settlement of existing procurement and Foodstuff Purchase obligations.

**Blocked by:** 04 - Gate Procurement By Operation Profile; 06 - Gate Foodstuff Purchase By Operation Profile.

**Status:** completed

- [x] Payment receipt category options are derived from Operation Profile settings and the member's existing payable obligations.
- [x] Procurement allocation appears only when procurement is enabled/readable or when active unpaid procurement schedules exist.
- [x] Foodstuff Purchase allocation appears only when Foodstuff Purchase is enabled/readable or when approved unpaid applications exist.
- [x] Receipt allocation cannot create new service obligations.
- [x] Staff and member receipt forms use the same category availability rules.
- [x] Tests cover category filtering and continued settlement of existing obligations after new requests are closed.
