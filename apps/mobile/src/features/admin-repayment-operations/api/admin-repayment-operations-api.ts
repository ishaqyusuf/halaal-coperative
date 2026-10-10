import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  RepaymentCommandResult,
  RepaymentFacility,
  RepaymentLane,
  RepaymentWorkspace,
} from "../model/admin-repayment-operations-types"
import {
  getDevRepaymentFacility,
  getDevRepaymentWorkspace,
  runDevRepaymentCommand,
} from "./admin-repayment-operations-dev-fixtures"

export function getRepaymentOperationsWorkspace(input: {
  cursor?: string | null
  lane: RepaymentLane
  search?: string
}) {
  if (isMobileDevFixtureSession()) return getDevRepaymentWorkspace(input)
  return readCachedMobileQuery(
    `admin.repayment-operations.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.repaymentOperations.workspace.query(
        input
      )
  ) as Promise<RepaymentWorkspace>
}

export function getRepaymentFacility(loanId: string) {
  if (isMobileDevFixtureSession()) return getDevRepaymentFacility(loanId)
  return createMobileTrpcClient().mobile.admin.repaymentOperations.facility.query(
    {
      loanId,
    }
  ) as Promise<RepaymentFacility>
}

export function postRepaymentOperation(input: {
  amount: number
  commandId: string
  expectedOutstandingPrincipal: number
  expectedState: "active" | "disbursed"
  loanId: string
  paidAt: string
  reference: string
}) {
  if (isMobileDevFixtureSession())
    return runDevRepaymentCommand(input.commandId, input.loanId, "posted")
  return createMobileTrpcClient().mobile.admin.repaymentOperations.post.mutate(
    input
  ) as Promise<RepaymentCommandResult>
}

export function recordCollectionFollowUpOperation(input: {
  caseStage: "active" | "escalated" | "promise_tracking" | "resolved"
  commandId: string
  expectedState: "due" | "overdue" | "partially_paid" | "pending"
  nextActionAt?: string | null
  note: string
  priority: "high" | "low" | "normal"
  promiseToPayAt?: string | null
  repaymentScheduleItemId: string
  status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
}) {
  if (isMobileDevFixtureSession())
    return runDevRepaymentCommand(
      input.commandId,
      input.repaymentScheduleItemId,
      input.status
    )
  return createMobileTrpcClient().mobile.admin.repaymentOperations.recordFollowUp.mutate(
    input
  ) as Promise<RepaymentCommandResult>
}
