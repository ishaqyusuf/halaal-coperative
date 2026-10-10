import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevFoodPurchaseApplication,
  getDevMemberFoodPurchase,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileFoodPurchaseApplication,
  MobileFoodPurchaseApplicationCreateInput,
  MobileFoodPurchaseApplicationPage,
  MobileMemberFoodPurchase,
} from "../model/member-food-purchase-types"

export async function getMobileMemberFoodPurchase() {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.foodPurchase", async () =>
      getDevMemberFoodPurchase()
    ) as Promise<MobileMemberFoodPurchase>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("member.foodPurchase", () =>
    client.mobile.member.foodPurchase.list.query()
  ) as Promise<MobileMemberFoodPurchase>
}

export async function getMobileMemberFoodPurchaseApplications(input: {
  cursor: string
  pageSize?: number
}) {
  if (isMobileDevFixtureSession()) {
    return {
      data: [],
      nextCursor: null,
      state: "available",
    } as MobileFoodPurchaseApplicationPage
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.foodPurchase.applications.query(
    input
  ) as Promise<MobileFoodPurchaseApplicationPage>
}

export async function getMobileMemberFoodPurchaseApplication(
  foodPurchaseApplicationId: string
) {
  if (isMobileDevFixtureSession()) {
    const snapshot = getDevMemberFoodPurchase() as MobileMemberFoodPurchase
    return (
      snapshot.applications.find(
        (application) => application.id === foodPurchaseApplicationId
      ) ?? null
    )
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.foodPurchase.application.query({
    foodPurchaseApplicationId,
  }) as Promise<MobileFoodPurchaseApplication | null>
}

export async function createMobileMemberFoodPurchaseApplication(
  input: MobileFoodPurchaseApplicationCreateInput
) {
  if (isMobileDevFixtureSession()) {
    return createDevFoodPurchaseApplication(
      input
    ) as MobileFoodPurchaseApplication
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.foodPurchase.createApplication.mutate(
    input
  ) as Promise<MobileFoodPurchaseApplication>
}
