import {
  createDbRuntime,
  getMonthlyFinancingCycleHealth,
  getMemberByUserId,
  getMemberOperationalReadiness,
  listChargeDefinitions,
  listLoanProducts,
  listMembersTable,
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
  operationalReadiness?: { isReady: boolean } | null
}

type LoanRequestChargeOptionRow = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
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
      members: {
        items: LoanMemberOptionRow[]
      }
      isMemberView: boolean
      quickFillEnabled: boolean
      submissionBlockedReason: string | null
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

  const actorReadiness = actorMember
    ? await getMemberOperationalReadiness({
        memberId: actorMember.id,
        tenantId: context.tenant.id,
      })
    : null

  const [members, loanProducts, financingCycle, chargeDefinitions] =
    await Promise.all([
      isMemberView
        ? Promise.resolve({ data: [] as LoanMemberOptionRow[] })
        : listMembersTable(context.tenant.id, { pageSize: 100 }),
      listLoanProducts(context.tenant.id),
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
  const visibleMembers = isMemberView
    ? {
        items: actorMember
          ? [
              {
                fullName: actorMember.fullName,
                id: actorMember.id,
                memberNumber: actorMember.memberNumber,
                operationalReadiness: actorReadiness,
              },
            ]
          : [],
      }
    : {
        items: (members.data as LoanMemberOptionRow[]).filter(
          (member) => member.operationalReadiness?.isReady
        ),
      }
  const submissionBlockedReason = !isMemberView
    ? null
    : !actorMember
      ? "Link your signed-in account to a member profile before requesting financing."
      : !actorReadiness?.isReady
        ? "Complete member verification and migration setup before requesting financing."
        : null

  return {
    canReview: hasAnyRole(
      context.auth.membership?.role,
      financeManagementRoles
    ),
    canSubmit:
      hasAnyRole(role, allStaffRoles) ||
      Boolean(actorMember && actorReadiness?.isReady),
    dashboard,
    financingCycle,
    loanProducts: loanProducts as LoanProductOptionRow[],
    loanRequestCharges,
    members: visibleMembers,
    isMemberView,
    quickFillEnabled: canShowQuickFill(context),
    submissionBlockedReason,
    state: "ready" as const,
  }
}
