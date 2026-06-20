import {
  createDbRuntime,
  listContributionPlans,
  listContributions,
  listLoans,
  listMembers,
} from "@halaalvest/db"
import type { ContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

export async function loadContributionsPageData(
  filters: ContributionsFilterParams,
) {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canRecordContributions = hasAnyRole(context.auth.membership?.role, allStaffRoles)

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
      memberId: filters.memberId ?? undefined,
      page: 1,
      pageSize: 20,
      search: filters.search ?? undefined,
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
