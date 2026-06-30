# Admin Dashboard KPI Framework

## Purpose
- Define the admin dashboard content model for Halaalvest.
- Use this as the source of truth when designing or implementing `overview.summary`, dashboard tiles, reports, and admin landing pages.

## Dashboard Goal
- Help a tenant admin or finance officer decide what needs action now, whether money is safe, and where member trust or Halaal compliance may be at risk.

## First-Screen Questions
- Is the cooperative financially safe today?
- Are member contributions coming in as expected?
- Which financing, repayment, or collections items need action?
- Which member, KYC, approval, import, setup, or audit issues are blocked?
- Are Halaal-sensitive money flows and profit allocations cleanly tracked?

## Primary KPIs

### Deployable Funds
- Definition: funds available for approved cooperative use after reserves, active disbursement holds, outstanding commitments, and ring-fenced amounts are excluded.
- Why it matters: admins need a conservative number before approving financing or disbursements.
- Caveat: do not label a raw cash balance as deployable funds unless commitments and reserves have been deducted.

### Collection Coverage
- Definition: received member contributions for the active period divided by expected member contributions for the same period.
- Why it matters: contribution pacing drives liquidity, member trust, and financing capacity.
- Diagnostics:
  - expected this month
  - received this month
  - collection gap
  - paid member count
  - unpaid member count
  - failed or missing deduction-source rows when available

### Portfolio At Risk
- Definition: overdue or high-risk financing exposure divided by active outstanding financing exposure.
- Preferred shape: PAR 30, PAR 60, and PAR 90 buckets where repayment schedule data supports it.
- Why it matters: generic delinquency rate is less actionable than overdue value and aging.
- Diagnostics:
  - outstanding principal
  - overdue amount
  - due this week or month
  - escalated follow-ups
  - pending restructure, waiver, or write-off review if modeled

### Action Queue Total
- Definition: count of unresolved admin actions that require staff review.
- Why it matters: the dashboard should drive work, not merely describe state.
- Include:
  - pending membership approvals
  - KYC or document reviews
  - financing requests awaiting approval
  - disbursements awaiting release
  - overdue repayment follow-ups
  - failed imports or monthly generation issues
  - tenant setup warnings

## Secondary Sections

### Today's Admin Work
- Pending approvals.
- KYC/document review.
- Financing approvals.
- Disbursement holds.
- Overdue follow-ups.
- Failed imports.
- Setup warnings.

### Contribution Health
- Expected vs received for the active period.
- Paid and unpaid members.
- Collection gap.
- Missed payroll or deduction-source issues.
- Recent posted contributions only after exception metrics.

### Financing Risk
- Outstanding principal.
- Due this month.
- Overdue amount.
- PAR 30, PAR 60, PAR 90.
- Guarantor, approval, or documentation exceptions when modeled.

### Halaal And Compliance Watch
- Incomplete KYC.
- Missing documents.
- Audit-sensitive exceptions.
- Pending charge or fee review.
- Profit allocation pending review.
- Non-compliant income review if modeled.

### Share And Profit Position
- Share capital balance.
- Active investment/business pools.
- Profit pending allocation.
- Dividend/profit distribution status.
- Business income and expense position when tenant share-business data exists.

### Recent Activity
- Use one combined activity feed instead of separate card lists for each entity.
- Include contribution posted, repayment posted, financing approved/disbursed, member approved/suspended, charge applied/waived, document reviewed, and audit-sensitive admin actions.

## Content To Demote
- Session state.
- Routing state.
- Tenant host and workspace route.
- Runtime mode, unless it is a setup warning.
- Product areas scaffolded.
- Recent member records without risk or action context.
- Active charge setup unless a charge is missing, misconfigured, pending review, or recently changed.

## API DTO Recommendation

`overview.summary` should return grouped decision data:

```ts
{
  primaryMetrics,
  actionQueue,
  contributionHealth,
  financingRisk,
  complianceWatch,
  shareAndProfitPosition,
  recentActivity,
  setupWarnings
}
```

## UI Rules
- Use a clean, flat, Midday-style layout.
- Prefer compact border tiles and list rows over nested cards.
- Link every action count to the workspace that resolves it.
- Show setup/bootstrap only as a warning band when incomplete.
- Keep copy operational and specific, not marketing-style.

