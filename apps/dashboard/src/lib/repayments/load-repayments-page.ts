import {
  createDbRuntime,
  getRepaymentSummary,
  type RepaymentSummary,
} from "@halaalvest/db"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export type RepaymentAssigneeOption = {
  id: string
  label: string
}

export type RepaymentsPageData =
  | { state: "unavailable" }
  | {
      canPostRepayment: boolean
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

  const canPostRepayment = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  if (!canPostRepayment) return { state: "unavailable" }

  return {
    canPostRepayment,
    quickFillEnabled: canShowQuickFill(context),
    state: "ready",
    summary: await getRepaymentSummary({ tenantId: context.tenant.id }),
  }
}
