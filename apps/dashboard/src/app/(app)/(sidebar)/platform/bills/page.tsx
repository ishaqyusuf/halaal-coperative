import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PlatformBillsView } from "@/components/billing/platform-bills-view"
import { DashboardPageShell, DashboardPageTitle } from "@/components/dashboard"
import { PlatformTabs } from "@/components/platform/platform-tabs"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Halaalvest bills | Halaalvest",
}

export default async function PlatformBillsPage() {
  const context = await getDashboardServerContext()
  if (!context.auth.user?.isPlatformOwner) notFound()

  prefetch(trpc.platformBilling.listReceivables.queryOptions())

  return (
    <HydrateClient>
      <DashboardPageShell>
        <PlatformTabs />
        <DashboardPageTitle title="Halaalvest bills" />
        <PlatformBillsView />
      </DashboardPageShell>
    </HydrateClient>
  )
}
