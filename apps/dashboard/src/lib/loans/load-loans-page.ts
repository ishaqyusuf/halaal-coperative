import {
  createDbRuntime,
  listLoanProducts,
  listLoanRequests,
  listLoans,
  listMembers,
} from "@halaalvest/db"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export async function loadLoansPageData() {
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
    }
  }

  const [members, loanProducts, loanRequests, loans] = await Promise.all([
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listLoanProducts(context.tenant.id),
    listLoanRequests(context.tenant.id),
    listLoans(context.tenant.id),
  ])

  return {
    canReview: hasAnyRole(context.auth.membership?.role, financeManagementRoles),
    canSubmit: hasAnyRole(context.auth.membership?.role, allStaffRoles),
    dashboard,
    loanProducts,
    loanRequests,
    loans,
    members,
    state: "ready" as const,
  }
}
