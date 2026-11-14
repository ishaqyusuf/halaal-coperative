import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { createDbRuntime, getFinanceSettingsOverview } from "@halaalvest/db"
import { FinanceOverviewView } from "@/components/finance-settings/finance-overview-view"
import { FinanceSettingsUnavailableView } from "@/components/finance-settings-page-states"
import { loadTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Finance setup | Halaalvest",
}

export default async function FinanceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  loadTenantFinanceSettingsParams(await searchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant || createDbRuntime().status !== "database-configured") {
    return <FinanceSettingsUnavailableView />
  }

  return (
    <FinanceOverviewView
      data={await getFinanceSettingsOverview(context.tenant.id)}
      quickFillEnabled={canShowQuickFill(context)}
    />
  )
}
