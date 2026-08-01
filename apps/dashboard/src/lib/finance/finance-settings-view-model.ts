import type {
  TenantSharePolicySettings,
  getTenantFinancingSettingsWorkspace,
  listInitialMigrationMemberReview,
  listLegacyLoanMigrationDrafts,
  listMemberAmountLogs,
  listMembers,
  listMigrationProfitAdjustmentOptions,
} from "@halaalvest/db"

type FinancingSettings = Awaited<
  ReturnType<typeof getTenantFinancingSettingsWorkspace>
>
type LegacyLoanDrafts = Awaited<
  ReturnType<typeof listLegacyLoanMigrationDrafts>
>
type MemberList = Awaited<ReturnType<typeof listMembers>>
type MemberAmountLogs = Awaited<ReturnType<typeof listMemberAmountLogs>>
type MigrationMemberReview = Awaited<
  ReturnType<typeof listInitialMigrationMemberReview>
>
type ProfitMigrationOptions = Awaited<
  ReturnType<typeof listMigrationProfitAdjustmentOptions>
>

type RawFinanceSetup = {
  chargeDefinitions: Array<{
    chargeFrequency?:
      | "recurring_monthly"
      | "per_contribution"
      | "one_time"
      | "manual"
      | null
    chargeValueType?: "fixed_amount" | "percentage" | null
    code: string
    id: string
    isActive: boolean
    kind: string
    name: string
    versions: Array<{
      amount: unknown
      chargeValueType?: "fixed_amount" | "percentage" | null
      effectiveFrom: Date
      id: string
      kind?: string | null
      notes?: string | null
    }>
  }>
  shareBusinesses: Array<{
    capitalAmount: unknown
    endDate?: Date | string | null
    id: string
    linkedDividendPeriod?: {
      id: string
      name: string
      status: string
    } | null
    name: string
    notes?: string | null
    profitAmount: unknown
    profitEntries?: Array<{
      allocatableProfitAmount?: unknown
      allocations?: Array<{
        allocatedProfitAmount: unknown
        status: string
      }>
      expenseAmount?: unknown
      id: string
      linkedDividendPeriod?: {
        id: string
        name: string
        status: string
      } | null
      notes?: string | null
      profitAmount: unknown
      profitDate: Date
      reason?: string | null
      sourceType: string
      status?: string | null
    }>
    startDate: Date
    status: string
  }>
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: Array<{
    amount: unknown
    basis?: "after_charge_deductions" | null
    effectiveFrom: Date
    id: string
    notes?: string | null
    valueType?: "fixed_amount" | "percentage" | null
  }>
  tenant?: {
    startDate?: Date | string | null
  } | null
}

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

export function toFinanceSetupViewModel(
  data: RawFinanceSetup,
  today = new Date()
) {
  return {
    chargeDefinitions: data.chargeDefinitions.map((charge) => {
      const currentVersion =
        [...charge.versions]
          .reverse()
          .find(
            (version) =>
              new Date(version.effectiveFrom).getTime() <= today.getTime()
          ) ?? null

      return {
        chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
        chargeValueType:
          charge.chargeValueType ??
          (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
        code: charge.code,
        id: charge.id,
        isActive: charge.isActive,
        kind: charge.kind,
        name: charge.name,
        versions: charge.versions.map((version) => ({
          amount: Number(version.amount),
          chargeValueType:
            version.chargeValueType ??
            (version.kind === "percentage" ? "percentage" : "fixed_amount"),
          effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
          id: version.id,
          notes: version.notes,
          status:
            currentVersion?.id === version.id
              ? ("current" as const)
              : new Date(version.effectiveFrom).getTime() > today.getTime()
                ? ("scheduled" as const)
                : ("historical" as const),
        })),
      }
    }),
    shareBusinesses: data.shareBusinesses.map((business) => ({
      capitalAmount: Number(business.capitalAmount),
      endDate: toDateString(business.endDate),
      id: business.id,
      linkedDividendPeriod: business.linkedDividendPeriod
        ? {
            id: business.linkedDividendPeriod.id,
            name: business.linkedDividendPeriod.name,
            status: business.linkedDividendPeriod.status,
          }
        : null,
      name: business.name,
      notes: business.notes,
      profitAmount: Number(business.profitAmount),
      profitEntries: (business.profitEntries ?? []).map((entry) => ({
        allocatableProfitAmount: Number(
          entry.allocatableProfitAmount ?? entry.profitAmount
        ),
        allocatedProfitAmount: (entry.allocations ?? []).reduce(
          (sum, allocation) => sum + Number(allocation.allocatedProfitAmount),
          0
        ),
        allocationCount: entry.allocations?.length ?? 0,
        expenseAmount: Number(entry.expenseAmount ?? 0),
        hasPublishedAllocations: (entry.allocations ?? []).some(
          (allocation) => allocation.status === "published"
        ),
        id: entry.id,
        linkedDividendPeriod: entry.linkedDividendPeriod
          ? {
              id: entry.linkedDividendPeriod.id,
              name: entry.linkedDividendPeriod.name,
              status: entry.linkedDividendPeriod.status,
            }
          : null,
        notes: entry.notes,
        profitAmount: Number(entry.profitAmount),
        profitDate: entry.profitDate.toISOString().slice(0, 10),
        reason: entry.reason,
        sourceType: entry.sourceType,
        status: entry.status ?? "draft",
      })),
      startDate: business.startDate.toISOString().slice(0, 10),
      status: business.status,
    })),
    sharePolicy: data.sharePolicy,
    shareStructureVersions: data.shareStructureVersions.map((version) => ({
      amount: Number(version.amount),
      basis: version.basis ?? "after_charge_deductions",
      effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
      id: version.id,
      notes: version.notes,
      valueType: version.valueType ?? "fixed_amount",
    })),
    tenantStartDate: toDateString(data.tenant?.startDate),
  }
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

export function toMemberOptions(members: MemberList["items"]) {
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
