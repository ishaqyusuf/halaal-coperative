import { normalizeRole, roleCan } from "@halaalvest/auth/roles"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { DashboardPageShell, DashboardPageTitle } from "@/components/dashboard"
import {
  AdminAccessView,
  accessListPageSize,
} from "@/components/mobile-access/admin-access-view"
import { MemberAccessView } from "@/components/mobile-access/member-access-view"
import { loadMobileAccessFilterParams } from "@/hooks/use-mobile-access-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Mobile access | Halaalvest",
}

export default async function MobileAccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
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
    const { accessList } = await loadMobileAccessFilterParams(searchParams)
    prefetch(trpc.cooperativeMobileAccess.summary.queryOptions())
    prefetch(
      trpc.cooperativeMobileAccess.queue.infiniteQueryOptions(
        { status: accessList, limit: accessListPageSize },
        { getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined }
      )
    )
  }

  return (
    <HydrateClient>
      <DashboardPageShell>
        <DashboardPageTitle
          action={
            canViewInvoices ? (
              <Link
                className={buttonVariants({
                  className: "text-base",
                  variant: "outline",
                  size: "touch",
                })}
                href="/billing"
              >
                Bills
              </Link>
            ) : null
          }
          title="Mobile access"
        />
        <div className="space-y-10">
          {isMember ? <MemberAccessView /> : null}
          {canReview ? <AdminAccessView /> : null}
        </div>
      </DashboardPageShell>
    </HydrateClient>
  )
}
