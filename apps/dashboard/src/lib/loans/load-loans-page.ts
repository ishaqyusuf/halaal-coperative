import {
  createDbRuntime,
  getMonthlyFinancingCycleHealth,
  listLoanProducts,
  listLoanRequests,
  listLoans,
  listMembers,
} from "@halaalvest/db"
import {
  canShowQuickFill,
  getDashboardPageData,
  getDashboardServerContext,
} from "@/lib/server-context"
import { allStaffRoles, financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

type LoanNumericValue = number | string | { toString(): string }

type LoanProductOptionRow = {
  code?: string | null
  id: string
  loanType: "normal" | "quick"
  name: string
  termMonths: number
}

type LoanMemberOptionRow = {
  fullName: string
  id: string
  memberNumber: string
}

type LoanRequestRow = {
  approvals: Array<{
    action: string
    actedAt: Date
    actorUser: { fullName: string }
    id: string
    notes?: string | null
  }>
  eligibleAmountSnapshot: LoanNumericValue
  estimatedMonthlyServicing: LoanNumericValue
  extraMonthlySavingsAmount: LoanNumericValue
  guarantorApprovals: Array<{
    guarantorMember: {
      fullName: string
      memberNumber: string
    }
    id: string
    requestedAt: Date
    respondedAt?: Date | null
    respondedByUser?: { fullName: string } | null
    responseNotes?: string | null
    status: "approved" | "pending" | "rejected"
  }>
  id: string
  loanProduct: { name: string }
  member: { fullName: string }
  purpose?: string | null
  requestedAmount: LoanNumericValue
  requestedTermMonths: number
  reviewNotes?: string | null
  status: string
}

type LoanPortfolioRow = {
  estimatedMonthlyServicing: LoanNumericValue
  extraMonthlySavingsAmount: LoanNumericValue
  id: string
  loanProduct: { name: string }
  member: { fullName: string }
  outstandingPrincipal: LoanNumericValue
  principalAmount: LoanNumericValue
  status: string
  termMonths: number
}

export type LoansPageData =
  | {
      state: "unavailable"
    }
  | {
      canReview: boolean
      canSubmit: boolean
      dashboard: Awaited<ReturnType<typeof getDashboardPageData>>["dashboard"]
      financingCycle: Awaited<ReturnType<typeof getMonthlyFinancingCycleHealth>>
      loanProducts: LoanProductOptionRow[]
      loanRequests: LoanRequestRow[]
      loans: LoanPortfolioRow[]
      members: {
        items: LoanMemberOptionRow[]
      }
      quickFillEnabled: boolean
      state: "ready"
    }

export async function loadLoansPageData(): Promise<LoansPageData> {
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
    }
  }

  const [members, loanProducts, loanRequests, loans, financingCycle] =
    await Promise.all([
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listLoanProducts(context.tenant.id),
    listLoanRequests(context.tenant.id),
    listLoans(context.tenant.id),
    getMonthlyFinancingCycleHealth({ tenantId: context.tenant.id }),
  ])

  return {
    canReview: hasAnyRole(context.auth.membership?.role, financeManagementRoles),
    canSubmit: hasAnyRole(context.auth.membership?.role, allStaffRoles),
    dashboard,
    financingCycle,
    loanProducts: loanProducts as LoanProductOptionRow[],
    loanRequests: loanRequests as LoanRequestRow[],
    loans: loans as LoanPortfolioRow[],
    members,
    quickFillEnabled: canShowQuickFill(context),
    state: "ready" as const,
  }
}
