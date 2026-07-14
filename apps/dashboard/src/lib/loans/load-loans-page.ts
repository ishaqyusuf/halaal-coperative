import {
  createDbRuntime,
  getMonthlyFinancingCycleHealth,
  getMemberByUserId,
  listChargeDefinitions,
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
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

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

type LoanRequestChargeOptionRow = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
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
  member: { fullName: string; id: string; memberNumber: string }
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
  member: { fullName: string; id: string; memberNumber: string }
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
      loanRequestCharges: LoanRequestChargeOptionRow[]
      loanRequests: LoanRequestRow[]
      loans: LoanPortfolioRow[]
      members: {
        items: LoanMemberOptionRow[]
      }
      isMemberView: boolean
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
  const role = context.auth.membership?.role
  const isMemberView = role === "member"
  const actorMember =
    isMemberView && context.auth.user
      ? await getMemberByUserId({
          tenantId: context.tenant.id,
          userId: context.auth.user.id,
        })
      : null

  const [
    members,
    loanProducts,
    loanRequests,
    loans,
    financingCycle,
    chargeDefinitions,
  ] = await Promise.all([
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listLoanProducts(context.tenant.id),
    listLoanRequests(context.tenant.id),
    listLoans(context.tenant.id),
    getMonthlyFinancingCycleHealth({ tenantId: context.tenant.id }),
    listChargeDefinitions(context.tenant.id),
  ])
  const loanRequestCharges = (chargeDefinitions as any[])
    .map((definition) => {
      const applicability = definition.applicability?.find(
        (row: any) =>
          row.isActive !== false &&
          row.workflow === "loan_request" &&
          row.trigger === "submission"
      )
      const legacyApplies =
        definition.appliesToLoanRequests || definition.purpose === "loan_fee"

      if (!applicability && !legacyApplies) {
        return null
      }

      const version = definition.versions?.[0]
      if (!version) {
        return null
      }

      return {
        amount: Number(version.amount ?? definition.amount ?? 0),
        chargeValueType:
          version.chargeValueType ??
          (version.kind === "percentage" ? "percentage" : "fixed_amount"),
        code: definition.code,
        collectionMode: applicability?.collectionMode ?? "deduct_from_savings",
        id: definition.id,
        name: definition.name,
      } satisfies LoanRequestChargeOptionRow
    })
    .filter((charge): charge is LoanRequestChargeOptionRow => Boolean(charge))
  const visibleMembers =
    isMemberView && actorMember
      ? {
          items: [
            {
              fullName: actorMember.fullName,
              id: actorMember.id,
              memberNumber: actorMember.memberNumber,
            },
          ],
        }
      : members
  const visibleLoanRequests =
    isMemberView && actorMember
      ? (loanRequests as LoanRequestRow[]).filter(
          (request) => request.member.id === actorMember.id
        )
      : (loanRequests as LoanRequestRow[])
  const visibleLoans =
    isMemberView && actorMember
      ? (loans as LoanPortfolioRow[]).filter(
          (loan) => loan.member.id === actorMember.id
        )
      : (loans as LoanPortfolioRow[])

  return {
    canReview: hasAnyRole(
      context.auth.membership?.role,
      financeManagementRoles
    ),
    canSubmit: hasAnyRole(role, allStaffRoles) || Boolean(actorMember),
    dashboard,
    financingCycle,
    loanProducts: loanProducts as LoanProductOptionRow[],
    loanRequestCharges,
    loanRequests: visibleLoanRequests,
    loans: visibleLoans,
    members: visibleMembers,
    isMemberView,
    quickFillEnabled: canShowQuickFill(context),
    state: "ready" as const,
  }
}
