import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import {
  getDevFinancingWorkspace,
  runDevFinancingCommand,
} from "./admin-financing-dev-fixtures"
import type {
  FinancingCommandResult,
  FinancingCycleState,
  FinancingLane,
  FinancingWorkspace,
} from "../model/admin-financing-operations-types"

export async function getFinancingOperationsWorkspace(input: {
  cursor?: string | null
  entityId?: string
  lane: FinancingLane
  search?: string
}) {
  if (isMobileDevFixtureSession())
    return getDevFinancingWorkspace(input.lane, input.search)
  return readCachedMobileQuery(
    `admin.financing-operations.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.financingOperations.workspace.query(
        input
      )
  ) as Promise<FinancingWorkspace>
}

export async function updateFinancingCycle(input: {
  commandId: string
  expectedState: FinancingCycleState
  financingCycleId?: string | null
  status: "closed" | "open" | "paused"
  statusNote?: string | null
}) {
  if (isMobileDevFixtureSession())
    return runDevFinancingCommand(
      input.commandId,
      input.financingCycleId ?? "dev-cycle",
      input.status
    )
  return createMobileTrpcClient().mobile.admin.financingOperations.updateCycle.mutate(
    input
  ) as Promise<FinancingCommandResult>
}

export async function reviewFinancingRequest(input: {
  commandId: string
  expectedState: string
  loanRequestId: string
  notes?: string | null
  status: "approved" | "rejected" | "under_review"
}) {
  if (isMobileDevFixtureSession())
    return runDevFinancingCommand(input.commandId, input.loanRequestId, input.status)
  return createMobileTrpcClient().mobile.admin.finance.reviewFinancingRequest.mutate(
    input
  ) as Promise<FinancingCommandResult>
}

export async function disburseFinancing(input: {
  commandId: string
  expectedState: string
  firstRepaymentDueAt?: string | null
  loanId: string
}) {
  if (isMobileDevFixtureSession())
    return runDevFinancingCommand(input.commandId, input.loanId, "disbursed")
  return createMobileTrpcClient().mobile.admin.financingOperations.disburse.mutate(
    input
  ) as Promise<FinancingCommandResult>
}
