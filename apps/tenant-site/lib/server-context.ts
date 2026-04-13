import { resolveTenantAsync } from "@halaal-vest/db"
import { buildDashboardSnapshot } from "@halaal-vest/domain"
import { headers } from "next/headers"

export async function getTenantSiteServerContext() {
  const headerStore = await headers()
  const host = headerStore.get("host")
  const tenantSlug = headerStore.get("x-tenant-subdomain")
  const tenantHostname = headerStore.get("x-tenant-hostname")
  const tenantResolution = await resolveTenantAsync({
    slug: tenantSlug,
    hostname: tenantHostname ?? host,
  })

  return {
    tenant: tenantResolution.tenant,
    tenantResolution,
  }
}

export async function getTenantSitePageData() {
  const context = await getTenantSiteServerContext()
  const tenant =
    context.tenant ??
    ({
      id: "platform-public-demo",
      slug: "public-demo",
      name: "Cooperative Tenant Preview",
      region: null,
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      status: "active",
      memberCount: 0,
    } as const)

  return {
    dashboard: buildDashboardSnapshot({
      tenant,
    }),
    tenant,
    tenantResolution: context.tenantResolution,
  }
}
