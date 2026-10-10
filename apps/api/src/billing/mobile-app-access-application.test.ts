import { describe, expect, test } from "bun:test"
import { verifyAndApplyMobileAppAccess } from "./mobile-app-access-application"
import type { MobileAppEvidence } from "./mobile-app-access-policy"

const userId = "11111111-1111-4111-8111-111111111111"
const tenantId = "22222222-2222-4222-8222-222222222222"
const evidence: MobileAppEvidence = {
  userBinding: userId,
  providerName: "google_play",
  providerSubscriptionId: "digest",
  productId: "halaalvest.app.access",
  duration: "six_months",
  status: "active",
  periodStartsAt: null,
  periodEndsAt: new Date("2027-03-28"),
  graceEndsAt: null,
  cancelAtPeriodEnd: false,
  verifiedAt: new Date("2026-09-28"),
  environment: "production",
}

describe("personal mobile app purchase application", () => {
  test("binds provider evidence to the signed user and acknowledges only applied Google access", async () => {
    for (const applied of [false, true]) {
      const calls: string[] = []
      const result = await verifyAndApplyMobileAppAccess(
        { store: "google", purchaseToken: "secret-token" },
        { tenantId, userId },
        {
          verifyGoogleMobileAppAccess: async () => ({
            evidence,
            acknowledgementRequired: true,
          }),
          applyVerifiedMobileAppAccess: async (input) => {
            expect(input.expectedUserId).toBe(userId)
            expect(input.expectedTenantId).toBe(tenantId)
            expect(input.actorUserId).toBe(userId)
            calls.push("apply")
            return { applied, userId, purchaseId: "purchase" }
          },
          acknowledgeGoogleSubscription: async () => {
            calls.push("acknowledge")
          },
        }
      )
      expect(result.applied).toBe(applied)
      expect(calls).toEqual(applied ? ["apply", "acknowledge"] : ["apply"])
    }
  })

  test("never acknowledges after an ownership or persistence rejection", async () => {
    let acknowledged = false
    await expect(
      verifyAndApplyMobileAppAccess(
        { store: "google", purchaseToken: "secret-token" },
        { tenantId, userId },
        {
          verifyGoogleMobileAppAccess: async () => ({
            evidence,
            acknowledgementRequired: true,
          }),
          applyVerifiedMobileAppAccess: async () => {
            throw new Error("foreign owner")
          },
          acknowledgeGoogleSubscription: async () => {
            acknowledged = true
          },
        }
      )
    ).rejects.toThrow("foreign owner")
    expect(acknowledged).toBe(false)
  })
})
