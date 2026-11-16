import type { SearchParams } from "nuqs"
import {
  buildBackfillDraft,
  projectBackfillDraftToMemberLedgerRows,
} from "@halaalvest/backfill"
import {
  buildBackfillDraftInputForMember,
  createDbRuntime,
  getTenantFinanceSetupLock,
  getTenantFinancingSettingsWorkspace,
  getTenantInitialMigrationState,
  getTenantOpeningCashSetting,
  listInitialMigrationMemberReview,
  listLegacyLoanMigrationDrafts,
  listMemberActivityEvents,
  listMemberAmountLogs,
  listRecentMemberOptions,
  searchMemberOptions,
  listMigrationProfitAdjustmentOptions,
} from "@halaalvest/db"
import { LoanSettingsView } from "@/components/finance-settings/loan-settings-view"
import { MigrationDoneView } from "@/components/finance-settings/migration-done-view"
import { OpeningCashSection } from "@/components/finance-settings/opening-cash-section"
import { FinanceSettingsUnavailableView } from "@/components/finance-settings-page-states"
import { InitialMigrationPreview } from "@/components/initial-migration-preview"
import { TenantFinancePageView } from "@/components/tenant-finance-page-view"
import { loadGoLiveChecklistData } from "@/lib/getting-started/load-go-live-checklist"
import { loadTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import {
  toFinancingSettingsView,
  toLegacyLoanDraftRows,
  toMemberActivityEventRows,
  toMemberAmountLogRows,
  toMemberOptions,
  toMigrationMemberReviewRows,
  toProfitMigrationOptionRows,
} from "@/lib/finance/finance-settings-view-model"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"

export type FinanceRouteSection = "loan" | "migration" | "migration-member"

type Context = Awaited<ReturnType<typeof getDashboardServerContext>>
type Tenant = NonNullable<Context["tenant"]>

/**
 * The opening-balances workspace (past loans, members' past records, go
 * live). It is loaded only while past setup can still change.
 */
async function loadMigrationWorkspace({
  context,
  memberId,
  section,
  tenant,
}: {
  context: Context
  memberId?: string
  section: FinanceRouteSection
  tenant: Tenant
}) {
  const [
    migrationState,
    migrationMemberReview,
    legacyLoanDrafts,
    memberItems,
    [previewMember = null],
  ] = await Promise.all([
    getTenantInitialMigrationState(tenant.id),
    listInitialMigrationMemberReview(tenant.id),
    listLegacyLoanMigrationDrafts(tenant.id),
    listRecentMemberOptions(tenant.id),
    // Looked up by id, so a member outside the picker's 200 still previews.
    memberId ? searchMemberOptions(tenant.id, { ids: [memberId] }) : [],
  ])
  const [amountLogs, activityEvents, profitOptions] = previewMember
    ? await Promise.all([
        listMemberAmountLogs({ memberId: previewMember.id, tenantId: tenant.id }),
        listMemberActivityEvents({
          memberId: previewMember.id,
          tenantId: tenant.id,
        }),
        listMigrationProfitAdjustmentOptions(
          tenant.id,
          undefined,
          previewMember.id
        ),
      ])
    : [[], [], []]
  const canGenerateMemberBackfillPreview =
    !migrationState.snapshot.missingStepKeys.some((stepKey) =>
      [
        "finance_start_date",
        "charge_schedules",
        "business_profit_pools",
        "business_profit_seasons",
        "member_profiles",
      ].includes(stepKey)
    )
  const generatedLedgerRows =
    section !== "loan" && previewMember && canGenerateMemberBackfillPreview
      ? projectBackfillDraftToMemberLedgerRows(
          buildBackfillDraft(
            await buildBackfillDraftInputForMember({
              memberId: previewMember.id,
              tenantId: tenant.id,
            })
          )
        )
      : undefined
  const goLiveChecklist =
    section === "migration" &&
    migrationState.snapshot.status === "migration_review"
      ? await loadGoLiveChecklistData({
          tenantId: tenant.id,
          user: context.auth.user,
        })
      : null

  return (
    <InitialMigrationPreview
      generatedLedgerRows={generatedLedgerRows}
      goLiveChecklist={goLiveChecklist}
      legacyLoanDrafts={toLegacyLoanDraftRows(legacyLoanDrafts)}
      memberActivityEvents={toMemberActivityEventRows(activityEvents)}
      memberAmountLogs={toMemberAmountLogRows(amountLogs)}
      memberNumberPrefix={tenant.memberNumberPrefix}
      memberOptions={toMemberOptions(memberItems)}
      migrationMemberReview={toMigrationMemberReviewRows(migrationMemberReview)}
      migrationSnapshot={migrationState.snapshot}
      profitMigrationOptions={toProfitMigrationOptionRows(profitOptions)}
      quickFillEnabled={canShowQuickFill(context)}
      section={
        section === "loan"
          ? "loans"
          : section === "migration-member"
            ? "member-preview"
            : "overview"
      }
      selectedMigrationMemberId={previewMember?.id ?? null}
      selectedMigrationMemberLabel={
        previewMember
          ? `${previewMember.fullName} (${previewMember.memberNumber})`
          : null
      }
      tenantName={tenant.name}
      tenantStartDate={tenant.startDate ?? null}
    />
  )
}

export async function FinanceSettingsRoute({
  migrationMemberId,
  searchParams,
  section,
}: {
  migrationMemberId?: string
  searchParams?: Promise<SearchParams>
  section: FinanceRouteSection
}) {
  loadTenantFinanceSettingsParams(searchParams ? await searchParams : {})
  const context = await getDashboardServerContext()
  const tenant = context.tenant

  if (!tenant || createDbRuntime().status !== "database-configured") {
    return <FinanceSettingsUnavailableView />
  }

  if (section === "loan") {
    const [financingSettings, lock] = await Promise.all([
      getTenantFinancingSettingsWorkspace({ tenantId: tenant.id }),
      getTenantFinanceSetupLock(tenant.id),
    ])

    return (
      <LoanSettingsView
        financingSettings={toFinancingSettingsView(financingSettings)}
        historicalLoans={
          lock.canUseMigrationTools
            ? await loadMigrationWorkspace({ context, section, tenant })
            : null
        }
        lock={lock}
      />
    )
  }

  const [lock, openingCash] = await Promise.all([
    getTenantFinanceSetupLock(tenant.id),
    section === "migration" ? getTenantOpeningCashSetting(tenant.id) : null,
  ])

  if (!lock.canUseMigrationTools) {
    return (
      <MigrationDoneView
        memberId={migrationMemberId}
        openingCashAmount={openingCash?.amount ?? 0}
      />
    )
  }

  return (
    <TenantFinancePageView>
      {openingCash ? (
        <OpeningCashSection
          amount={openingCash.amount}
          canChange={openingCash.canChange}
        />
      ) : null}
      {await loadMigrationWorkspace({
        context,
        memberId: migrationMemberId,
        section,
        tenant,
      })}
    </TenantFinancePageView>
  )
}
