import { createDbRuntime, listTenantDomainsByTenantId } from "@halaalvest/db"
import { DomainsView } from "@/components/domains-view"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"

export default async function DomainsPage() {
  const { onboarding } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const domains =
    context.tenant && runtime.status === "database-configured"
      ? await listTenantDomainsByTenantId(context.tenant.id)
      : []

  return (
    <DomainsView
      canonicalHostname={onboarding?.primarySiteHostname}
      domains={domains}
    />
  )
}
