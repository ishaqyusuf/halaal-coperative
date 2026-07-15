import type { Metadata } from "next"
import {
  createDbRuntime,
  defaultTenantBusinessProfitPolicy,
  getTenantFinanceSetup,
} from "@halaalvest/db"
import { FinanceBusinessSettingsView } from "@/components/finance-business-settings-view"
import { loadTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Business | Finance Settings",
}

export default async function FinanceBusinessPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  loadTenantFinanceSettingsParams(resolvedSearchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const quickFillEnabled = canShowQuickFill(context)

  let businessPolicy = defaultTenantBusinessProfitPolicy
  let tenantName = context.tenant?.name ?? "Demo cooperative"

  if (context.tenant && runtime.status === "database-configured") {
    const data = await getTenantFinanceSetup(context.tenant.id)
    tenantName = data.tenant?.name ?? context.tenant.name
    businessPolicy = data.businessPolicy
  }

  return (
    <FinanceBusinessSettingsView
      businessPolicy={businessPolicy}
      quickFillEnabled={quickFillEnabled}
      tenantName={tenantName}
    />
  )
}
