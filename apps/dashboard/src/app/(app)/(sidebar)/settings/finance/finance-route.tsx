import {
  buildBackfillDraft,
  projectBackfillDraftToMemberLedgerRows,
} from "@halaalvest/backfill"
import {
  buildBackfillDraftInputForMember,
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantFinancingSettingsWorkspace,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
  listLegacyLoanMigrationDrafts,
  listMigrationProfitAdjustmentOptions,
  listMemberActivityEvents,
  listMemberAmountLogs,
  listMembers,
} from "@halaalvest/db"
import { TenantFinancePageView } from "@/components/tenant-finance-page-view"
import type { TenantFinanceSection } from "@/components/tenant-finance-page-view"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null

  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

const demoShareVersions = [
  {
    id: "share-1",
    effectiveFrom: "2024-01-01",
    amount: 10000,
    basis: "after_charge_deductions" as const,
    notes: "Initial cooperative default share",
    valueType: "fixed_amount" as const,
  },
  {
    id: "share-2",
    effectiveFrom: "2025-01-01",
    amount: 10,
    basis: "after_charge_deductions" as const,
    notes: "Changed to percentage after annual review",
    valueType: "percentage" as const,
  },
]

const demoChargeDefinitions = [
  {
    id: "charge-1",
    chargeFrequency: "recurring_monthly" as const,
    chargeValueType: "fixed_amount" as const,
    code: "ADM",
    name: "Administrative fee",
    kind: "fixed",
    isActive: true,
    versions: [
      {
        id: "charge-1-v1",
        effectiveFrom: "2024-01-01",
        amount: 1500,
        chargeValueType: "fixed_amount" as const,
        notes: "Initial amount",
        status: "historical" as const,
      },
      {
        id: "charge-1-v2",
        effectiveFrom: "2025-02-01",
        amount: 2000,
        chargeValueType: "fixed_amount" as const,
        notes: "Updated amount",
        status: "current" as const,
      },
    ],
  },
  {
    id: "charge-2",
    chargeFrequency: "recurring_monthly" as const,
    chargeValueType: "fixed_amount" as const,
    code: "LEVY",
    name: "Monthly levy",
    kind: "fixed",
    isActive: true,
    versions: [
      {
        id: "charge-2-v1",
        effectiveFrom: "2024-01-01",
        amount: 1000,
        chargeValueType: "fixed_amount" as const,
        notes: "Default levy",
        status: "current" as const,
      },
    ],
  },
]

const demoShareBusinesses = [
  {
    id: "business-1",
    capitalAmount: 500000,
    endDate: "2024-04-30",
    linkedDividendPeriod: {
      id: "period-1",
      name: "Q1 2024 distribution",
      status: "published",
    },
    name: "Ramadan retail pool",
    notes: "Seasonal trading business used for first dividend distribution.",
    profitEntries: [
      {
        id: "profit-1",
        allocatedProfitAmount: 0,
        allocationCount: 0,
        allocatableProfitAmount: 80000,
        expenseAmount: 5000,
        hasPublishedAllocations: false,
        linkedDividendPeriod: {
          id: "period-1",
          name: "Q1 2024 distribution",
          status: "published",
        },
        notes: "Historical profit backfill",
        profitAmount: 85000,
        profitDate: "2024-04-30",
        reason: "Board-approved seasonal trading distribution",
        sourceType: "backfill",
        status: "reviewed",
      },
    ],
    profitAmount: 85000,
    startDate: "2024-01-15",
    status: "completed",
  },
]

const demoDividendPeriods = [
  {
    id: "period-1",
    name: "Q1 2024 distribution",
    periodStart: "2024-01-01",
    periodEnd: "2024-03-31",
    status: "published",
    totalProfitAmount: 85000,
  },
]

const demoMemberOptions = [
  {
    id: "member-demo-1",
    label: "Aisha Bello (MBR-001)",
  },
]

const demoLegacyLoanDrafts = [
  {
    closedAt: null,
    guarantorOneMemberId: null,
    guarantorTwoMemberId: null,
    id: "legacy-loan-demo-1",
    loanLabel: "Loan A",
    memberId: "member-demo-1",
    memberName: "Aisha Bello",
    memberNumber: "MBR-001",
    openedAt: "2025-08-01",
    outstandingPrincipalBalance: 65000,
    principalAmount: 120000,
    savingsDuringLoan: 5000,
    scheduledMonthlyPrincipalRepayment: 10000,
  },
]

const demoFinancingSettings = {
  currentCyclePreview: {
    capacityBasis: "projected_monthly_commitments" as const,
    collectionCoverage: 0.42,
    existingCycle: null,
    intakeReservationMode: "submitted_request_amount" as const,
    normal: {
      approvedAmount: 0,
      budgetAmount: 140000,
      disbursedAmount: 0,
      heldAmount: 0,
      remainingAmount: 140000,
      requestedReservedAmount: 0,
    },
    normalAllocationPercentage: 70,
    periodEnd: "2026-07-31",
    periodStart: "2026-07-01",
    projectedCommitmentAmount: 200000,
    quick: {
      approvedAmount: 0,
      budgetAmount: 60000,
      disbursedAmount: 0,
      heldAmount: 0,
      remainingAmount: 60000,
      requestedReservedAmount: 0,
    },
    quickAllocationPercentage: 30,
    receivedContributionAmount: 84000,
    reserveBufferAmount: 0,
    totalCapacityAmount: 200000,
  },
  policy: {
    disbursementRequiresDeployableFunds: true,
    financingCapacityBasis: "projected_monthly_commitments" as const,
    id: null,
    loanEligibilityMultiple: 2,
    loanIntakeReservationMode: "submitted_request_amount" as const,
    normalLoanAllocationPercentage: 70,
    normalLoanTermMonths: 18,
    quickLoanAllocationPercentage: 30,
    quickLoanTermMonths: 3,
    requiresDualLoanApproval: false,
    reserveBufferAmount: 0,
  },
  products: {
    normal: {
      id: null,
      isActive: true,
      loanType: "normal" as const,
      maxSavingsMultiple: 2,
      name: "Normal financing",
      termMonths: 18,
    },
    quick: {
      id: null,
      isActive: true,
      loanType: "quick" as const,
      maxSavingsMultiple: 2,
      name: "Quick financing",
      termMonths: 3,
    },
  },
}

const demoMemberAmountLogs = [
  {
    amount: 5000,
    effectiveFrom: "2025-01-01",
    id: "amount-log-demo-1",
    notes: "Initial commitment",
  },
]

const demoMigrationMemberReview = [
  {
    appliedBackfillBatches: 0,
    appliedBackfillMonths: 0,
    backfillDraftBatches: 1,
    fullName: "Aisha Bello",
    id: "member-demo-1",
    joinedAt: "2025-01-01",
    legacyLoanDrafts: 1,
    memberNumber: "MBR-001",
    profitAdjustments: 1,
    rowAdjustments: 2,
    status: "backfill_draft" as const,
  },
]

function toFinancingSettingsView(settings: any) {
  return {
    ...settings,
    currentCyclePreview: {
      ...settings.currentCyclePreview,
      periodEnd: toDateString(settings.currentCyclePreview.periodEnd),
      periodStart: toDateString(settings.currentCyclePreview.periodStart),
    },
  }
}

export async function FinanceSettingsRoute({
  migrationMemberId,
  searchParams,
  section = "overview",
}: {
  migrationMemberId?: string
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  section?: TenantFinanceSection
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const requestedMigrationMemberId =
    migrationMemberId ??
    (typeof resolvedSearchParams.migrationMemberId === "string"
      ? resolvedSearchParams.migrationMemberId
      : undefined)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const quickFillEnabled = canShowQuickFill(context)
  const today = new Date()

  if (context.tenant && runtime.status === "database-configured") {
    const [
      data,
      financingSettings,
      migrationState,
      legacyLoanDrafts,
      memberOptions,
      migrationMemberReview,
    ] = await Promise.all([
      getTenantFinanceSetup(context.tenant.id),
      getTenantFinancingSettingsWorkspace({ tenantId: context.tenant.id }),
      getTenantInitialMigrationState(context.tenant.id),
      listLegacyLoanMigrationDrafts(context.tenant.id),
      listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
      listInitialMigrationMemberReview(context.tenant.id),
    ])
    const previewMember = requestedMigrationMemberId
      ? (memberOptions.items.find(
          (member: any) => member.id === requestedMigrationMemberId
        ) ?? null)
      : null
    const selectedMemberMigrationInputs = previewMember
      ? await Promise.all([
          listMemberAmountLogs({
            memberId: previewMember.id,
            tenantId: context.tenant.id,
          }),
          listMemberActivityEvents({
            memberId: previewMember.id,
            tenantId: context.tenant.id,
          }),
          listMigrationProfitAdjustmentOptions(
            context.tenant.id,
            undefined,
            previewMember.id,
          ),
        ])
      : null
    const selectedMemberAmountLogs = selectedMemberMigrationInputs?.[0] ?? []
    const selectedMemberActivityEvents =
      selectedMemberMigrationInputs?.[1] ?? []
    const profitMigrationOptions = selectedMemberMigrationInputs?.[2] ?? []
    const canGenerateMemberBackfillPreview =
      !migrationState.snapshot.missingStepKeys.some((stepKey) =>
        [
          "finance_start_date",
          "charge_schedules",
          "business_profit_pools",
          "business_profit_seasons",
          "share_capital_plan",
          "member_profiles",
        ].includes(stepKey)
      )
    const generatedLedgerRows =
      (section === "migration" || section === "migration-member") &&
      previewMember &&
      canGenerateMemberBackfillPreview
        ? projectBackfillDraftToMemberLedgerRows(
            buildBackfillDraft(
              await buildBackfillDraftInputForMember({
                memberId: previewMember.id,
                tenantId: context.tenant.id,
              })
            )
          )
        : undefined

    return (
      <TenantFinancePageView
        chargeDefinitions={data.chargeDefinitions.map((charge: any) => {
          const currentVersion =
            [...charge.versions]
              .reverse()
              .find(
                (version: any) =>
                  new Date(version.effectiveFrom).getTime() <= today.getTime()
              ) ?? null

          return {
            id: charge.id,
            chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
            chargeValueType:
              charge.chargeValueType ??
              (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
            code: charge.code,
            name: charge.name,
            kind: charge.kind,
            isActive: charge.isActive,
            versions: charge.versions.map((version: any) => ({
              id: version.id,
              effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
              amount: Number(version.amount),
              chargeValueType:
                version.chargeValueType ??
                (version.kind === "percentage" ? "percentage" : "fixed_amount"),
              notes: version.notes,
              status:
                currentVersion?.id === version.id
                  ? "current"
                  : new Date(version.effectiveFrom).getTime() > today.getTime()
                    ? "scheduled"
                    : "historical",
            })),
          }
        })}
        shareStructureVersions={data.shareStructureVersions.map(
          (version: any) => ({
            id: version.id,
            effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
            amount: Number(version.amount),
            basis: version.basis ?? "after_charge_deductions",
            notes: version.notes,
            valueType: version.valueType ?? "fixed_amount",
          })
        )}
        shareBusinesses={data.shareBusinesses.map((business: any) => ({
          id: business.id,
          capitalAmount: Number(business.capitalAmount),
          endDate: business.endDate
            ? business.endDate.toISOString().slice(0, 10)
            : null,
          linkedDividendPeriod: business.linkedDividendPeriod
            ? {
                id: business.linkedDividendPeriod.id,
                name: business.linkedDividendPeriod.name,
                status: business.linkedDividendPeriod.status,
              }
            : null,
          name: business.name,
          notes: business.notes,
          profitEntries: (business.profitEntries ?? []).map((entry: any) => ({
            id: entry.id,
            allocatedProfitAmount: (entry.allocations ?? []).reduce(
              (sum: number, allocation: any) =>
                sum + Number(allocation.allocatedProfitAmount),
              0
            ),
            allocationCount: entry.allocations?.length ?? 0,
            allocatableProfitAmount: Number(
              entry.allocatableProfitAmount ?? entry.profitAmount
            ),
            expenseAmount: Number(entry.expenseAmount ?? 0),
            hasPublishedAllocations: (entry.allocations ?? []).some(
              (allocation: any) => allocation.status === "published"
            ),
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
          profitAmount: Number(business.profitAmount),
          startDate: business.startDate.toISOString().slice(0, 10),
          status: business.status,
        }))}
        dividendPeriods={data.dividendPeriods.map((period: any) => ({
          id: period.id,
          name: period.name,
          periodStart: period.periodStart.toISOString().slice(0, 10),
          periodEnd: period.periodEnd.toISOString().slice(0, 10),
          status: period.status,
          totalProfitAmount: Number(period.totalProfitAmount),
        }))}
        generatedLedgerRows={generatedLedgerRows}
        financingSettings={toFinancingSettingsView(financingSettings)}
        initialMigrationSnapshot={migrationState.snapshot}
        legacyLoanDrafts={legacyLoanDrafts.map((draft) => ({
          closedAt: draft.closedAt
            ? draft.closedAt.toISOString().slice(0, 10)
            : null,
          id: draft.id,
          guarantorOneMemberId: draft.guarantorOneMemberId,
          guarantorTwoMemberId: draft.guarantorTwoMemberId,
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
        }))}
        memberOptions={memberOptions.items.map((member: any) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
        }))}
        memberNumberPrefix={context.tenant.memberNumberPrefix}
        memberAmountLogs={selectedMemberAmountLogs.map((row) => ({
          amount: row.amount,
          effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
          id: row.id,
          notes: row.notes,
        }))}
        memberActivityEvents={selectedMemberActivityEvents.map(
          (event: {
            effectiveMonth: Date
            id: string
            notes?: string | null
            reason?: string | null
            status: string
          }) => ({
            effectiveMonth: event.effectiveMonth.toISOString().slice(0, 10),
            id: event.id,
            notes: event.notes,
            reason: event.reason,
            status: event.status === "inactive" ? "inactive" : "active",
          })
        )}
        migrationMemberReview={migrationMemberReview.map((row) => ({
          ...row,
          joinedAt: row.joinedAt.toISOString().slice(0, 10),
        }))}
        profitMigrationOptions={profitMigrationOptions.map((option: any) => ({
          ...option,
          profitDate: option.profitDate.toISOString().slice(0, 10),
          seasonPeriodEnd: toDateString(option.seasonPeriodEnd),
        }))}
        selectedMigrationMemberId={previewMember?.id ?? null}
        selectedMigrationMemberLabel={
          previewMember
            ? `${previewMember.fullName} (${previewMember.memberNumber})`
            : null
        }
        quickFillEnabled={quickFillEnabled}
        section={section}
        tenantName={data.tenant?.name ?? context.tenant.name}
        tenantStartDate={
          data.tenant?.startDate?.toISOString().slice(0, 10) ?? null
        }
      />
    )
  }

  const migrationState = await getTenantInitialMigrationState(
    context.tenant?.id ?? "tenant-amanah-demo"
  )

  return (
    <TenantFinancePageView
      chargeDefinitions={demoChargeDefinitions}
      dividendPeriods={demoDividendPeriods}
      financingSettings={demoFinancingSettings}
      initialMigrationSnapshot={migrationState.snapshot}
      legacyLoanDrafts={demoLegacyLoanDrafts}
      memberAmountLogs={demoMemberAmountLogs}
      memberOptions={demoMemberOptions}
      memberNumberPrefix={context.tenant?.memberNumberPrefix ?? null}
      migrationMemberReview={demoMigrationMemberReview}
      quickFillEnabled={quickFillEnabled}
      selectedMigrationMemberId={demoMemberOptions[0]?.id ?? null}
      selectedMigrationMemberLabel={demoMemberOptions[0]?.label ?? null}
      section={section}
      shareBusinesses={demoShareBusinesses}
      shareStructureVersions={demoShareVersions}
      tenantName={context.tenant?.name ?? "Demo cooperative"}
      tenantStartDate={context.tenant?.startDate ?? "2024-01-01"}
    />
  )
}
