import { describe, expect, test } from "bun:test"
import { mobilePushReceiptHandler } from "./mobile-push-receipt"

const payload = {
  notificationId: "018f3f2a-6a15-7e2f-8f30-2f69ae6cb421",
  providerTicketId: "provider-ticket-1",
  registrationId: "018f3f2a-6a15-7e2f-8f30-2f69ae6cb422",
  tenantId: "tenant-1",
}

describe("mobile push receipt handler", () => {
  test("retries while the provider receipt is pending", async () => {
    await expect(
      mobilePushReceiptHandler(payload, {
        getReceipt: async () => ({
          errorCode: null,
          message: null,
          status: "pending",
        }),
        prisma: {} as never,
      })
    ).rejects.toThrow("receipt is not ready")
  })

  test("revokes a registration and writes a bounded receipt audit", async () => {
    let audit: unknown
    let revoked: unknown
    const result = await mobilePushReceiptHandler(payload, {
      createAudit: async (entry) => {
        audit = entry
        return {} as never
      },
      disableRegistration: async (entry) => {
        revoked = entry
        return { disabled: true as const }
      },
      getReceipt: async () => ({
        errorCode: "DeviceNotRegistered",
        message: "The endpoint expired.",
        status: "error",
      }),
      prisma: {} as never,
    })

    expect(result).toEqual({
      errorCode: "DeviceNotRegistered",
      revoked: true,
      status: "error",
    })
    expect(revoked).toMatchObject({
      registrationId: payload.registrationId,
      tenantId: payload.tenantId,
    })
    expect(audit).toMatchObject({
      action: "mobile.push.receipt_failed",
      entityId: payload.notificationId,
    })
    expect(JSON.stringify(audit)).not.toContain("ExponentPushToken")
  })
})
