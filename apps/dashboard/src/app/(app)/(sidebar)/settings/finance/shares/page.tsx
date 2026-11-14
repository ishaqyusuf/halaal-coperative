import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { createDbRuntime, getFinanceShareSettings } from "@halaalvest/db"
import { ShareSettingsView } from "@/components/finance-settings/share-settings-view"
import { FinanceSettingsUnavailableView } from "@/components/finance-settings-page-states"
import { loadShareParams } from "@/hooks/use-share-params"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Shares | Finance setup",
}

export default async function ShareSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  loadShareParams(await searchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant || createDbRuntime().status !== "database-configured") {
    return <FinanceSettingsUnavailableView />
  }

  const data = await getFinanceShareSettings(context.tenant.id)

  return (
    <ShareSettingsView
      lock={data.lock}
      sharePolicy={data.sharePolicy}
      shareVersions={data.shareVersions}
      startDate={data.startDate}
    />
  )
}
