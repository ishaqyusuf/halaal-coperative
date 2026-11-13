import { headers } from "next/headers"
import type { SearchParams } from "nuqs"
import {
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  getTenantOperationProfile,
  recommendTenantMigrationSetupMode,
} from "@halaalvest/db"
import {
  GettingStartedPageView,
  GettingStartedUnavailableView,
} from "@/components/getting-started-page-view"
import {
  type GettingStartedStepKey,
  loadGettingStartedParams,
} from "@/hooks/use-getting-started-params"
import {
  getGettingStartedStepHref,
  resolveGettingStartedResumeStep,
  resolveLegacyGettingStartedStep,
  toGettingStartedProgressInput,
} from "@/lib/getting-started/getting-started-step-model"
import type {
  GettingStartedChargeDefinitionRow,
  GettingStartedShareBusinessRow,
  GettingStartedShareStructureVersionRow,
} from "@/lib/getting-started/getting-started-page-types"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { loadGoLiveChecklistData } from "@/lib/getting-started/load-go-live-checklist"
import { getPublicRequestHost } from "@/lib/request-host"
import { tenantRedirect } from "@/utils/tenant-redirect"

type FinanceSetupCharge = Omit<
  GettingStartedChargeDefinitionRow,
  "versions"
> & {
  versions: Array<
    Omit<
      GettingStartedChargeDefinitionRow["versions"][number],
      "effectiveFrom" | "status"
    > & {
      effectiveFrom: Date
      kind?: "fixed" | "percentage"
    }
  >
}

type FinanceSetupBusiness = Omit<
  GettingStartedShareBusinessRow,
  | "capitalAmount"
  | "endDate"
  | "linkedDividendPeriodId"
  | "profitAmount"
  | "profitEntries"
  | "startDate"
> & {
  capitalAmount: unknown
  endDate: Date | null
  linkedDividendPeriod?: { id: string } | null
  profitAmount: unknown
  profitEntries?: Array<
    Omit<
      GettingStartedShareBusinessRow["profitEntries"][number],
      | "allocatableProfitAmount"
      | "expenseAmount"
      | "linkedDividendPeriodId"
      | "profitAmount"
      | "profitDate"
    > & {
      allocatableProfitAmount?: unknown
      expenseAmount?: unknown
      linkedDividendPeriod?: { id: string } | null
      profitAmount: unknown
      profitDate: Date
    }
  >
  startDate: Date
}

type FinanceSetupShareStructureVersion = Omit<
  GettingStartedShareStructureVersionRow,
  "amount" | "effectiveFrom"
> & {
  amount: unknown
  effectiveFrom: Date
}

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null

  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

export async function GettingStartedPageContent({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const gettingStartedParams = loadGettingStartedParams(resolvedSearchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return (
      <GettingStartedUnavailableView
        description="Initial migration setup is available from a cooperative workspace."
        title="Choose a cooperative workspace first."
        body="Open a cooperative workspace before running the first-admin migration setup."
      />
    )
  }

  const runtime = createDbRuntime()

  if (runtime.status !== "database-configured") {
    return (
      <GettingStartedUnavailableView
        description="Initial migration setup requires the database-backed workspace."
        title="Database is not configured."
        body="The guided migration setup does not use demo content. Configure the database, then return to this page."
      />
    )
  }

  const legacyRedirect = resolveLegacyGettingStartedStep(
    gettingStartedParams.step
  )

  if (legacyRedirect) {
    await tenantRedirect(getGettingStartedStepHref(legacyRedirect))
  }

  const requestedStep =
    gettingStartedParams.step as GettingStartedStepKey | null
  const [data, migrationState, operationProfile] = await Promise.all([
    getTenantFinanceSetup(context.tenant.id),
    getTenantInitialMigrationState(context.tenant.id),
    getTenantOperationProfile(context.tenant.id),
  ])
  const isMemberMigration =
    migrationState.snapshot.status === "member_migration_in_progress"
  const shouldShowOnboardingSuccess =
    isMemberMigration &&
    Boolean(data.businessPolicy.id) &&
    Boolean(operationProfile.reviewedAt)

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    await tenantRedirect("/")
  }

  // During member migration the members checklist is the landing page. Setup
  // steps 5–9 stay reachable on purpose (Review setup links back to them);
  // Go live only opens once every member is ready.
  if (
    shouldShowOnboardingSuccess &&
    (!requestedStep || requestedStep === "review")
  ) {
    await tenantRedirect("/onboarding-success")
  }

  const progress = toGettingStartedProgressInput({
    financeSetup: data,
    operationProfileReviewedAt: operationProfile.reviewedAt,
    snapshot: migrationState.snapshot,
  })
  const activeStep: GettingStartedStepKey =
    requestedStep ?? resolveGettingStartedResumeStep(progress)

  if (activeStep === "admin-member") {
    await tenantRedirect("/onboarding-success")
  }

  const goLiveChecklist =
    activeStep === "review"
      ? await loadGoLiveChecklistData({
          tenantId: context.tenant.id,
          user: context.auth.user,
        })
      : null

  const today = new Date()
  const tenantStartDate = toDateString(data.tenant?.startDate)
  const memberCount = data.tenant?.currentSize ?? null
  const recordYears = tenantStartDate
    ? (today.getTime() -
        new Date(`${tenantStartDate}T00:00:00.000Z`).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
    : null

  return (
    <GettingStartedPageView
      activeStep={activeStep}
      goLiveChecklist={goLiveChecklist}
      chargeDefinitions={(data.chargeDefinitions as FinanceSetupCharge[]).map(
        (charge) => {
          const currentVersion =
            [...charge.versions]
              .reverse()
              .find(
                (version) =>
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
                  ? "current"
                  : new Date(version.effectiveFrom).getTime() > today.getTime()
                    ? "scheduled"
                    : "historical",
            })),
          }
        }
      )}
      dividendPeriods={(
        data.dividendPeriods as Array<{ id: string; name: string }>
      ).map((period) => ({
        id: period.id,
        label: period.name,
      }))}
      businessPolicy={data.businessPolicy}
      businessProfitSeasons={data.businessProfitSeasons.map((season) => ({
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
        profitEntries: (season.profitEntries ?? []).map((entry) => ({
          businessName: entry.businessName,
          deductionAmount: entry.deductionAmount,
          profitAmount: entry.profitAmount,
          profitDate: toDateString(entry.profitDate) ?? "",
          reason: entry.reason,
          status: entry.status ?? "draft",
        })),
        profitEntryCount: season.profitEntryCount,
        status: season.status,
      }))}
      memberNumberPrefix={context.tenant.memberNumberPrefix}
      migrationSnapshot={migrationState.snapshot}
      requiresHistoricalBackfill={migrationState.requiresHistoricalBackfill}
      migrationSetup={data.migrationSetup}
      operationProfile={operationProfile}
      sharePolicy={data.sharePolicy}
      shareBusinesses={(data.shareBusinesses as FinanceSetupBusiness[]).map(
        (business) => ({
          capitalAmount: Number(business.capitalAmount),
          endDate: toDateString(business.endDate),
          id: business.id,
          linkedDividendPeriodId: business.linkedDividendPeriod?.id ?? null,
          name: business.name,
          notes: business.notes,
          profitAmount: Number(business.profitAmount),
          profitEntries: (business.profitEntries ?? []).map((entry) => ({
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
        })
      )}
      shareStructureVersions={(
        data.shareStructureVersions as FinanceSetupShareStructureVersion[]
      ).map((version) => ({
        amount: Number(version.amount),
        basis: version.basis ?? "after_charge_deductions",
        effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
        id: version.id,
        notes: version.notes,
        valueType: version.valueType ?? "fixed_amount",
      }))}
      modeLocked={
        migrationState.counts.appliedBackfillMembers > 0 ||
        migrationState.counts.appliedBackfillBatches > 0 ||
        migrationState.counts.appliedBackfillMonths > 0
      }
      quickFillEnabled={canShowQuickFill(context)}
      recommendationReason={
        memberCount !== null && recordYears !== null
          ? { members: memberCount, years: recordYears }
          : null
      }
      recommendedMigrationSetupMode={recommendTenantMigrationSetupMode({
        memberCount: memberCount ?? 0,
        startDate: data.tenant?.startDate ?? null,
      })}
      tenantHost={getPublicRequestHost(await headers())}
      tenantStartDate={tenantStartDate}
      tenantName={data.tenant?.name ?? context.tenant.name}
    />
  )
}
