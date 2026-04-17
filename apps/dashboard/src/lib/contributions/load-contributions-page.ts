import {
  createDbRuntime,
  listContributionPlans,
  listContributions,
  listLoans,
  listMembers,
} from "@halaal-vest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

export type ContributionPageFilterValues = {
  channel: string
  from: string
  memberId: string
  search: string
  to: string
}

export async function loadContributionsPageData(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canRecordContributions = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const filters: ContributionPageFilterValues = {
    channel: typeof searchParams.channel === "string" ? searchParams.channel : "",
    from: typeof searchParams.from === "string" ? searchParams.from : "",
    memberId: typeof searchParams.memberId === "string" ? searchParams.memberId : "",
    search: typeof searchParams.search === "string" ? searchParams.search : "",
    to: typeof searchParams.to === "string" ? searchParams.to : "",
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      canRecordContributions,
      filters,
      state: "unavailable" as const,
    }
  }

  const [contributions, members, commitmentPlans, loans] = await Promise.all([
    listContributions(context.tenant.id, {
      channel:
        filters.channel === "payroll" ||
        filters.channel === "transfer" ||
        filters.channel === "cash" ||
        filters.channel === "manual"
          ? filters.channel
          : undefined,
      fromDate: filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined,
      memberId: filters.memberId || undefined,
      page: 1,
      pageSize: 20,
      search: filters.search || undefined,
      toDate: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
    }),
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listContributionPlans(context.tenant.id),
    listLoans(context.tenant.id),
  ])

  return {
    canRecordContributions,
    commitmentPlans,
    contributions,
    filters,
    loans,
    members,
    state: "ready" as const,
  }
}
