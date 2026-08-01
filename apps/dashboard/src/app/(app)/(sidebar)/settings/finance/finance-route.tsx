import type { SearchParams } from "nuqs"
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
  listMemberActivityEvents,
  listMemberAmountLogs,
  listMembers,
  listMigrationProfitAdjustmentOptions,
} from "@halaalvest/db"
import { FinanceSettingsUnavailableView } from "@/components/finance-settings-page-states"
import { TenantFinancePageView } from "@/components/tenant-finance-page-view"
import type { TenantFinanceSection } from "@/components/tenant-finance-page-view"
import { loadTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import {
  toFinanceSetupViewModel,
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

export async function FinanceSettingsRoute({
  migrationMemberId,
  searchParams,
  section = "overview",
}: {
  migrationMemberId?: string
  searchParams?: Promise<SearchParams>
  section?: TenantFinanceSection
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  loadTenantFinanceSettingsParams(resolvedSearchParams)

  const requestedMigrationMemberId =
    migrationMemberId ??
    (typeof resolvedSearchParams.migrationMemberId === "string"
      ? resolvedSearchParams.migrationMemberId
      : undefined)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant) {
    return (
      <FinanceSettingsUnavailableView
        body="Choose a cooperative workspace before reviewing finance setup."
        title="Finance settings need a cooperative workspace."
      />
    )
  }

  if (runtime.status !== "database-configured") {
    return (
      <FinanceSettingsUnavailableView
        body="Configure the database runtime to review finance policy, historical setup, and migration readiness."
        title="Finance settings need the database runtime."
      />
    )
  }

  const needsMigrationWorkspace =
    section === "loan" ||
    section === "migration" ||
    section === "migration-member"
  const legacyLoanDraftsPromise = needsMigrationWorkspace
    ? listLegacyLoanMigrationDrafts(context.tenant.id)
    : Promise.resolve(
        [] as Awaited<ReturnType<typeof listLegacyLoanMigrationDrafts>>
      )
  const memberItemsPromise = needsMigrationWorkspace
    ? listMembers(context.tenant.id, { page: 1, pageSize: 200 }).then(
        (result) => result.items
      )
    : Promise.resolve([] as Awaited<ReturnType<typeof listMembers>>["items"])
  const [
    data,
    financingSettings,
    migrationState,
    migrationMemberReview,
    legacyLoanDrafts,
    memberItems,
  ] = await Promise.all([
    getTenantFinanceSetup(context.tenant.id),
    getTenantFinancingSettingsWorkspace({ tenantId: context.tenant.id }),
    getTenantInitialMigrationState(context.tenant.id),
    listInitialMigrationMemberReview(context.tenant.id),
    legacyLoanDraftsPromise,
    memberItemsPromise,
  ])
  const previewMember = requestedMigrationMemberId
    ? (memberItems.find((member) => member.id === requestedMigrationMemberId) ??
      null)
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
          previewMember.id
        ),
      ])
    : null
  const selectedMemberAmountLogs = selectedMemberMigrationInputs?.[0] ?? []
  const selectedMemberActivityEvents = selectedMemberMigrationInputs?.[1] ?? []
  const profitMigrationOptions = selectedMemberMigrationInputs?.[2] ?? []
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
  const setup = toFinanceSetupViewModel(data)

  return (
    <TenantFinancePageView
      chargeDefinitions={setup.chargeDefinitions}
      financingSettings={toFinancingSettingsView(financingSettings)}
      generatedLedgerRows={generatedLedgerRows}
      initialMigrationSnapshot={migrationState.snapshot}
      legacyLoanDrafts={toLegacyLoanDraftRows(legacyLoanDrafts)}
      memberActivityEvents={toMemberActivityEventRows(
        selectedMemberActivityEvents
      )}
      memberAmountLogs={toMemberAmountLogRows(selectedMemberAmountLogs)}
      memberOptions={toMemberOptions(memberItems)}
      memberNumberPrefix={context.tenant.memberNumberPrefix}
      migrationMemberReview={toMigrationMemberReviewRows(migrationMemberReview)}
      profitMigrationOptions={toProfitMigrationOptionRows(
        profitMigrationOptions
      )}
      quickFillEnabled={canShowQuickFill(context)}
      section={section}
      selectedMigrationMemberId={previewMember?.id ?? null}
      selectedMigrationMemberLabel={
        previewMember
          ? `${previewMember.fullName} (${previewMember.memberNumber})`
          : null
      }
      shareBusinesses={setup.shareBusinesses}
      sharePolicy={setup.sharePolicy}
      shareStructureVersions={setup.shareStructureVersions}
      tenantStartDate={setup.tenantStartDate}
    />
  )
}
