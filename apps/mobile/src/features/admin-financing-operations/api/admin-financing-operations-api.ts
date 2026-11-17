import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
import {
  getDevFinancingItem,
  getDevFinancingSummary,
  getDevFinancingWorkspace,
  runDevFinancingCommand,
} from "./admin-financing-dev-fixtures"
import type {
  FinancingCommandResult,
  FinancingCycleState,
  FinancingItemRead,
  FinancingLane,
  FinancingSummary,
  FinancingWorkspace,
} from "../model/admin-financing-operations-types"

/** Cycle, currency, lane counts and policy: once per visit and after writes. */
export async function getFinancingSummary() {
  if (isMobileDevFixtureSession()) return getDevFinancingSummary()
  return readCachedMobileQuery("admin.financing-operations.summary", () =>
    createMobileTrpcClient().mobile.admin.financingOperations.summary.query()
  ) as Promise<FinancingSummary>
}

/** One cursor page of a lane, without the cycle (read in the summary). */
export async function getFinancingOperationsWorkspace(input: {
  cursor?: string | null
  lane: FinancingLane
  search?: string
}) {
  if (isMobileDevFixtureSession())
    return getDevFinancingWorkspace(input.lane, input.search)
  const request = { ...input, includeSummary: false }
  return readCachedMobileQuery(
    `admin.financing-operations.${JSON.stringify(request)}`,
    () =>
      createMobileTrpcClient().mobile.admin.financingOperations.workspace.query(
        request
      ),
    { persist: isPersistableReadInput(input) }
  ) as Promise<FinancingWorkspace>
}

/** One record for a notification deep link. */
export async function getFinancingItem(entityId: string) {
  if (isMobileDevFixtureSession()) return getDevFinancingItem(entityId)
  return readCachedMobileQuery(`admin.financing-operations.item.${entityId}`, () =>
    createMobileTrpcClient().mobile.admin.financingOperations.item.query({
      entityId,
    })
  ) as Promise<FinancingItemRead>
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
