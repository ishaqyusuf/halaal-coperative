import {
  buildBackfillDraft,
  groupRowsByEffectiveDateSegment,
  projectBackfillDraftToMemberLedgerRows,
  type EffectiveDateSegment,
  type MemberLedgerBackfillRow,
} from "@halaalvest/backfill"
import {
  buildBackfillDraftInputForMember,
  createDbRuntime,
  getInitialMigrationMemberReview,
  getMemberById,
  getTenantInitialMigrationState,
  listLegacyLoanMigrationDrafts,
  listMemberActivityEvents,
  listMemberAmountLogs,
  listMemberOpeningBalances,
  listMembers,
  listMigrationProfitAdjustmentOptions,
} from "@halaalvest/db"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

type BackfillMember = NonNullable<Awaited<ReturnType<typeof getMemberById>>>
type LegacyLoanDraft = Awaited<
  ReturnType<typeof listLegacyLoanMigrationDrafts>
>[number]
type MemberActivityEvent = Awaited<
  ReturnType<typeof listMemberActivityEvents>
>[number]
type MemberAmountLog = Awaited<ReturnType<typeof listMemberAmountLogs>>[number]
type MemberOpeningBalance = Awaited<
  ReturnType<typeof listMemberOpeningBalances>
>[number]
type ProfitAdjustmentOption = Awaited<
  ReturnType<typeof listMigrationProfitAdjustmentOptions>
>[number]

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

function toMonthString(value: Date | string | null | undefined) {
  return toDateString(value)?.slice(0, 7) ?? null
}

function serializeLegacyLoanDraft(draft: LegacyLoanDraft) {
  return {
    closedAt: toDateString(draft.closedAt),
    guarantorOneMemberId: draft.guarantorOneMemberId,
    guarantorTwoMemberId: draft.guarantorTwoMemberId,
    id: draft.id,
    loanLabel: draft.loanLabel,
    memberId: draft.memberId,
    memberName: draft.member.fullName,
    memberNumber: draft.member.memberNumber,
    notes: draft.notes,
    openedAt: toDateString(draft.openedAt) ?? "",
    outstandingPrincipalBalance: draft.outstandingPrincipalBalance,
    principalAmount: draft.principalAmount,
    savingsDuringLoan: draft.savingsDuringLoan,
    scheduledMonthlyPrincipalRepayment: draft.scheduledMonthlyPrincipalRepayment,
  }
}

function serializeMemberActivityEvent(event: MemberActivityEvent) {
  return {
    effectiveMonth: toMonthString(event.effectiveMonth) ?? "",
    id: event.id,
    notes: event.notes,
    reason: event.reason,
    status: event.status === "inactive" ? "inactive" : "active",
  }
}

function serializeMemberAmountLog(row: MemberAmountLog) {
  return {
    amount: row.amount,
    effectiveFrom: toDateString(row.effectiveFrom) ?? "",
    id: row.id,
    notes: row.notes,
  }
}

function serializeMemberOpeningBalance(row: MemberOpeningBalance) {
  return {
    activeFinancingOutstanding: row.activeFinancingOutstanding,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    appliedByUserId: row.appliedByUserId,
    appliedLoanId: row.appliedLoanId,
    appliedProcurementRequestId: row.appliedProcurementRequestId,
    commitmentSavingsBalance: row.commitmentSavingsBalance,
    createdAt: row.createdAt.toISOString(),
    createdByUserId: row.createdByUserId,
    id: row.id,
    memberId: row.memberId,
    notes: row.notes,
    openingDate: toDateString(row.openingDate) ?? "",
    procurementOutstanding: row.procurementOutstanding,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: row.reviewedByUserId,
    reviewNotes: row.reviewNotes,
    reversalNotes: row.reversalNotes,
    shareCapitalBalance: row.shareCapitalBalance,
    shareUnits: row.shareUnits,
    sourceDocumentName: row.sourceDocumentName,
    sourceDocumentUrl: row.sourceDocumentUrl,
    specialSavingsBalance: row.specialSavingsBalance,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  }
}

function serializeProfitAdjustmentOption(option: ProfitAdjustmentOption) {
  return {
    ...option,
    profitDate: toDateString(option.profitDate) ?? "",
    seasonPeriodStart: toDateString(option.seasonPeriodStart),
    seasonPeriodEnd: toDateString(option.seasonPeriodEnd),
  }
}

function serializeMember(member: BackfillMember) {
  const activePlan =
    member.contributionPlans.find((plan) => plan.isActive) ??
    member.contributionPlans[0] ??
    null

  return {
    address: member.address,
    email: member.email,
    fullName: member.fullName,
    id: member.id,
    joinedAt: toDateString(member.joinedAt) ?? "",
    memberNumber: member.memberNumber,
    memberType: member.memberType,
    occupation: member.occupation,
    phoneNumber: member.phoneNumber,
    status: member.status,
    activeCommitmentAmount: activePlan ? Number(activePlan.amount) : null,
    activeCommitmentStartsAt: activePlan
      ? toDateString(activePlan.startsAt)
      : null,
  }
}

export async function loadMemberBackfillWorkflowData(memberId: string) {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
    }
  }

  const tenantId = context.tenant.id
  const [
    member,
    migrationState,
    review,
    amountLogs,
    activityEvents,
    allLegacyLoanDrafts,
    openingBalances,
    profitOptions,
    memberOptions,
  ] = await Promise.all([
    getMemberById(tenantId, memberId),
    getTenantInitialMigrationState(tenantId),
    getInitialMigrationMemberReview({ memberId, tenantId }),
    listMemberAmountLogs({ memberId, tenantId }),
    listMemberActivityEvents({ memberId, tenantId }),
    listLegacyLoanMigrationDrafts(tenantId),
    listMemberOpeningBalances({ memberId, tenantId }),
    listMigrationProfitAdjustmentOptions(tenantId, undefined, memberId),
    listMembers(tenantId, { page: 1, pageSize: 200 }),
  ])

  if (!member || !review) {
    return {
      state: "not-found" as const,
    }
  }

  let generatedLedgerError: string | null = null
  let generatedLedgerRows: MemberLedgerBackfillRow[] = []
  let generatedLedgerSegments: EffectiveDateSegment[] = []

  try {
    const draftInput = await buildBackfillDraftInputForMember({
      memberId,
      tenantId,
    })
    generatedLedgerRows = projectBackfillDraftToMemberLedgerRows(
      buildBackfillDraft(draftInput)
    )
    generatedLedgerSegments = groupRowsByEffectiveDateSegment(
      generatedLedgerRows
    )
  } catch (error) {
    generatedLedgerError =
      error instanceof Error
        ? error.message
        : "Could not generate the member ledger preview."
  }

  return {
    state: "ready" as const,
    canEditBackfill: hasAnyRole(
      context.auth.membership?.role,
      financeManagementRoles
    ),
    generatedLedgerError,
    generatedLedgerRows,
    generatedLedgerSegments,
    legacyLoanDrafts: allLegacyLoanDrafts
      .filter((draft) => draft.memberId === memberId)
      .map(serializeLegacyLoanDraft),
    member: serializeMember(member),
    memberActivityEvents: activityEvents.map(serializeMemberActivityEvent),
    memberAmountLogs: amountLogs.map(serializeMemberAmountLog),
    memberOpeningBalances: openingBalances.map(serializeMemberOpeningBalance),
    memberNumberPrefix: context.tenant.memberNumberPrefix,
    memberOptions: memberOptions.items.map((option) => ({
      id: option.id,
      label: `${option.fullName} (${option.memberNumber})`,
    })),
    migrationSnapshot: migrationState.snapshot,
    profitMigrationOptions: profitOptions.map(serializeProfitAdjustmentOption),
    quickFillEnabled: canShowQuickFill(context),
    review: {
      ...review,
      joinedAt: toDateString(review.joinedAt) ?? "",
    },
    tenantStartDate: toDateString(context.tenant.startDate),
  }
}
