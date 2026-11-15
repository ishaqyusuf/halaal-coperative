import { normalizeRole, roleCan } from "@halaalvest/auth/roles"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BillingView } from "@/components/billing/billing-view"
import { DashboardPageShell, DashboardPageTitle } from "@/components/dashboard"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Billing | Halaalvest",
}

/** Halaalvest's monthly bill to the cooperative. Private, request-time. */
export default async function BillingPage() {
  const context = await getDashboardServerContext()
  const role = normalizeRole(context.auth.membership?.role ?? null)
  if (!context.tenant || !role || !roleCan(role, "view_reports")) notFound()

  prefetch(trpc.platformBilling.overview.queryOptions())
  prefetch(trpc.platformBilling.listBills.queryOptions())

  return (
    <HydrateClient>
      <DashboardPageShell>
        <DashboardPageTitle
          action={
            context.auth.user?.isPlatformOwner ? (
              <Link
                className={buttonVariants({
                  className: "h-11 text-base",
                  variant: "outline",
                })}
                href="/platform/bills"
              >
                All cooperative bills
              </Link>
            ) : null
          }
          title="Billing"
        />
        <BillingView canManageSettings={roleCan(role, "manage_subscription")} />
      </DashboardPageShell>
    </HydrateClient>
  )
}
