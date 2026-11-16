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

  test("a busy tenant still returns the user's own items, a cursor and server totals", async () => {
    type Row = {
      action: string
      actorUserId: string | null
      entityId: string | null
      id: string
      metadata: Record<string, unknown> | null
      occurredAt: Date
    }
    const rows: Row[] = []
    // 150 newer notifications for other members push past any fixed window.
    for (let index = 0; index < 150; index += 1) {
      rows.push({
        action: "notification.email_sent",
        actorUserId: null,
        entityId: null,
        id: `other-${String(index).padStart(3, "0")}`,
        metadata: {
          notificationType: "payment.receipt.updated",
          recipient: `other-${index}@example.com`,
          recipientUserId: `user-other-${index}`,
        },
        occurredAt: new Date(Date.UTC(2026, 10, 10, 12, 0, index)),
      })
    }
    for (const [index, id] of ["own-1", "own-2", "own-3"].entries()) {
      rows.push({
        action: "notification.push_sent",
        actorUserId: null,
        entityId: null,
        id,
        metadata:
          index === 2
            ? {
                notificationType: "support.case.updated",
                recipient: "member@example.com",
              }
            : {
                notificationType: "payment.receipt.updated",
                recipientUserId: "user-1",
              },
        occurredAt: new Date(Date.UTC(2026, 10, 1, 9, 0, index)),
      })
    }
    rows.push({
      action: "mobile.notification.read",
      actorUserId: "user-1",
      entityId: "own-3",
      id: "read-1",
      metadata: null,
      occurredAt: new Date(Date.UTC(2026, 10, 2)),
    })

    type Where = {
      action?: string | { startsWith: string }
      actorUserId?: string
      entityId?: { in: string[] }
      OR?: { metadata: { equals: string; path: string[] } }[]
      tenantId?: string
    }
    const matches = (row: Row, where: Where) => {
      if (typeof where.action === "string" && row.action !== where.action)
        return false
      if (
        typeof where.action === "object" &&
        !row.action.startsWith(where.action.startsWith)
      )
        return false
      if (where.actorUserId && row.actorUserId !== where.actorUserId)
        return false
      if (where.entityId && !where.entityId.in.includes(row.entityId ?? ""))
        return false
      if (
        where.OR &&
        !where.OR.some(
          (clause) =>
            row.metadata?.[clause.metadata.path[0]!] === clause.metadata.equals
        )
      )
        return false
      return true
    }
    const queryCounts: unknown[] = []
    const client = {
      $queryRaw: async (...args: unknown[]) => {
        queryCounts.push(args)
        return [
          { failed: 0n, queued: 0n, sent: 3n, totalDeliveries: 3n, unread: 2n },
        ]
      },
      auditLog: {
        findMany: async (args: {
          cursor?: { id: string }
          skip?: number
          take?: number
          where: Where
        }) => {
          let result = rows
            .filter((row) => matches(row, args.where))
            .sort(
              (a, b) =>
                b.occurredAt.getTime() - a.occurredAt.getTime() ||
                b.id.localeCompare(a.id)
            )
          if (args.cursor) {
            const at = result.findIndex((row) => row.id === args.cursor!.id)
            result = result.slice(at + (args.skip ?? 0))
          }
          return args.take ? result.slice(0, args.take) : result
        },
      },
      mobilePushRegistration: { findFirst: async () => null },
      mobileUserNotificationPreference: { findMany: async () => [] },
      notificationPreference: { findMany: async () => [] },
    } as never
    const input = {
      limit: 2,
      memberLoginEnabled: true,
      role: "member" as const,
      tenantId: "tenant-1",
      userEmail: "member@example.com",
      userId: "user-1",
    }

    const first = await getMobileNotificationCenter(input, client)
    expect(first.deliveries.map((item) => item.id)).toEqual(["own-3", "own-2"])
    expect(first.deliveries.map((item) => item.isRead)).toEqual([true, false])
    expect(first.nextCursor).toBe("own-2")
    expect(first.summary).toMatchObject({ totalDeliveries: 3, unread: 2 })

    const second = await getMobileNotificationCenter(
      { ...input, cursor: first.nextCursor },
      client
    )
    expect(second.deliveries.map((item) => item.id)).toEqual(["own-1"])
    expect(second.nextCursor).toBeNull()
    expect(second.summary).toMatchObject({ totalDeliveries: 3, unread: 2 })
    expect(queryCounts).toHaveLength(2)
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
