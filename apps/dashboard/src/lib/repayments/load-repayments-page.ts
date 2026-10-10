import {
  createDbRuntime,
  getRepaymentSummary,
  listLoans,
  listTenantUsersWithMemberships,
  type RepaymentSummary,
} from "@halaalvest/db"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export type RepaymentLoanOption = {
  id: string
  label: string
  outstandingPrincipal: number
}

export type RepaymentAssigneeOption = {
  id: string
  label: string
}

export type RepaymentsPageData =
  | { state: "unavailable" }
  | {
      assignees: RepaymentAssigneeOption[]
      canPostRepayment: boolean
      loans: RepaymentLoanOption[]
      quickFillEnabled: boolean
      state: "ready"
      summary: RepaymentSummary
    }

export async function loadRepaymentsPageData(): Promise<RepaymentsPageData> {
  const [context, runtime] = await Promise.all([
    getDashboardServerContext(),
    Promise.resolve(createDbRuntime()),
  ])

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" }
  }

  const [loans, tenantUsers, summary] = await Promise.all([
    listLoans(context.tenant.id),
    listTenantUsersWithMemberships(context.tenant.id),
    getRepaymentSummary({ tenantId: context.tenant.id }),
  ])
  const canPostRepayment = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  return {
    assignees: tenantUsers
      .filter((user) =>
        user.memberships.some((membership) =>
          [
            "super_admin",
            "tenant_admin",
            "finance_officer",
            "operations_officer",
          ].includes(membership.role)
        )
      )
      .map((user) => ({
        id: user.id,
        label: `${user.fullName} (${user.email})`,
      })),
    canPostRepayment,
    loans: loans
      .filter((loan) => ["active", "disbursed"].includes(loan.status))
      .map((loan) => ({
        id: loan.id,
        label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
        outstandingPrincipal: Number(loan.outstandingPrincipal),
      })),
    quickFillEnabled: canShowQuickFill(context),
    state: "ready",
    summary,
  }
}
