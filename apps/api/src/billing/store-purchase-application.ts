import { applyVerifiedStoreEntitlement } from "@halaalvest/db"
import {
  acknowledgeGoogleSubscription,
  verifyAppleSubscription,
  verifyGoogleSubscription,
} from "./store-verification"

type StorePurchaseInput =
  | { store: "apple"; transactionId: string }
  | { store: "google"; purchaseToken: string }

type Dependencies = {
  verifyAppleSubscription: typeof verifyAppleSubscription
  verifyGoogleSubscription: typeof verifyGoogleSubscription
  applyVerifiedStoreEntitlement: typeof applyVerifiedStoreEntitlement
  acknowledgeGoogleSubscription: typeof acknowledgeGoogleSubscription
}

const productionDependencies: Dependencies = {
  verifyAppleSubscription,
  verifyGoogleSubscription,
  applyVerifiedStoreEntitlement,
  acknowledgeGoogleSubscription,
}

export async function verifyAndApplyStorePurchase(
  input: StorePurchaseInput,
  scope: { tenantId: string; actorUserId: string },
  overrides: Partial<Dependencies> = {}
) {
  const dependencies = { ...productionDependencies, ...overrides }
  const verified =
    input.store === "google"
      ? await dependencies.verifyGoogleSubscription(input.purchaseToken)
      : {
          entitlement: await dependencies.verifyAppleSubscription(
            input.transactionId
          ),
          acknowledgementRequired: false,
        }
  const result = await dependencies.applyVerifiedStoreEntitlement({
    evidence: verified.entitlement,
    expectedTenantId: scope.tenantId,
    actorUserId: scope.actorUserId,
  })
  if (
    input.store === "google" &&
    verified.acknowledgementRequired &&
    result.applied
  )
    await dependencies.acknowledgeGoogleSubscription(
      verified.entitlement.productId,
      input.purchaseToken
    )
  return { verified: true as const, applied: result.applied }
}
