# 01 - Lock Canonical QA Data And Calculations

**What to build:** A complete source-of-truth QA data sheet for the Minna Trust onboarding scenario, so every later QA slice uses the same dates, balances, schedules, expected amounts, and rounding rules.

**Blocked by:** None - can start immediately.

**Status:** done

**Implemented in:** [CANONICAL-DATA.md](../CANONICAL-DATA.md)

- [x] All relative dates are converted to absolute dates using July 13, 2026 as the reference date.
- [x] Cooperative setup choices are listed, including brought-forward mode, mixed commitment collection, procurement, Foodstuff Purchase, unit shares, and loan policy.
- [x] Admin member balances are defined for commitment savings, special savings, shares, active loan, active procurement, and Foodstuff Purchase.
- [x] Expected monthly servicing amounts, outstanding balances, paid months, and rounding rules are documented for the NGN 1,600,000 loan.
- [x] Expected procurement and Foodstuff Purchase repayment schedules are documented.
- [x] Second-member seed data is proposed or linked for later QA slices.
