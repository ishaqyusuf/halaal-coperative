import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DashboardPageShell, DashboardPageTitle } from "@/components/dashboard"
import { PlatformReceivablesView } from "@/components/mobile-access/platform-receivables-view"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Cooperative mobile access invoices | Halaalvest",
}

export default async function PlatformMobileAccessInvoicesPage() {
  const context = await getDashboardServerContext()
  if (!context.auth.user?.isPlatformOwner) notFound()

  prefetch(trpc.cooperativeMobileBilling.listReceivables.queryOptions())

  return (
    <HydrateClient>
      <DashboardPageShell>
        <DashboardPageTitle
          description="Record confirmed bank transfers against cooperative invoices."
          title="Cooperative mobile access invoices"
        />
        <PlatformReceivablesView />
      </DashboardPageShell>
    </HydrateClient>
  )
}
