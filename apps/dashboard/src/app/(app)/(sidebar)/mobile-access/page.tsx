import { normalizeRole, roleCan } from "@halaalvest/auth/roles"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DashboardPageShell, DashboardPageTitle } from "@/components/dashboard"
import { AdminAccessView } from "@/components/mobile-access/admin-access-view"
import { CooperativeInvoicesView } from "@/components/mobile-access/cooperative-invoices-view"
import { defaultAccessQueue } from "@/components/mobile-access/format"
import { MemberAccessView } from "@/components/mobile-access/member-access-view"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Mobile access | Halaalvest",
}

export default async function MobileAccessPage() {
  const context = await getDashboardServerContext()
  const role = normalizeRole(context.auth.membership?.role ?? null)
  const canReview = role === "tenant_admin" || role === "super_admin"
  const canViewInvoices = role ? roleCan(role, "view_reports") : false
  const isMember = role === "member"

  if (!context.tenant || (!isMember && !canReview && !canViewInvoices)) {
    notFound()
  }

  if (isMember) {
    prefetch(trpc.cooperativeMobileAccess.memberStatus.queryOptions())
  }
  if (canReview) {
    prefetch(
      trpc.cooperativeMobileAccess.queue.infiniteQueryOptions(
        defaultAccessQueue,
        { getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined }
      )
    )
  }
  if (canViewInvoices) {
    prefetch(trpc.cooperativeMobileBilling.listInvoices.queryOptions())
  }

  return (
    <HydrateClient>
      <DashboardPageShell>
        <DashboardPageTitle
          action={
            context.auth.user?.isPlatformOwner ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/platform/mobile-access-invoices"
              >
                Platform invoices
              </Link>
            ) : null
          }
          description={
            isMember
              ? "Request access to the Halaalvest app through your cooperative."
              : canReview
                ? "Manage member access and view your cooperative’s mobile access invoices."
                : "View your cooperative’s mobile access invoices."
          }
          title="Mobile access"
        />
        {isMember ? <MemberAccessView /> : null}
        {canReview ? <AdminAccessView /> : null}
        {canViewInvoices ? <CooperativeInvoicesView /> : null}
      </DashboardPageShell>
    </HydrateClient>
  )
}
