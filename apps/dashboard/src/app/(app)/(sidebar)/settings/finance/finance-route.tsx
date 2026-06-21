import {
  buildBackfillDraft,
  projectBackfillDraftToMemberLedgerRows,
} from "@halaalvest/backfill"
import {
  buildBackfillDraftInputForMember,
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
  listLegacyLoanMigrationDrafts,
  listMigrationProfitAdjustmentOptions,
  listMembers,
} from "@halaalvest/db"
import { TenantFinancePageView } from "@/components/tenant-finance-page-view"
import type { TenantFinanceSection } from "@/components/tenant-finance-page-view"
import { getDashboardServerContext } from "@/lib/server-context"

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

const demoProfitAdjustmentOptions = [
  {
    allocatableProfitAmount: 80000,
    availableAmount: 80000,
    businessName: "Ramadan retail pool",
    editableAvailableAmount: 80000,
    expenseAmount: 5000,
    id: "profit-1",
    label: "Ramadan retail pool - 2024-04-30",
    profitAmount: 85000,
    profitDate: "2024-04-30",
    totalDisbursedAmount: 0,
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

export async function FinanceSettingsRoute({
  searchParams,
  section = "overview",
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  section?: TenantFinanceSection
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const requestedMigrationMemberId =
    typeof resolvedSearchParams.migrationMemberId === "string"
      ? resolvedSearchParams.migrationMemberId
      : undefined
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const today = new Date()

  if (context.tenant && runtime.status === "database-configured") {
    const [
      data,
      migrationState,
      legacyLoanDrafts,
      memberOptions,
      migrationMemberReview,
    ] = await Promise.all([
      getTenantFinanceSetup(context.tenant.id),
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
    const profitAdjustmentOptions = previewMember
      ? await listMigrationProfitAdjustmentOptions(
          context.tenant.id,
          undefined,
          previewMember.id
        )
      : []
    const canGenerateMemberBackfillPreview =
      !migrationState.snapshot.missingStepKeys.some((stepKey) =>
        [
          "finance_start_date",
          "charge_schedules",
          "business_profit_pools",
          "share_capital_plan",
          "member_profiles",
        ].includes(stepKey)
      )
    const generatedLedgerRows =
      previewMember && canGenerateMemberBackfillPreview
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
        initialMigrationSnapshot={migrationState.snapshot}
        legacyLoanDrafts={legacyLoanDrafts.map((draft) => ({
          closedAt: draft.closedAt
            ? draft.closedAt.toISOString().slice(0, 10)
            : null,
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
        }))}
        memberOptions={memberOptions.items.map((member: any) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
        }))}
        migrationMemberReview={migrationMemberReview.map((row) => ({
          ...row,
          joinedAt: row.joinedAt.toISOString().slice(0, 10),
        }))}
        profitAdjustmentOptions={profitAdjustmentOptions.map((entry) => ({
          allocatableProfitAmount: entry.allocatableProfitAmount,
          availableAmount: entry.availableAmount,
          businessName: entry.businessName,
          editableAvailableAmount: entry.editableAvailableAmount,
          expenseAmount: entry.expenseAmount,
          id: entry.id,
          label: `${entry.businessName} - ${entry.profitDate.toISOString().slice(0, 10)}`,
          memberAllocatedAmount: entry.memberAllocatedAmount,
          profitAmount: entry.profitAmount,
          profitDate: entry.profitDate.toISOString().slice(0, 10),
          totalDisbursedAmount: entry.totalDisbursedAmount,
        }))}
        selectedMigrationMemberId={previewMember?.id ?? null}
        selectedMigrationMemberLabel={
          previewMember
            ? `${previewMember.fullName} (${previewMember.memberNumber})`
            : null
        }
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
      initialMigrationSnapshot={migrationState.snapshot}
      legacyLoanDrafts={demoLegacyLoanDrafts}
      memberOptions={demoMemberOptions}
      migrationMemberReview={demoMigrationMemberReview}
      profitAdjustmentOptions={demoProfitAdjustmentOptions}
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
