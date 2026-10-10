import { describe, expect, test } from "bun:test"

import {
  deriveMobileNotificationReadAuditId,
  getMobileNotificationCenter,
  markMobileNotificationsRead,
} from "./mobile-notifications"

function delivery(input: {
  action?: string
  id: string
  intendedRole?: string
  mobileAction?: string
  recipient: string
  type?: string
}) {
  return {
    action: input.action ?? "notification.email_sent",
    actorUserId: null,
    id: input.id,
    metadata: {
      notificationType: input.type ?? "payment.receipt.updated",
      recipient: input.recipient,
      source: "payment-receipt",
      ...(input.intendedRole ? { intendedRole: input.intendedRole } : {}),
      ...(input.mobileAction ? { action: input.mobileAction } : {}),
    },
    occurredAt: new Date("2026-08-12T10:00:00.000Z"),
  }
}

describe("mobile notification center", () => {
  test("derives stable actor and tenant scoped read receipt ids", () => {
    const first = deriveMobileNotificationReadAuditId(
      "tenant-1",
      "user-1",
      "delivery-1"
    )

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(
      deriveMobileNotificationReadAuditId("tenant-1", "user-1", "delivery-1")
    ).toBe(first)
    expect(
      deriveMobileNotificationReadAuditId("tenant-2", "user-1", "delivery-1")
    ).not.toBe(first)
  })

  test("returns only recipient-scoped deliveries and actor-scoped unread state", async () => {
    let auditReads = 0
    const center = await getMobileNotificationCenter(
      {
        memberLoginEnabled: true,
        role: "member",
        tenantId: "tenant-1",
        userEmail: "member@example.com",
        userId: "user-1",
      },
      {
        auditLog: {
          findMany: async () => {
            auditReads += 1
            if (auditReads === 1) {
              return [
                delivery({ id: "delivery-1", recipient: "member@example.com" }),
                delivery({
                  action: "notification.email_failed",
                  id: "delivery-2",
                  recipient: "member@example.com",
                  type: "support.case.updated",
                }),
                delivery({ id: "delivery-3", recipient: "other@example.com" }),
                delivery({
                  action: "notification.push_suppressed",
                  id: "delivery-4",
                  intendedRole: "member",
                  mobileAction: "open_reports",
                  recipient: "member@example.com",
                  type: "cooperative",
                }),
                delivery({
                  action: "notification.push_sent",
                  id: "delivery-5",
                  intendedRole: "tenant_admin",
                  mobileAction: "open_reports",
                  recipient: "member@example.com",
                  type: "reports",
                }),
              ]
            }
            return [
              {
                actorUserId: "user-1",
                entityId: "delivery-1",
              },
              {
                actorUserId: "user-2",
                entityId: "delivery-2",
              },
            ]
          },
        },
        notificationPreference: {
          findMany: async () => [
            {
              channel: "email",
              enabled: true,
              notificationType: "payment.receipt.updated",
              role: "member",
            },
            {
              channel: "email",
              enabled: true,
              notificationType: "admin.queue.updated",
              role: "tenant_admin",
            },
          ],
        },
        mobilePushRegistration: {
          findFirst: async () => null,
        },
        mobileUserNotificationPreference: {
          findMany: async () => [],
        },
      } as never
    )

    expect(center.deliveries.map((item) => item.id)).toEqual([
      "delivery-1",
      "delivery-2",
      "delivery-4",
    ])
    expect(center.deliveries.map((item) => item.isRead)).toEqual([
      true,
      false,
      false,
    ])
    expect(center.deliveries.map((item) => item.safeSummary)).toEqual([
      "Receipt activity is available inside the app.",
      "Support activity is available inside the app.",
      "Cooperative activity is available inside the app.",
    ])
    expect(center.deliveries[2]).toMatchObject({
      action: "open_reports",
      intendedRole: "member",
      status: "suppressed",
    })
    expect(center.preferences).toHaveLength(5)
    expect(
      center.preferences.filter((item) => item.mandatory && item.enabled)
    ).toHaveLength(2)
    expect(center.summary).toMatchObject({
      failed: 1,
      sent: 1,
      totalDeliveries: 3,
      unread: 2,
    })
  })

  test("rejects a read receipt for another recipient", async () => {
    let writes = 0

    await expect(
      markMobileNotificationsRead(
        {
          actorUserId: "user-1",
          deliveryIds: ["delivery-1"],
          tenantId: "tenant-1",
          userEmail: "member@example.com",
        },
        {
          auditLog: {
            createMany: async () => {
              writes += 1
            },
            findMany: async () => [
              {
                id: "delivery-1",
                metadata: { recipient: "other@example.com" },
              },
            ],
          },
        } as never
      )
    ).rejects.toThrow("do not belong to this account")

    expect(writes).toBe(0)
  })

  test("does not duplicate an existing actor read receipt", async () => {
    let reads = 0
    let writes = 0
    const result = await markMobileNotificationsRead(
      {
        actorUserId: "user-1",
        deliveryIds: ["delivery-1", "delivery-1"],
        tenantId: "tenant-1",
        userEmail: "member@example.com",
      },
      {
        auditLog: {
          createMany: async () => {
            writes += 1
          },
          findMany: async () => {
            reads += 1
            return reads === 1
              ? [
                  {
                    id: "delivery-1",
                    metadata: { recipient: "member@example.com" },
                  },
                ]
              : [{ entityId: "delivery-1" }]
          },
        },
      } as never
    )

    expect(result).toEqual({ markedCount: 0 })
    expect(writes).toBe(0)
  })
})
