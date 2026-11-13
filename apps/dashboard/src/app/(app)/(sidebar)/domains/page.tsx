import type { Metadata } from "next"
import {
  createDbRuntime,
  getTenantOnboardingState,
  listTenantDomainsByTenantId,
} from "@halaalvest/db"
import { DomainsView } from "@/components/domains-view"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Domains | Halaalvest",
}

export default async function DomainsPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  // Only the primary site hostname is needed, not the dashboard bundle
  // (metrics, recent members, contributions and charge definitions).
  const [onboarding, domains] = await Promise.all([
    context.tenant ? getTenantOnboardingState(context.tenant.id) : null,
    context.tenant && runtime.status === "database-configured"
      ? listTenantDomainsByTenantId(context.tenant.id)
      : [],
  ])

  return (
    <DomainsView
      canonicalHostname={onboarding?.primarySiteHostname}
      domains={domains}
    />
  )
}
