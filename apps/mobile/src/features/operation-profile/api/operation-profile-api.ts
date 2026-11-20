import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { isUnrecoverableQueryError } from "@/lib/app-query-policy"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import { MobileOfflineOperationError } from "@/runtime/mobile-runtime-state"
import type {
  MobileOperationProfileSnapshot,
  UpdateMobileOperationProfileServiceInput,
} from "../model/operation-profile-types"

const DEV_TENANT_ID = "tenant-qa-operation-profile"
const readCacheKey = "admin.operation-profile"
const devReviewedAt = "2026-11-14T09:24:00.000Z"
let devReviewed = false
let devModes: Record<
  string,
  MobileOperationProfileSnapshot["services"][number]["accessMode"]
> = {
  collection_source_batch_posting: "disabled",
  collection_sources: "office_only",
  food_purchase: "member_self_service",
  payment_receipts: "member_self_service",
  procurement: "office_only",
  support_cases: "member_self_service",
}

function capability(
  serviceKey: MobileOperationProfileSnapshot["services"][number]["serviceKey"]
) {
  const accessMode = devModes[serviceKey]
  return {
    accessMode,
    canMemberCreate: accessMode === "member_self_service",
    canSettleExisting: true,
    canStaffCreate:
      accessMode === "office_only" || accessMode === "member_self_service",
    canViewExisting: true,
    effectiveAccessMode: accessMode,
    effectiveCanMemberCreate: accessMode === "member_self_service",
    effectiveCanStaffCreate:
      accessMode === "office_only" || accessMode === "member_self_service",
    serviceKey,
    shouldShowInMemberNav: accessMode === "member_self_service",
    shouldShowInStaffNav: accessMode !== "disabled",
  }
}

function getDevSnapshot(): MobileOperationProfileSnapshot {
  const updatedAt = new Date().toISOString()
  return {
    policy: {
      foodPurchaseMaximumActiveObligationsPerMember: 1,
      foodPurchaseRequiresOpenCycle: true,
      paymentReceiptProofRequired: false,
      procurementMaximumActiveObligationsPerMember: 1,
    },
    reviewedAt: devReviewed ? updatedAt : devReviewedAt,
    reviewedByName: "Ibrahim Yusuf",
    reviewedByUserId: "qa-admin-user",
    services: [
      capability("payment_receipts"),
      capability("procurement"),
      capability("food_purchase"),
      capability("support_cases"),
      capability("collection_sources"),
      capability("collection_source_batch_posting"),
    ],
    subscription: {
      accessEnabled: true,
      planCode: "standard",
      planName: "Standard",
      reason: null,
      status: "active",
    },
    tenant: {
      id: DEV_TENANT_ID,
      name: "Amana Savings Cooperative",
    },
    updatedAt,
  }
}

export function getMobileOperationProfile({
  offline,
  signal,
}: {
  offline: boolean
  signal: AbortSignal
}) {
  return readCachedMobileQuery(
    readCacheKey,
    async (): Promise<MobileOperationProfileSnapshot> => {
      if (isMobileDevFixtureSession()) return getDevSnapshot()
      if (offline) throw new MobileOfflineOperationError("read")
      const client = createMobileTrpcClient()
      return client.mobile.admin.operationProfile.overview.query(undefined, {
        signal,
      })
    },
    {
      shouldFallback: (error) =>
        !signal.aborted && (offline || !isUnrecoverableQueryError(error)),
    }
  )
}

export async function updateMobileOperationProfileService(
  input: UpdateMobileOperationProfileServiceInput,
  simulateConflict = false
) {
  if (isMobileDevFixtureSession()) {
    if (simulateConflict) devModes[input.serviceKey] = "read_only"
    if (
      simulateConflict ||
      devModes[input.serviceKey] !== input.expectedAccessMode
    ) {
      throw Object.assign(
        new Error(
          "This service access mode changed on another device. Refresh before saving."
        ),
        { data: { code: "CONFLICT" } }
      )
    }
    devModes = { ...devModes, [input.serviceKey]: input.nextAccessMode }
    devReviewed = true
    return getDevSnapshot()
  }

  const client = createMobileTrpcClient()
  return client.mobile.admin.operationProfile.updateService.mutate(
    input
  ) as Promise<MobileOperationProfileSnapshot>
}

export function cacheUpdatedOperationProfile(
  snapshot: MobileOperationProfileSnapshot
) {
  return readCachedMobileQuery(readCacheKey, async () => snapshot, {
    shouldFallback: () => false,
  }).catch(() => snapshot)
}
