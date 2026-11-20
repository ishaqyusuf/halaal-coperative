import {
  countPendingGuarantorRequests,
  createDbRuntime,
  getFinancingIntakeStatus,
  getMonthlyFinancingCycleHealth,
  hasRequestableLoanProducts,
  isMemberOperationallyReady,
} from "@halaalvest/db"
import {
  getLoanIntakeFix,
  type LoanIntakeFix,
} from "@/lib/loans/loan-intake-fix"
import { findRequestMemberByUserId } from "@/lib/request-lookups"
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
      ? // Request-cached: the tRPC prefetches reuse this lookup.
        await findRequestMemberByUserId({
          tenantId,
          userId: context.auth.user.id,
        })
      : null

  const [actorIsReady, cycleHealth, memberIntakeStatus, pendingGuarantorCount] =
    await Promise.all([
      actorMember
        ? isMemberOperationallyReady({ member: actorMember, tenantId })
        : Promise.resolve(false),
      isMemberView
        ? Promise.resolve(null)
        : getMonthlyFinancingCycleHealth({ tenantId }),
      isMemberView
        ? getFinancingIntakeStatus({ tenantId })
        : Promise.resolve(null),
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
      : !actorIsReady
        ? "You can ask for a loan once the cooperative has checked your details."
        : null
  const requestBlockedReason =
    memberBlockedReason ??
    (intakeStatus === "open" ? null : intakeBlockedWords[intakeStatus])
  const intakeFix =
    canReview && !isMemberView && intakeStatus !== "open"
      ? getLoanIntakeFix({
          canManageFinance: true,
          intakeStatus,
          productCount: Number(await hasRequestableLoanProducts(tenantId)),
        })
      : null

  return {
    availablePool: cycleHealth?.deployableFunds.deployableFunds ?? 0,
    canReview,
    canSubmit: isStaff || Boolean(actorMember && actorIsReady),
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
    intakeFix,
    intakeStatus,
    isMemberView,
    pendingGuarantorCount,
    quickFillEnabled: canShowQuickFill(context),
    requestBlockedReason,
    state: "ready",
  }
}
