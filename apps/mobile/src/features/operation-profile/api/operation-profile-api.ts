import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileOperationProfileSnapshot,
  UpdateMobileOperationProfileServiceInput,
} from "../model/operation-profile-types"

const DEV_TENANT_ID = "tenant-qa-operation-profile"
let devModes: Record<
  string,
  MobileOperationProfileSnapshot["services"][number]["accessMode"]
> = {
  collection_source_batch_posting: "disabled",
  collection_sources: "disabled",
  food_purchase: "disabled",
  payment_receipts: "office_only",
  procurement: "disabled",
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
      procurementMaximumActiveObligationsPerMember: 1,
    },
    reviewedAt: updatedAt,
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
      name: "Ishaq QA Cooperative",
    },
    updatedAt,
  }
}

export async function getMobileOperationProfile() {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("admin.operation-profile", async () =>
      getDevSnapshot()
    )
  }

  const client = createMobileTrpcClient()
  return readCachedMobileQuery("admin.operation-profile", () =>
    client.mobile.admin.operationProfile.overview.query()
  ) as Promise<MobileOperationProfileSnapshot>
}

export async function updateMobileOperationProfileService(
  input: UpdateMobileOperationProfileServiceInput
) {
  if (isMobileDevFixtureSession()) {
    if (devModes[input.serviceKey] !== input.expectedAccessMode) {
      throw Object.assign(
        new Error(
          "This service access mode changed on another device. Refresh before saving."
        ),
        { data: { code: "CONFLICT" } }
      )
    }
    devModes = { ...devModes, [input.serviceKey]: input.nextAccessMode }
    return getDevSnapshot()
  }

  const client = createMobileTrpcClient()
  return client.mobile.admin.operationProfile.updateService.mutate(
    input
  ) as Promise<MobileOperationProfileSnapshot>
}
