import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  ProcurementCommandResult,
  ProcurementLane,
  ProcurementOperation,
  ProcurementWorkspace,
} from "../model/admin-procurement-operations-types"
import {
  getDevProcurementDetail,
  getDevProcurementWorkspace,
  runDevProcurementCommand,
} from "./admin-procurement-operations-dev-fixtures"

export function getProcurementOperationsWorkspace(input: {
  lane: ProcurementLane
  search?: string
}) {
  if (isMobileDevFixtureSession()) return getDevProcurementWorkspace(input)
  return readCachedMobileQuery(
    `admin.procurement-operations.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.procurementOperations.workspace.query(
        input
      )
  ) as Promise<ProcurementWorkspace>
}

export function getProcurementOperationDetail(procurementRequestId: string) {
  if (isMobileDevFixtureSession()) return getDevProcurementDetail(procurementRequestId)
  return createMobileTrpcClient().mobile.admin.procurementOperations.detail.query({
    procurementRequestId,
  }) as Promise<ProcurementOperation>
}

export function reviewProcurementOperation(input: {
  approvedCost?: number
  approvedRepaymentMonths?: number
  commandId: string
  expectedState: "submitted" | "under_review"
  notes?: string
  procurementRequestId: string
  status: "approved" | "rejected" | "under_review"
}) {
  if (isMobileDevFixtureSession())
    return runDevProcurementCommand(input.commandId, input.procurementRequestId, input.status)
  return createMobileTrpcClient().mobile.admin.procurementOperations.review.mutate(
    input
  ) as Promise<ProcurementCommandResult>
}

export function activateProcurementOperation(input: {
  commandId: string
  expectedState: "approved"
  firstDueDate: string
  procurementRequestId: string
  purchaseDate: string
  purchaseNotes?: string
  purchaseReference: string
}) {
  if (isMobileDevFixtureSession())
    return runDevProcurementCommand(input.commandId, input.procurementRequestId, "active")
  return createMobileTrpcClient().mobile.admin.procurementOperations.activate.mutate(
    input
  ) as Promise<ProcurementCommandResult>
}

export function submitProcurementPayment(input: {
  amount: number
  commandId: string
  expectedState: "due" | "overdue" | "partially_paid" | "pending"
  memberId: string
  notes?: string
  paidAt: string
  paymentReference: string
  procurementRepaymentScheduleItemId: string
}) {
  if (isMobileDevFixtureSession())
    return runDevProcurementCommand(
      input.commandId,
      input.procurementRepaymentScheduleItemId,
      "submitted"
    )
  return createMobileTrpcClient().mobile.admin.procurementOperations.submitPayment.mutate(
    input
  ) as Promise<ProcurementCommandResult>
}
