import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { createDbRuntime, getFinanceChargeSettings } from "@halaalvest/db"
import { ChargeSettingsView } from "@/components/finance-settings/charge-settings-view"
import { FinanceSettingsUnavailableView } from "@/components/finance-settings-page-states"
import { loadChargeParams } from "@/hooks/use-charge-params"
import { toChargeSettingsRows } from "@/lib/finance/charge-settings-rows"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Charges | Finance setup",
}

export default async function FinanceChargesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  loadChargeParams(await searchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant || createDbRuntime().status !== "database-configured") {
    return <FinanceSettingsUnavailableView />
  }

  const data = await getFinanceChargeSettings(context.tenant.id)

  return (
    <ChargeSettingsView
      charges={toChargeSettingsRows(data.charges)}
      lock={data.lock}
      quickFillEnabled={canShowQuickFill(context)}
      startDate={data.startDate}
    />
  )
}
