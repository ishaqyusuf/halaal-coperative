import {
  createDbRuntime,
  getRepaymentSummary,
  listLoanOptions,
  listTenantUsersWithRoles,
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
    listLoanOptions(context.tenant.id, { statuses: ["active", "disbursed"] }),
    listTenantUsersWithRoles(context.tenant.id, [
      "super_admin",
      "tenant_admin",
      "finance_officer",
      "operations_officer",
    ]),
    getRepaymentSummary({ tenantId: context.tenant.id }),
  ])
  const canPostRepayment = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  return {
    assignees: tenantUsers.map((user) => ({
      id: user.id,
      label: `${user.fullName} (${user.email})`,
    })),
    canPostRepayment,
    loans: loans.map((loan) => ({
      id: loan.id,
      label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
      outstandingPrincipal: loan.outstandingPrincipal,
    })),
    quickFillEnabled: canShowQuickFill(context),
    state: "ready",
    summary,
  }
}
