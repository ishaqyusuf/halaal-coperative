export interface LoanPolicy {
  eligibilityMultiple: number
  quickLoanTermMonths: number
  normalLoanTermMonths: number
}

export interface DashboardSnapshot {
  tenantName: string
  memberCount: number
  activeLoans: number
  availablePool: number
  reserveBuffer: number
  monthlyContributionTarget: number
  collectionCoverage: number
  delinquencyRate: number
}

export const sampleLoanPolicy: LoanPolicy = {
  eligibilityMultiple: 2,
  quickLoanTermMonths: 3,
  normalLoanTermMonths: 18,
}

export const productAreas = [
  {
    title: "Tenant onboarding",
    description:
      "Register cooperatives, define member categories, and establish staff permissions per tenant.",
  },
  {
    title: "Contributions and levies",
    description:
      "Track recurring contributions, indirect deposits, and monthly cooperative levies with audit history.",
  },
  {
    title: "Loan governance",
    description:
      "Separate loan eligibility from liquidity-based availability so approvals stay transparent and auditable.",
  },
  {
    title: "Office operations",
    description:
      "Support finance officers with transaction visibility, follow-up lists, and branch-ready workflows.",
  },
] as const

export const sampleDashboardSnapshot: DashboardSnapshot = {
  tenantName: "Amanah Staff Thrift Cooperative",
  memberCount: 428,
  activeLoans: 61,
  availablePool: 3_700_000,
  reserveBuffer: 450_000,
  monthlyContributionTarget: 1_280_000,
  collectionCoverage: 0.94,
  delinquencyRate: 0.06,
}

export function calculateBorrowingCapacity(totalSavings: number, multiple = 2) {
  return totalSavings * multiple
}

export function calculateAvailablePool(input: {
  totalContributions: number
  committedFunds: number
  reserveBuffer: number
}) {
  return Math.max(
    0,
    input.totalContributions - input.committedFunds - input.reserveBuffer
  )
}
