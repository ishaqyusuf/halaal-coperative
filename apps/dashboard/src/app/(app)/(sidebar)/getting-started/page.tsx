import {
  buildBackfillDraft,
  projectBackfillDraftToMemberLedgerRows,
  type MemberLedgerBackfillRow,
} from "@halaalvest/backfill"
import type { SearchParams } from "nuqs"
import {
  buildBackfillDraftInputForMember,
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
  listLegacyLoanMigrationDrafts,
  listMigrationProfitAdjustmentOptions,
  listMemberActivityEvents,
  listMemberAmountLogs,
  listMembers,
} from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { GettingStartedPageView } from "@/components/getting-started-page-view"
import {
  type GettingStartedStepKey,
  loadGettingStartedParams,
} from "@/hooks/use-getting-started-params"
import { getDashboardServerContext } from "@/lib/server-context"

function resolveDefaultStep(
  missingStepKeys: string[],
  needsProfitPolicy: boolean
): GettingStartedStepKey {
  if (missingStepKeys.includes("finance_start_date")) return "start-date"
  if (missingStepKeys.includes("charge_schedules")) return "charges"
  if (needsProfitPolicy) return "profit-policy"
  if (missingStepKeys.includes("business_profit_pools")) return "business"
  if (missingStepKeys.includes("business_profit_seasons")) {
    return "profit-seasons"
  }
  if (
    missingStepKeys.some((stepKey) =>
      ["member_profiles", "legacy_loans", "member_ledger_backfill"].includes(
        stepKey
      )
    )
  ) {
    return "admin-member"
  }
  return "admin-member"
}

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null

  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const gettingStartedParams = loadGettingStartedParams(resolvedSearchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return (
      <WorkspacePageShell
        eyebrow="Initial migration"
        title="Getting started"
        description="Initial migration setup is available from a cooperative workspace."
      >
        <WorkspaceEmptyState
          title="Choose a cooperative workspace first."
          body="Open a cooperative workspace before running the first-admin migration setup."
        />
      </WorkspacePageShell>
    )
  }

  const runtime = createDbRuntime()

  if (runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Initial migration"
        title="Getting started"
        description="Initial migration setup requires the database-backed workspace."
      >
        <WorkspaceEmptyState
          title="Database is not configured."
          body="The guided migration setup does not use demo content. Configure the database, then return to this page."
        />
      </WorkspacePageShell>
    )
  }

  const requestedStep =
    gettingStartedParams.step as GettingStartedStepKey | null
  const requestedMigrationMemberId = gettingStartedParams.migrationMemberId
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
  const activeStep: GettingStartedStepKey =
    requestedStep ??
    resolveDefaultStep(
      migrationState.snapshot.missingStepKeys,
      !data.businessPolicy.id
    )
  const adminMember =
    memberOptions.items.find(
      (member: any) => member.user?.id === context.auth.user?.id
    ) ??
    memberOptions.items.find(
      (member: any) =>
        member.user?.email && member.user.email === context.auth.user?.email
    ) ??
    null
  const selectedMember =
    (requestedMigrationMemberId
      ? memberOptions.items.find(
          (member: any) => member.id === requestedMigrationMemberId
        )
      : null) ??
    adminMember ??
    memberOptions.items[0] ??
    null
  const canGenerateMemberBackfillPreview =
    selectedMember &&
    !migrationState.snapshot.missingStepKeys.some((stepKey) =>
      [
        "finance_start_date",
        "charge_schedules",
        "business_profit_pools",
        "business_profit_seasons",
        "member_profiles",
      ].includes(stepKey)
    )
  let generatedLedgerRows: MemberLedgerBackfillRow[] | undefined
  let generatedLedgerError: string | null = null

  if (canGenerateMemberBackfillPreview && selectedMember) {
    try {
      generatedLedgerRows = projectBackfillDraftToMemberLedgerRows(
        buildBackfillDraft(
          await buildBackfillDraftInputForMember({
            memberId: selectedMember.id,
            tenantId: context.tenant.id,
          })
        )
      )
    } catch (error) {
      generatedLedgerError =
        error instanceof Error
          ? error.message
          : "Could not generate the member ledger preview."
      generatedLedgerRows = undefined
    }
  }
  const selectedMemberMigrationInputs = selectedMember
    ? await Promise.all([
        listMemberAmountLogs({
          memberId: selectedMember.id,
          tenantId: context.tenant.id,
        }),
        listMemberActivityEvents({
          memberId: selectedMember.id,
          tenantId: context.tenant.id,
        }),
        listMigrationProfitAdjustmentOptions(
          context.tenant.id,
          undefined,
          selectedMember.id
        ),
      ])
    : null
  const selectedMemberAmountLogs = selectedMemberMigrationInputs?.[0] ?? []
  const selectedMemberActivityEvents = selectedMemberMigrationInputs?.[1] ?? []
  const profitMigrationOptions = selectedMemberMigrationInputs?.[2] ?? []
  const today = new Date()

  return (
    <GettingStartedPageView
      activeStep={activeStep}
      adminMember={
        adminMember
          ? {
              email: adminMember.user?.email ?? null,
              fullName: adminMember.fullName,
              id: adminMember.id,
              joinedAt: adminMember.joinedAt.toISOString().slice(0, 10),
              memberNumber: adminMember.memberNumber,
            }
          : null
      }
      chargeDefinitions={data.chargeDefinitions.map((charge: any) => {
        const currentVersion =
          [...charge.versions]
            .reverse()
            .find(
              (version: any) =>
                new Date(version.effectiveFrom).getTime() <= today.getTime()
            ) ?? null

        return {
          appliesToLoanRequests: charge.appliesToLoanRequests ?? false,
          appliesToLoans: charge.appliesToLoans ?? false,
          appliesToMembers: charge.appliesToMembers ?? true,
          chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
          chargeValueType:
            charge.chargeValueType ??
            (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
          code: charge.code,
          id: charge.id,
          isActive: charge.isActive,
          isMonthlyLevy: charge.isMonthlyLevy ?? false,
          kind: charge.kind,
          name: charge.name,
          purpose: charge.purpose ?? "general",
          versions: charge.versions.map((version: any) => ({
            amount: Number(version.amount),
            chargeValueType:
              version.chargeValueType ??
              (version.kind === "percentage" ? "percentage" : "fixed_amount"),
            effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
            id: version.id,
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
      dividendPeriods={data.dividendPeriods.map((period: any) => ({
        id: period.id,
        label: period.name,
      }))}
      businessPolicy={data.businessPolicy}
      businessProfitSeasons={data.businessProfitSeasons.map((season: any) => ({
        businessNames: season.businessNames,
        deductionAmount: season.deductionAmount,
        deductionReason: season.deductionReason,
        distributableAmount: season.distributableAmount,
        entryDeductionAmount: season.entryDeductionAmount,
        grossProfitAmount: season.grossProfitAmount,
        id: season.id,
        key: season.key,
        label: season.label,
        periodEnd: toDateString(season.periodEnd) ?? "",
        periodStart: toDateString(season.periodStart) ?? "",
        profitEntries: (season.profitEntries ?? []).map((entry: any) => ({
          businessName: entry.businessName,
          deductionAmount: entry.deductionAmount,
          profitAmount: entry.profitAmount,
          profitDate: toDateString(entry.profitDate) ?? "",
          reason: entry.reason,
        })),
        profitEntryCount: season.profitEntryCount,
        status: season.status,
      }))}
      generatedLedgerError={generatedLedgerError}
      generatedLedgerRows={generatedLedgerRows}
      legacyLoanDrafts={legacyLoanDrafts.map((draft) => ({
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
      memberAmountLogs={selectedMemberAmountLogs.map((row) => ({
        amount: row.amount,
        effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
        id: row.id,
        notes: row.notes,
      }))}
      memberNumberPrefix={context.tenant.memberNumberPrefix}
      memberOptions={memberOptions.items.map((member: any) => ({
        id: member.id,
        label: `${member.fullName} (${member.memberNumber})`,
      }))}
      migrationMemberReview={migrationMemberReview.map((row) => ({
        ...row,
        joinedAt: row.joinedAt.toISOString().slice(0, 10),
      }))}
      migrationSnapshot={migrationState.snapshot}
      profitMigrationOptions={profitMigrationOptions.map((option: any) => ({
        ...option,
        profitDate: option.profitDate.toISOString().slice(0, 10),
        seasonPeriodEnd: toDateString(option.seasonPeriodEnd),
      }))}
      selectedMigrationMemberId={selectedMember?.id ?? null}
      selectedMigrationMemberLabel={
        selectedMember
          ? `${selectedMember.fullName} (${selectedMember.memberNumber})`
          : null
      }
      sharePolicy={data.sharePolicy}
      shareBusinesses={data.shareBusinesses.map((business: any) => ({
        capitalAmount: Number(business.capitalAmount),
        endDate: toDateString(business.endDate),
        id: business.id,
        linkedDividendPeriodId: business.linkedDividendPeriod?.id ?? null,
        name: business.name,
        notes: business.notes,
        profitAmount: Number(business.profitAmount),
        profitEntries: (business.profitEntries ?? []).map((entry: any) => ({
          allocatableProfitAmount: Number(
            entry.allocatableProfitAmount ?? entry.profitAmount
          ),
          expenseAmount: Number(entry.expenseAmount ?? 0),
          id: entry.id,
          linkedDividendPeriodId: entry.linkedDividendPeriod?.id ?? null,
          profitAmount: Number(entry.profitAmount),
          profitDate: entry.profitDate.toISOString().slice(0, 10),
          reason: entry.reason,
          sourceType: entry.sourceType,
          status: entry.status ?? "draft",
        })),
        startDate: business.startDate.toISOString().slice(0, 10),
        status: business.status,
      }))}
      shareStructureVersions={data.shareStructureVersions.map(
        (version: any) => ({
          amount: Number(version.amount),
          basis: version.basis ?? "after_charge_deductions",
          effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
          id: version.id,
          notes: version.notes,
          valueType: version.valueType ?? "fixed_amount",
        })
      )}
      tenantName={data.tenant?.name ?? context.tenant.name}
      tenantStartDate={toDateString(data.tenant?.startDate)}
    />
  )
}
