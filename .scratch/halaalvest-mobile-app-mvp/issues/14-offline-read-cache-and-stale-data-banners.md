# 14 — Offline Read Cache And Stale Data Banners

**What to build:** Member and admin read screens can show cached server DTOs with generated or stale timestamps when connectivity is intermittent, while money-affecting actions still require online confirmation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Member and admin read screens show cached data with a visible stale timestamp when fresh server data is unavailable.
- [ ] Money-affecting submissions, approvals, postings, role changes, and review decisions stay blocked until the app has online server confirmation.
