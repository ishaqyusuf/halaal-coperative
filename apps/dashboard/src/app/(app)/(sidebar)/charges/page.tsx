import {
  createDbRuntime,
  listChargeApplications,
  listChargeDefinitions,
  listMembers,
} from "@halaalvest/db"
import type { Metadata } from "next"
import {
  ChargesPageView,
  ChargesUnavailableView,
} from "@/components/charges-page-view"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { loadChargeOperationParams } from "@/hooks/use-charge-operation-params"
import { loadChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getChargeLibraryListInput } from "@/lib/charges/charge-library-list-input"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Charges | Halaalvest",
}

type ChargeDefinitionRecord = {
  amount: number | string | { toString(): string }
  chargeValueType?: string | null
  code: string
  id: string
  isActive: boolean
  isMonthlyLevy: boolean
  kind: string
  name: string
}

type ChargeApplicationRecord = {
  amount: number | string | { toString(): string }
  chargeApplicability?: { trigger: string; workflow: string } | null
  chargeDefinition: { name: string }
  collectionMode?: string
  foodPurchaseApplication?: { status: string } | null
  id: string
  loanRequest?: { status: string } | null
  member: { fullName: string }
  procurementRequest?: { itemName: string; status: string } | null
  projectFinancingRequest?: { businessName: string; status: string } | null
  status: string
}

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  loadChargeOperationParams(params)
  const filter = loadChargeFilterParams(params)
  const activeView =
    filter.view === "applications" ? "applications" : "definitions"
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

  const chargeDefinitions = charges as ChargeDefinitionRecord[]
  const applications = chargeApplications as ChargeApplicationRecord[]

  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)
  const manuallyApplicableCharges = activeCharges
    .filter(
      (charge) =>
        (charge.chargeValueType ??
          (charge.kind === "percentage" ? "percentage" : "fixed_amount")) ===
        "fixed_amount"
    )
    .map((charge) => ({
      amount: Number(charge.amount),
      code: charge.code,
      id: charge.id,
      isActive: charge.isActive,
      isMonthlyLevy: charge.isMonthlyLevy,
      kind: charge.kind,
      name: charge.name,
    }))
  const monthlyLevies = chargeDefinitions.filter(
    (charge) => charge.isMonthlyLevy
  )
  const postedApplications = applications.filter(
    (application) => application.status === "posted"
  )
  const chargeLibraryTableSettings =
    await getInitialTableSettings("chargeLibrary")
  const chargeLibraryInput = getChargeLibraryListInput(filter, sort)
  await batchPrefetch([
    trpc.charges.chargeLibrary.queryOptions(chargeLibraryInput),
  ])

  return (
    <HydrateClient>
      <ChargesPageView
        activeView={activeView}
        activeChargeCount={activeCharges.length}
        activeCharges={manuallyApplicableCharges}
        canManageCharges={canManageCharges}
        chargeApplications={applications}
        chargeLibraryTableSettings={chargeLibraryTableSettings}
        members={members}
        monthlyLevies={monthlyLevies}
        postedApplications={postedApplications}
        quickFillEnabled={canShowQuickFill(context)}
        totalChargeDefinitions={chargeDefinitions.length}
      />
    </HydrateClient>
  )
}
