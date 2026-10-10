import { applyVerifiedMobileAppAccess } from "@halaalvest/db"
import {
  acknowledgeGoogleSubscription,
  verifyAppleMobileAppAccess,
  verifyGoogleMobileAppAccess,
} from "./mobile-app-access-verification"

type PurchaseInput =
  | { store: "apple"; transactionId: string }
  | { store: "google"; purchaseToken: string }

type Dependencies = {
  verifyAppleMobileAppAccess: typeof verifyAppleMobileAppAccess
  verifyGoogleMobileAppAccess: typeof verifyGoogleMobileAppAccess
  applyVerifiedMobileAppAccess: typeof applyVerifiedMobileAppAccess
  acknowledgeGoogleSubscription: typeof acknowledgeGoogleSubscription
}

const productionDependencies: Dependencies = {
  verifyAppleMobileAppAccess,
  verifyGoogleMobileAppAccess,
  applyVerifiedMobileAppAccess,
  acknowledgeGoogleSubscription,
}

export async function verifyAndApplyMobileAppAccess(
  input: PurchaseInput,
  scope: { tenantId: string; userId: string },
  overrides: Partial<Dependencies> = {}
) {
  const dependencies = { ...productionDependencies, ...overrides }
  const verified =
    input.store === "google"
      ? await dependencies.verifyGoogleMobileAppAccess(input.purchaseToken)
      : {
          evidence: await dependencies.verifyAppleMobileAppAccess(
            input.transactionId
          ),
          acknowledgementRequired: false,
        }
  const result = await dependencies.applyVerifiedMobileAppAccess({
    evidence: verified.evidence,
    expectedUserId: scope.userId,
    expectedTenantId: scope.tenantId,
    actorUserId: scope.userId,
  })
  if (
    input.store === "google" &&
    verified.acknowledgementRequired &&
    result.applied
  )
    await dependencies.acknowledgeGoogleSubscription(
      verified.evidence.productId,
      input.purchaseToken
    )
  return { verified: true as const, applied: result.applied }
}
