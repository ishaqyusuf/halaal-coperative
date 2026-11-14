import type { Metadata } from "next"
import { createDbRuntime, listTenantDomainsByTenantId } from "@halaalvest/db"
import { DomainsView } from "@/components/domains-view"
import { loadDomainParams } from "@/hooks/use-domain-params"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Domains | Halaalvest",
}

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadDomainParams(await searchParams)
  const context = await getDashboardServerContext()
  // One read: the main address is the list's primary row, so the onboarding
  // state is no longer loaded here (thread 15).
  const domains =
    context.tenant && createDbRuntime().status === "database-configured"
      ? await listTenantDomainsByTenantId(context.tenant.id)
      : []

  return <DomainsView devMode={canShowQuickFill(context)} domains={domains} />
}
