import {
  countPendingGuarantorRequests,
  createDbRuntime,
  getFinancingIntakeStatus,
  getMemberByUserId,
  getMemberOperationalReadiness,
  getMonthlyFinancingCycleHealth,
  listChargeDefinitions,
  listLoanProducts,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import {
  getLoanIntakeFix,
  type LoanIntakeFix,
} from "@/lib/loans/loan-intake-fix"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

type IntakeStatus = "closed" | "missing" | "open" | "paused"

type LoanProductRow = {
  code?: string | null
  id: string
  loanType: "normal" | "quick"
  name: string
  termMonths: number
}

type LoanRequestChargeOptionRow = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

/** Staff only: how much the cooperative can lend now. */
export type LoanLendingCapacity = {
  approvedHoldAmount: number
  canLendNow: number
  normalLeft: number
  quickLeft: number
  warnings: string[]
}

export type LoansPageData =
  | { state: "unavailable" }
  | {
      availablePool: number
      canReview: boolean
      canSubmit: boolean
      capacity: LoanLendingCapacity | null
      fixedMember?: { id: string; label: string }
      /** Link to Finance settings when intake is blocked; finance managers only. */
      intakeFix: LoanIntakeFix | null
      intakeStatus: IntakeStatus
      isMemberView: boolean
      loanProducts: Array<{ id: string; label: string; termMonths: number }>
      loanRequestCharges: LoanRequestChargeOptionRow[]
      /** Member only: guarantor requests waiting for their answer. */
      pendingGuarantorCount: number
      quickFillEnabled: boolean
      /** Why this person cannot ask for a loan now, in plain words. */
      requestBlockedReason: string | null
      state: "ready"
    }

const intakeBlockedWords: Record<Exclude<IntakeStatus, "open">, string> = {
  closed: "Loan requests are closed for this month.",
  missing: "Loan requests are not open for this month yet.",
  paused: "Loan requests are paused for now.",
}

/** Plain words for the cycle warnings worth showing beside capacity. */
const capacityWarningWords: Record<string, string | undefined> = {
  collections_below_projected:
    "Less money came in this month than members promised.",
  normal_quota_closed: "No money left for normal loans this month.",
  quick_quota_closed: "No money left for quick loans this month.",
}

function toLoanRequestCharges(
  chargeDefinitions: unknown[]
): LoanRequestChargeOptionRow[] {
  return (chargeDefinitions as any[])
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
}

/**
 * `/loans` server data. Staff get lending capacity; members get only whether
 * they can ask now and how many guarantor requests wait for them. Member and
 * guarantor pickers search on demand (`members.options`), so no member list
 * is loaded here.
 */
export async function loadLoansPageData(): Promise<LoansPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" }
  }

  const tenantId = context.tenant.id
  const role = context.auth.membership?.role
  const isMemberView = role === "member"
  const isStaff = hasAnyRole(role, allStaffRoles)
  const canReview = hasAnyRole(role, financeManagementRoles)
  const actorMember =
    isMemberView && context.auth.user
      ? await getMemberByUserId({ tenantId, userId: context.auth.user.id })
      : null

  const [
    actorReadiness,
    loanProducts,
    cycleHealth,
    memberIntakeStatus,
    chargeDefinitions,
    pendingGuarantorCount,
  ] = await Promise.all([
    actorMember
      ? getMemberOperationalReadiness({ memberId: actorMember.id, tenantId })
      : Promise.resolve(null),
    listLoanProducts(tenantId) as Promise<LoanProductRow[]>,
    isMemberView
      ? Promise.resolve(null)
      : getMonthlyFinancingCycleHealth({ tenantId }),
    isMemberView ? getFinancingIntakeStatus({ tenantId }) : Promise.resolve(null),
    isStaff || actorMember ? listChargeDefinitions(tenantId) : Promise.resolve([]),
    actorMember
      ? countPendingGuarantorRequests({
          guarantorMemberId: actorMember.id,
          tenantId,
        })
      : Promise.resolve(0),
  ])

  const intakeStatus: IntakeStatus =
    cycleHealth?.intakeStatus ?? memberIntakeStatus ?? "missing"
  const memberBlockedReason = !isMemberView
    ? null
    : !actorMember
      ? "Your account is not linked to a member yet. Please contact the cooperative."
      : !actorReadiness?.isReady
        ? "You can ask for a loan once the cooperative has checked your details."
        : null
  const requestBlockedReason =
    memberBlockedReason ??
    (intakeStatus === "open" ? null : intakeBlockedWords[intakeStatus])
  const usage = cycleHealth
    ? { normal: cycleHealth.normal, quick: cycleHealth.quick }
    : null

  return {
    availablePool: cycleHealth?.deployableFunds.deployableFunds ?? 0,
    canReview,
    canSubmit: isStaff || Boolean(actorMember && actorReadiness?.isReady),
    capacity: cycleHealth
      ? {
          approvedHoldAmount: cycleHealth.deployableFunds.approvedHoldAmount,
          canLendNow: cycleHealth.deployableFunds.deployableFunds,
          normalLeft: cycleHealth.normal.remainingAmount,
          quickLeft: cycleHealth.quick.remainingAmount,
          // The intake banner already says when requests are closed.
          warnings: cycleHealth.warnings
            .map((warning) => capacityWarningWords[warning.key])
            .filter((warning): warning is string => Boolean(warning)),
        }
      : null,
    fixedMember: actorMember
      ? {
          id: actorMember.id,
          label: `${actorMember.fullName} (${actorMember.memberNumber})`,
        }
      : undefined,
    intakeFix: getLoanIntakeFix({
      canManageFinance: canReview && !isMemberView,
      intakeStatus,
      productCount: loanProducts.length,
    }),
    intakeStatus,
    isMemberView,
    loanProducts: loanProducts.map((product) => ({
      id: product.id,
      label: usage
        ? `${product.name} · up to ${product.termMonths} months · ${formatCurrency(usage[product.loanType].remainingAmount)} left`
        : `${product.name} · up to ${product.termMonths} months`,
      termMonths: product.termMonths,
    })),
    loanRequestCharges: toLoanRequestCharges(chargeDefinitions as unknown[]),
    pendingGuarantorCount,
    quickFillEnabled: canShowQuickFill(context),
    requestBlockedReason,
    state: "ready",
  }
}
