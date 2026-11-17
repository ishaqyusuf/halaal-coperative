import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
import type {
  FoodPurchaseApplicationPage,
  FoodPurchaseCommandResult,
  FoodPurchaseCycleStatus,
  FoodPurchaseWorkspace,
} from "../model/admin-food-purchase-operations-types"
import {
  getDevFoodPurchaseApplicationDetail,
  getDevFoodPurchaseApplicationPage,
  getDevFoodPurchaseOverview,
  runDevFoodPurchaseCommand,
} from "./admin-food-purchase-operations-dev-fixtures"

/** Applications page size (T21). */
export const FOOD_PURCHASE_PAGE_SIZE = 20

/**
 * Cycles plus the selected cycle's totals: one read per cycle selection
 * (the accounting lane of the workspace skips the applications page).
 */
export function getFoodPurchaseOverview(cycleId?: string) {
  if (isMobileDevFixtureSession()) return getDevFoodPurchaseOverview(cycleId)
  const input = { cycleId, lane: "accounting" as const }
  return readCachedMobileQuery(
    `admin.food-purchase-operations.overview.${cycleId ?? "current"}`,
    () => createMobileTrpcClient().mobile.admin.foodPurchaseOperations.workspace.query(input)
  ) as Promise<FoodPurchaseWorkspace>
}

/** One page of a cycle's applications, fetched as the lane scrolls. */
export async function getFoodPurchaseApplicationPage(input: {
  cursor?: string
  cycleId: string
  search?: string
}): Promise<FoodPurchaseApplicationPage> {
  if (isMobileDevFixtureSession()) return getDevFoodPurchaseApplicationPage(input)
  const page = (await readCachedMobileQuery(
    `admin.food-purchase-operations.applications.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.foodPurchaseOperations.workspace.query({
        ...input,
        lane: "applications",
        limit: FOOD_PURCHASE_PAGE_SIZE,
      }),
    { persist: isPersistableReadInput(input) }
  )) as FoodPurchaseApplicationPage
  return { ...page, nextCursor: page.nextApplicationCursor }
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
