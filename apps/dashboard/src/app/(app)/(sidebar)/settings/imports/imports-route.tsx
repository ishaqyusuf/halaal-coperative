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
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"
import { getEnumValue } from "@/utils/enum"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

type RawImportBatch = Awaited<ReturnType<typeof listImportBatches>>[number]
type ImportSortField =
  | "createdAt"
  | "createdBy"
  | "importType"
  | "reviewCount"
  | "status"
  | "totalRows"

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
  historicalSetupBlockedReason,
  memberProfilesBlockedReason,
  migrationToolsLockedReason,
}: {
  backfillLockedReason?: string | null
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

  return {
    charges: available(
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
      migrationToolsLockedReason ?? backfillLockedReason
    ),
    loan_migrations: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    loan_products: available(
      migrationToolsLockedReason ?? backfillLockedReason
    ),
    members: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason
    ),
    repayment_migrations: available(
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

function getImportSort(
  sort?: string[] | null
): [ImportSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "createdAt",
    "createdBy",
    "importType",
    "reviewCount",
    "status",
    "totalRows",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ImportSortField, direction]
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
  const quickFillEnabled = canShowQuickFill(context)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <ImportsRuntimeUnavailable />
  }

  const [initialSettings, referenceData, rawBatches, migrationState] =
    await Promise.all([
      getInitialTableSettings("imports"),
      getImportReferenceData(context.tenant.id),
      listImportBatches(context.tenant.id),
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
    historicalSetupBlockedReason,
    memberProfilesBlockedReason,
    migrationToolsLockedReason,
  })
  const isOverview = section === "overview"
  const importKind =
    section !== "overview" && section !== "batches" ? section : undefined
  const shouldHydrateTable = canManageImports && !isOverview

  if (shouldHydrateTable) {
    const importInput = {
      importType: importKind,
      q: filter.q ?? undefined,
      sort: getImportSort(sort),
      status: getEnumValue(filter.status, [
        "applied",
        "draft",
        "failed",
      ] as const),
    }
    const importOptions = trpc.imports.batches.infiniteQueryOptions(
      importInput,
      {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }
    )
    const caller = await getServerCaller()
    const initialImportPage = await caller.imports.batches(importInput)

    getQueryClient().setQueryData(importOptions.queryKey, {
      pageParams: [importOptions.initialPageParam],
      pages: [initialImportPage],
    })
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
