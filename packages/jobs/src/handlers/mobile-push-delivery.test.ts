import { describe, expect, test } from "bun:test"
import {
  mobilePushDeliveryHandler,
  validateMobilePushPayload,
  type MobilePushDeliveryPayload,
} from "./mobile-push-delivery"

const payload: MobilePushDeliveryPayload = {
  action: "open_financing",
  category: "financing",
  intendedRole: "member",
  notificationId: "018f3f2a-6a15-7e2f-8f30-2f69ae6cb421",
  tenantId: "tenant-1",
  userId: "user-1",
  version: 1,
}

function runtime(input?: {
  duplicate?: string | null
  registrations?: Array<{
    id: string
    platform: string
    providerToken: string
    tokenHash: string
  }>
  sendResult?: {
    errorCode: string | null
    providerTicketId: string | null
    status: "error" | "ok"
  }
}) {
  let finalAudit: unknown
  const attemptAudits: unknown[] = []
  const disabled: string[] = []
  const receipts: unknown[] = []
  const sent: unknown[] = []
  return {
    disabled,
    finalAudit: () => finalAudit,
    overrides: {
      createAudit: async (entry: unknown) => {
        attemptAudits.push(entry)
        return {} as never
      },
      disableRegistration: async (entry: { registrationId: string }) => {
        disabled.push(entry.registrationId)
        return { disabled: true as const }
      },
      getSubscription: async () => ({
        enforcement: { memberLoginEnabled: true },
      }),
      listRegistrations: async () => input?.registrations ?? [],
      prisma: {
        auditLog: {
          findUnique: async () =>
            input?.duplicate ? { action: input.duplicate } : null,
          upsert: async (entry: unknown) => {
            finalAudit = entry
          },
        },
      },
      scheduleReceipt: async (entry: unknown) => {
        receipts.push(entry)
      },
      sendPush: async (entry: unknown) => {
        sent.push(entry)
        return (
          input?.sendResult ?? {
            errorCode: null,
            providerTicketId: "ticket-1",
            status: "ok" as const,
          }
        )
      },
    } as never,
    sent,
    receipts,
    attemptAudits,
  }
}

describe("mobile push delivery handler", () => {
  test("rejects malformed identifiers before reading recipient state", () => {
    expect(() =>
      validateMobilePushPayload({ ...payload, notificationId: "not-a-uuid" })
    ).toThrow("notificationId must be a UUID")
  })

  test("does not redeliver an already-sent notification id", async () => {
    const fixture = runtime({ duplicate: "notification.push_sent" })
    await expect(
      mobilePushDeliveryHandler(payload, fixture.overrides)
    ).resolves.toEqual({
      delivered: 0,
      duplicate: true,
      failed: 0,
      suppressed: 0,
    })
    expect(fixture.sent).toHaveLength(0)
  })

  test("records preference or registration suppression without contacting Expo", async () => {
    const fixture = runtime()
    await expect(
      mobilePushDeliveryHandler(payload, fixture.overrides)
    ).resolves.toEqual({
      delivered: 0,
      duplicate: false,
      failed: 0,
      suppressed: 1,
    })
    expect(fixture.sent).toHaveLength(0)
    expect(fixture.finalAudit()).toMatchObject({
      create: { action: "notification.push_suppressed" },
    })
  })

  test("delivers generic push data and records only a token fingerprint", async () => {
    const providerToken = "ExponentPushToken[private-token-123456]"
    const fixture = runtime({
      registrations: [
        {
          id: "registration-1",
          platform: "android",
          providerToken,
          tokenHash: "abcdef1234567890",
        },
      ],
    })
    await expect(
      mobilePushDeliveryHandler(payload, fixture.overrides)
    ).resolves.toEqual({
      delivered: 1,
      duplicate: false,
      failed: 0,
      suppressed: 0,
    })
    expect(fixture.sent).toHaveLength(1)
    expect(fixture.receipts).toEqual([
      {
        notificationId: payload.notificationId,
        providerTicketId: "ticket-1",
        registrationId: "registration-1",
        tenantId: payload.tenantId,
      },
    ])
    expect(JSON.stringify(fixture.attemptAudits)).toContain("abcdef123456")
    expect(JSON.stringify(fixture.attemptAudits)).not.toContain(providerToken)
    expect(fixture.finalAudit()).toMatchObject({
      create: { action: "notification.push_sent" },
    })
  })

  test("revokes a provider endpoint after DeviceNotRegistered", async () => {
    const fixture = runtime({
      registrations: [
        {
          id: "registration-1",
          platform: "android",
          providerToken: "ExponentPushToken[revoked-token-123456]",
          tokenHash: "abcdef1234567890",
        },
      ],
      sendResult: {
        errorCode: "DeviceNotRegistered",
        providerTicketId: null,
        status: "error",
      },
    })

    await expect(
      mobilePushDeliveryHandler(payload, fixture.overrides)
    ).resolves.toEqual({
      delivered: 0,
      duplicate: false,
      failed: 1,
      suppressed: 0,
    })
    expect(fixture.disabled).toEqual(["registration-1"])
    expect(fixture.finalAudit()).toMatchObject({
      create: { action: "notification.push_failed" },
    })
  })
})
