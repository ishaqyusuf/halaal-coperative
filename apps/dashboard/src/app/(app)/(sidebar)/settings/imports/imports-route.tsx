import {
  createDbRuntime,
  getImportKindSummaries,
  getTenantImportReadiness,
} from "@halaalvest/db"
import {
  ImportsRuntimeUnavailable,
  ImportsSettingsView,
  type ImportKindProgress,
  type ImportSettingsSection,
} from "@/components/imports-settings-view"
import type { ImportAvailability } from "@/components/imports/import-types"
import { loadImportFilterParams } from "@/hooks/use-import-filter-params"
import { loadImportParams } from "@/hooks/use-import-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import type { DashboardImportKind } from "@/lib/import-csv"
import { getImportListInput } from "@/lib/imports/import-list-input"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
  workspaceConfigurationRoles,
} from "@/lib/workspace-access"

function buildImportAvailability({
  canConfigureWorkspace,
  canManageFinance,
  closedReason,
  historicalSetupBlockedReason,
  memberProfilesBlockedReason,
}: {
  canConfigureWorkspace: boolean
  canManageFinance: boolean
  closedReason?: string | null
  historicalSetupBlockedReason?: string | null
  memberProfilesBlockedReason?: string | null
}): ImportAvailability {
  const available = (blockedReason?: string | null) =>
    blockedReason
      ? { blockedReason, isAvailable: false }
      : { isAvailable: true }
  const configurationRoleReason = canConfigureWorkspace
    ? null
    : "Only cooperative admins can add members, workplaces and loan types."
  const financeRoleReason = canManageFinance
    ? null
    : "Only finance staff can add charges, loans and repayments."
  const memberRecords =
    closedReason ?? historicalSetupBlockedReason ?? memberProfilesBlockedReason

  return {
    charges: available(financeRoleReason ?? memberRecords),
    contributions: available(memberRecords),
    deduction_sources: available(configurationRoleReason ?? closedReason),
    loan_migrations: available(financeRoleReason ?? memberRecords),
    loan_products: available(configurationRoleReason ?? closedReason),
    members: available(
      configurationRoleReason ?? closedReason ?? historicalSetupBlockedReason
    ),
    repayment_migrations: available(financeRoleReason ?? memberRecords),
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

  const isOverview = section === "overview"
  const importKind =
    section !== "overview" && section !== "batches" ? section : undefined
  const [initialSettings, readiness, summaries] = await Promise.all([
    getInitialTableSettings("imports"),
    canManageImports ? getTenantImportReadiness(context.tenant.id) : null,
    isOverview && canManageImports
      ? getImportKindSummaries(context.tenant.id)
      : Promise.resolve([]),
  ])
  const setupSteps = readiness
    ? [
        !readiness.hasFinanceStartDate && "the date your records start",
        !readiness.hasChargeSchedules && "your charges and levies",
        !readiness.hasBusinessProfitPools &&
          "your past business profits (or say there were none)",
      ].filter(Boolean)
    : []
  const closedReason =
    readiness?.canUseMigrationTools === false
      ? "Imports are closed because your cooperative is live. Add new records on their own pages."
      : readiness?.hasAppliedMemberBackfill
        ? "Imports are closed because members' past monthly records have already been added."
        : null
  const historicalSetupBlockedReason = setupSteps.length
    ? `First set ${setupSteps.join(" and ")} in Finance setup.`
    : null
  const memberProfilesBlockedReason =
    readiness?.hasMemberProfiles === false ? "Add your members first." : null
  const importAvailability = buildImportAvailability({
    canConfigureWorkspace,
    canManageFinance,
    closedReason,
    historicalSetupBlockedReason,
    memberProfilesBlockedReason,
  })
  const progress: Partial<Record<DashboardImportKind, ImportKindProgress>> =
    Object.fromEntries(
      summaries.map((summary) => [
        summary.importType,
        {
          addedRows: summary.addedRows,
          lastAddedAt: summary.lastAddedAt,
          waitingBatches: summary.waitingBatches,
        },
      ])
    )
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
    batchPrefetch([importOptions])
  }

  return (
    <HydrateClient>
      <ImportsSettingsView
        canManageImports={canManageImports}
        importAvailability={importAvailability}
        initialSettings={initialSettings}
        lockedReason={closedReason}
        progress={progress}
        quickFillEnabled={quickFillEnabled}
        section={section}
      />
    </HydrateClient>
  )
}
