import type {
  getTenantFinancingSettingsWorkspace,
  listInitialMigrationMemberReview,
  listLegacyLoanMigrationDrafts,
  listMemberAmountLogs,
  listMigrationProfitAdjustmentOptions,
} from "@halaalvest/db"

type FinancingSettings = Awaited<
  ReturnType<typeof getTenantFinancingSettingsWorkspace>
>
type LegacyLoanDrafts = Awaited<
  ReturnType<typeof listLegacyLoanMigrationDrafts>
>
type MemberAmountLogs = Awaited<ReturnType<typeof listMemberAmountLogs>>
type MigrationMemberReview = Awaited<
  ReturnType<typeof listInitialMigrationMemberReview>
>
type ProfitMigrationOptions = Awaited<
  ReturnType<typeof listMigrationProfitAdjustmentOptions>
>

type RawMemberActivityEvent = {
  effectiveMonth: Date
  id: string
  notes?: string | null
  reason?: string | null
  status: string
}

export function toDateString(
  value: Date | string | null | undefined
): string | null {
  if (!value) return null

  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

export function toFinancingSettingsView(settings: FinancingSettings) {
  return {
    ...settings,
    currentCyclePreview: {
      ...settings.currentCyclePreview,
      periodEnd: toDateString(settings.currentCyclePreview.periodEnd),
      periodStart: toDateString(settings.currentCyclePreview.periodStart),
    },
  }
}

export function toLegacyLoanDraftRows(drafts: LegacyLoanDrafts) {
  return drafts.map((draft) => ({
    closedAt: toDateString(draft.closedAt),
    guarantorOneMemberId: draft.guarantorOneMemberId,
    guarantorTwoMemberId: draft.guarantorTwoMemberId,
    id: draft.id,
    loanLabel: draft.loanLabel,
    memberId: draft.memberId,
    memberName: draft.member.fullName,
    memberNumber: draft.member.memberNumber,
    openedAt: draft.openedAt.toISOString().slice(0, 10),
    outstandingPrincipalBalance: draft.outstandingPrincipalBalance,
    principalAmount: draft.principalAmount,
    savingsDuringLoan: draft.savingsDuringLoan,
    scheduledMonthlyPrincipalRepayment:
      draft.scheduledMonthlyPrincipalRepayment,
  }))
}

export function toMemberOptions(
  members: Array<{ fullName: string; id: string; memberNumber: string }>
) {
  return members.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }))
}

export function toMemberAmountLogRows(rows: MemberAmountLogs) {
  return rows.map((row) => ({
    amount: row.amount,
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    id: row.id,
    notes: row.notes,
  }))
}

export function toMemberActivityEventRows(rows: RawMemberActivityEvent[]) {
  return rows.map((event) => ({
    effectiveMonth: event.effectiveMonth.toISOString().slice(0, 10),
    id: event.id,
    notes: event.notes,
    reason: event.reason,
    status:
      event.status === "inactive" ? ("inactive" as const) : ("active" as const),
  }))
}

export function toMigrationMemberReviewRows(rows: MigrationMemberReview) {
  return rows.map((row) => ({
    ...row,
    joinedAt: row.joinedAt.toISOString().slice(0, 10),
  }))
}

export function toProfitMigrationOptionRows(rows: ProfitMigrationOptions) {
  return rows.map((option) => ({
    ...option,
    profitDate: option.profitDate.toISOString().slice(0, 10),
    seasonPeriodEnd: toDateString(option.seasonPeriodEnd),
  }))
}
