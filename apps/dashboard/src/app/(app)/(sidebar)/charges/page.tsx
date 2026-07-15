import {
  createDbRuntime,
  listChargeApplications,
  listChargeDefinitions,
  listMembers,
} from "@halaalvest/db"
import {
  ChargesPageView,
  ChargesUnavailableView,
} from "@/components/charges-page-view"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { loadChargeOperationParams } from "@/hooks/use-charge-operation-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type ChargeLibrarySortField =
  | "amount"
  | "currentEffectiveFrom"
  | "isActive"
  | "kind"
  | "name"

function getSort(
  sort?: string[] | null
): [ChargeLibrarySortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "amount",
    "currentEffectiveFrom",
    "isActive",
    "kind",
    "name",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ChargeLibrarySortField, direction]
}

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  loadChargeOperationParams(params)
  const { sort } = loadSortParams(params)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageCharges = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  if (!context.tenant || runtime.status !== "database-configured") {
    return <ChargesUnavailableView />
  }

  const [charges, members, chargeApplications] = await Promise.all([
    listChargeDefinitions(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listChargeApplications(context.tenant.id, { limit: 20 }),
  ])

  const activeCharges = charges.filter((charge: any) => charge.isActive)
  const monthlyLevies = charges.filter((charge: any) => charge.isMonthlyLevy)
  const postedApplications = chargeApplications.filter(
    (application: any) => application.status === "posted"
  )
  const today = new Date()
  const [chargeLibraryTableSettings, caller] = await Promise.all([
    getInitialTableSettings("chargeLibrary"),
    getServerCaller(),
  ])
  const chargeLibraryInput = {
    sort: getSort(sort),
  }
  const chargeLibraryOptions = trpc.charges.chargeLibrary.infiniteQueryOptions(
    chargeLibraryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const initialChargeLibraryPage =
    await caller.charges.chargeLibrary(chargeLibraryInput)

  getQueryClient().setQueryData(chargeLibraryOptions.queryKey, {
    pageParams: [chargeLibraryOptions.initialPageParam],
    pages: [initialChargeLibraryPage],
  })

  return (
    <HydrateClient>
      <ChargesPageView
        activeCharges={activeCharges}
        canManageCharges={canManageCharges}
        chargeApplications={chargeApplications}
        chargeLibraryTableSettings={chargeLibraryTableSettings}
        charges={charges.map((charge: any) => {
          const sortedVersions = [...(charge.versions ?? [])].sort(
            (left, right) =>
              new Date(right.effectiveFrom).getTime() -
              new Date(left.effectiveFrom).getTime()
          )
          const currentVersion =
            sortedVersions.find(
              (version) =>
                new Date(version.effectiveFrom).getTime() <= today.getTime()
            ) ?? null

          return {
            amount: currentVersion
              ? Number(currentVersion.amount)
              : Number(charge.amount),
            chargeValueType:
              charge.chargeValueType ??
              (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
            code: charge.code,
            currentEffectiveFrom: currentVersion
              ? currentVersion.effectiveFrom.toISOString().slice(0, 10)
              : null,
            id: charge.id,
            isActive: charge.isActive,
            isMonthlyLevy: charge.isMonthlyLevy,
            kind: charge.kind,
            name: charge.name,
            versions: sortedVersions.map((version: any) => ({
              amount: Number(version.amount),
              effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
              id: version.id,
              notes: version.notes ?? null,
              status:
                currentVersion?.id === version.id
                  ? "current"
                  : new Date(version.effectiveFrom).getTime() > today.getTime()
                    ? "scheduled"
                    : "historical",
            })),
          }
        })}
        members={members}
        monthlyLevies={monthlyLevies}
        postedApplications={postedApplications}
        quickFillEnabled={canShowQuickFill(context)}
      />
    </HydrateClient>
  )
}
