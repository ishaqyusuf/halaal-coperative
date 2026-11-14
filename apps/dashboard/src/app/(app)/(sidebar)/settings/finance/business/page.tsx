import type { Metadata } from "next"
import {
  createDbRuntime,
  getTenantBusinessProfitPolicy,
  getTenantFinanceSetupLock,
} from "@halaalvest/db"
import { ProfitSettingsView } from "@/components/finance-settings/profit-settings-view"
import { FinanceSettingsUnavailableView } from "@/components/finance-settings-page-states"
import { loadTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Business profit | Finance setup",
}

export default async function FinanceBusinessPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  loadTenantFinanceSettingsParams(searchParams ? await searchParams : {})
  const context = await getDashboardServerContext()

  if (!context.tenant || createDbRuntime().status !== "database-configured") {
    return <FinanceSettingsUnavailableView />
  }

  const [businessPolicy, lock] = await Promise.all([
    getTenantBusinessProfitPolicy(context.tenant.id),
    getTenantFinanceSetupLock(context.tenant.id),
  ])

  return (
    <ProfitSettingsView
      businessPolicy={businessPolicy}
      canChangePastProfit={!lock.isLocked}
      quickFillEnabled={canShowQuickFill(context)}
    />
  )
}
