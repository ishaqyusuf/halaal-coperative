import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  FoodPurchaseCommandResult,
  FoodPurchaseCycleStatus,
  FoodPurchaseLane,
  FoodPurchaseWorkspace,
} from "../model/admin-food-purchase-operations-types"
import {
  getDevFoodPurchaseApplicationDetail,
  getDevFoodPurchaseWorkspace,
  runDevFoodPurchaseCommand,
} from "./admin-food-purchase-operations-dev-fixtures"

export function getFoodPurchaseOperationsWorkspace(input: {
  cursor?: string
  cycleId?: string
  lane: FoodPurchaseLane
  search?: string
}) {
  if (isMobileDevFixtureSession()) return getDevFoodPurchaseWorkspace(input)
  return readCachedMobileQuery(
    `admin.food-purchase-operations.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.foodPurchaseOperations.workspace.query(
        input
      )
  ) as Promise<FoodPurchaseWorkspace>
}

export function getFoodPurchaseApplicationDetail(applicationId: string) {
  if (isMobileDevFixtureSession())
    return getDevFoodPurchaseApplicationDetail(applicationId)
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.applicationDetail.query(
    { applicationId }
  )
}

export function reviewFoodPurchaseApplication(input: {
  applicationId: string
  approvedAmount?: number
  approvedPaybackMonths?: number
  commandId: string
  expectedState: "submitted" | "under_review"
  notes?: string
  status: "approved" | "rejected" | "under_review"
}) {
  if (isMobileDevFixtureSession())
    return runDevFoodPurchaseCommand(
      input.commandId,
      input.applicationId,
      input.status
    )
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.reviewApplication.mutate(
    input
  ) as Promise<FoodPurchaseCommandResult>
}

export function createFoodPurchaseCycle(input: {
  commandId: string
  periodMonth: string
  releasedAmount: number
  releasedAt: string
  releaseNotes?: string
}) {
  if (isMobileDevFixtureSession())
    return runDevFoodPurchaseCommand(
      input.commandId,
      input.periodMonth,
      "draft"
    )
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.createCycle.mutate(
    input
  ) as Promise<FoodPurchaseCommandResult>
}

export function transitionFoodPurchaseCycle(input: {
  commandId: string
  cycleId: string
  expectedState: FoodPurchaseCycleStatus
  notes?: string
  transition: "cancel" | "close_intake" | "open_intake" | "reopen_intake"
}) {
  if (isMobileDevFixtureSession())
    return runDevFoodPurchaseCommand(
      input.commandId,
      input.cycleId,
      input.transition
    )
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.transitionCycle.mutate(
    input as never
  ) as Promise<FoodPurchaseCommandResult>
}

export function completeFoodPurchaseCycle(input: {
  commandId: string
  cycleId: string
  expectedState: "accounting_approved"
  notes?: string
  transition: "complete"
}) {
  if (isMobileDevFixtureSession())
    return runDevFoodPurchaseCommand(
      input.commandId,
      input.cycleId,
      "completed"
    )
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.completeCycle.mutate(
    input
  ) as Promise<FoodPurchaseCommandResult>
}

export function submitFoodPurchaseAccounting(input: {
  commandId: string
  cycleId: string
  expectedState: "accounting_rejected" | "intake_closed"
  notes?: string
  operatingExpenseAmount: number
  purchaseCostAmount: number
  salesAmount: number
}) {
  if (isMobileDevFixtureSession())
    return runDevFoodPurchaseCommand(
      input.commandId,
      input.cycleId,
      "accounting_submitted"
    )
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.submitAccounting.mutate(
    input
  ) as Promise<FoodPurchaseCommandResult>
}

export function reviewFoodPurchaseAccounting(input: {
  commandId: string
  cycleId: string
  decision: "approved" | "rejected"
  expectedState: "accounting_submitted"
  notes?: string
}) {
  if (isMobileDevFixtureSession())
    return runDevFoodPurchaseCommand(
      input.commandId,
      input.cycleId,
      input.decision === "approved"
        ? "accounting_approved"
        : "accounting_rejected"
    )
  return createMobileTrpcClient().mobile.admin.foodPurchaseOperations.reviewAccounting.mutate(
    input
  ) as Promise<FoodPurchaseCommandResult>
}
