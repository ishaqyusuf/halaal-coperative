import {
  createDbRuntime,
  getImportReferenceData,
  getTenantInitialMigrationState,
  listImportBatches,
} from "@halaalvest/db"
import {
  ImportsRuntimeUnavailable,
  ImportsSettingsView,
  type ImportSettingsSection,
} from "@/components/imports-settings-view"
import type { ImportBatchRow } from "@/components/tables/imports/data-table"
import type { ImportAvailability } from "@/components/forms/import-forms"
import { loadImportFilterParams } from "@/hooks/use-import-filter-params"
import { loadImportParams } from "@/hooks/use-import-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getImportListInput } from "@/lib/imports/import-list-input"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import {
  batchPrefetch,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
  workspaceConfigurationRoles,
} from "@/lib/workspace-access"

type RawImportBatch = Awaited<ReturnType<typeof listImportBatches>>[number]

function getMissingLabels(
  missingStepKeys: string[],
  stepLabels: Map<string, string>,
  stepKeys: string[]
) {
  return missingStepKeys
    .filter((stepKey) => stepKeys.includes(stepKey))
    .map((stepKey) => stepLabels.get(stepKey) ?? stepKey.replaceAll("_", " "))
}

function buildImportAvailability({
  backfillLockedReason,
  canConfigureWorkspace,
  canManageFinance,
  historicalSetupBlockedReason,
  memberProfilesBlockedReason,
  migrationToolsLockedReason,
}: {
  backfillLockedReason?: string | null
  canConfigureWorkspace: boolean
  canManageFinance: boolean
  historicalSetupBlockedReason?: string | null
  memberProfilesBlockedReason?: string | null
  migrationToolsLockedReason?: string | null
}): ImportAvailability {
  const available = (blockedReason?: string | null) =>
    blockedReason
      ? {
          blockedReason,
          isAvailable: false,
        }
      : {
          isAvailable: true,
        }
  const configurationRoleReason = canConfigureWorkspace
    ? null
    : "Only workspace configuration staff can import members, collection sources, or loan products."
  const financeRoleReason = canManageFinance
    ? null
    : "Only cooperative finance staff can import charges, loan migrations, or repayment migrations."

  return {
    charges: available(
      financeRoleReason ??
        migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    contributions: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    deduction_sources: available(
      configurationRoleReason ??
        migrationToolsLockedReason ??
        backfillLockedReason
    ),
    loan_migrations: available(
      financeRoleReason ??
        migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    loan_products: available(
      configurationRoleReason ??
        migrationToolsLockedReason ??
        backfillLockedReason
    ),
    members: available(
      configurationRoleReason ??
        migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason
    ),
    repayment_migrations: available(
      financeRoleReason ??
        migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
  }
}

function mapBatch(batch: RawImportBatch): ImportBatchRow {
  return {
    ...batch,
    _count: batch._count ?? { rows: batch.totalRows ?? batch.rows?.length ?? 0 },
  }
}

export async function ImportsSettingsRoute({
  searchParams,
  section = "overview",
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  section?: ImportSettingsSection
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const filter = loadImportFilterParams(resolvedSearchParams)
  loadImportParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)

  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageImports = hasAnyRole(
    context.auth.membership?.role,
    allStaffRoles
  )
  const canConfigureWorkspace = hasAnyRole(
    context.auth.membership?.role,
    workspaceConfigurationRoles
  )
  const canManageFinance = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )
  const quickFillEnabled = canShowQuickFill(context)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <ImportsRuntimeUnavailable />
  }

  const [initialSettings, referenceData, rawBatches, migrationState] =
    await Promise.all([
      getInitialTableSettings("imports"),
      getImportReferenceData(context.tenant.id),
      section === "overview"
        ? listImportBatches(context.tenant.id)
        : Promise.resolve([]),
      getTenantInitialMigrationState(context.tenant.id),
    ])
  const batches = rawBatches.map(mapBatch)
  const historicalSetupStepKeys = [
    "finance_start_date",
    "charge_schedules",
  ]
  const stepLabels = new Map(
    migrationState.snapshot.steps.map((step) => [step.key, step.label])
  )
  const historicalSetupBlockingLabels = getMissingLabels(
    migrationState.snapshot.missingStepKeys,
    stepLabels,
    historicalSetupStepKeys
  )
  const memberProfilesBlockingLabels = getMissingLabels(
    migrationState.snapshot.missingStepKeys,
    stepLabels,
    ["member_profiles"]
  )
  const historicalSetupReady = historicalSetupBlockingLabels.length === 0
  const legacyLoanReviewReady =
    !migrationState.snapshot.missingStepKeys.includes("legacy_loans")
  const memberProfilesReady =
    !migrationState.snapshot.missingStepKeys.includes("member_profiles")
  const hasAppliedMemberBackfill =
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  const migrationToolsLockedReason = migrationState.snapshot
    .canUseMigrationTools
    ? null
    : "Initial migration tools are locked for this cooperative. Use normal live workflows instead."
  const backfillLockedReason = hasAppliedMemberBackfill
    ? "Member ledger backfill has started, so historical imports are locked."
    : null
  const historicalSetupBlockedReason = historicalSetupBlockingLabels.length
    ? `Complete historical finance setup first: ${historicalSetupBlockingLabels.join(", ")}.`
    : null
  const memberProfilesBlockedReason = memberProfilesBlockingLabels.length
    ? `Import member profiles first: ${memberProfilesBlockingLabels.join(", ")}.`
    : null
  const importAvailability = buildImportAvailability({
    backfillLockedReason,
    canConfigureWorkspace,
    canManageFinance,
    historicalSetupBlockedReason,
    memberProfilesBlockedReason,
    migrationToolsLockedReason,
  })
  const isOverview = section === "overview"
  const importKind =
    section !== "overview" && section !== "batches" ? section : undefined
  const shouldHydrateTable = canManageImports && !isOverview

  if (shouldHydrateTable) {
    const importInput = getImportListInput({
      importKind,
      q: filter.q,
      sort,
      status: filter.status,
    })
    const importOptions = trpc.imports.batches.infiniteQueryOptions(
      importInput,
      {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }
    )
    void batchPrefetch([importOptions])
  }

  return (
    <HydrateClient>
      <ImportsSettingsView
        backfillLockedReason={backfillLockedReason}
        batches={batches}
        canManageImports={canManageImports}
        historicalSetupBlockingLabels={historicalSetupBlockingLabels}
        historicalSetupReady={historicalSetupReady}
        importAvailability={importAvailability}
        initialSettings={initialSettings}
        legacyLoanReviewReady={legacyLoanReviewReady}
        memberProfilesBlockingLabels={memberProfilesBlockingLabels}
        memberProfilesReady={memberProfilesReady}
        migrationToolsLockedReason={migrationToolsLockedReason}
        quickFillEnabled={quickFillEnabled}
        referenceData={referenceData}
        section={section}
      />
    </HydrateClient>
  )
}
