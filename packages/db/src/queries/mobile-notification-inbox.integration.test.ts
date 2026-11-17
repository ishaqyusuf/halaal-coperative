import { describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { createPrismaClient } from "../prisma"
import {
  deriveMobileNotificationReadAuditId,
  getMobileNotificationCenter,
  getMobileNotificationPage,
  getMobileNotificationUnreadCount,
  markAllMobileNotificationsRead,
  markMobileNotificationsRead,
} from "./mobile-notifications"

const prisma = createPrismaClient()
const integration = prisma ? describe : describe.skip

integration("mobile notification inbox on Postgres", () => {
  test("pages stable, recipient-scoped unread deliveries and marks beyond the first page", async () => {
    const db = prisma!
    const tag = randomUUID().slice(0, 8)
    const tenant = await db.tenant.create({
      data: { name: "Inbox test", slug: `inbox-${tag}` },
    })
    let userId: string | undefined
    try {
      const user = await db.user.create({
        data: {
          email: `inbox-${tag}@example.test`,
          fullName: "Inbox Member",
          tenantId: tenant.id,
        },
      })
      userId = user.id
      const input = {
        role: "member" as const,
        tenantId: tenant.id,
        userEmail: user.email,
        userId,
      }
      const ids = Array.from({ length: 29 }, () => randomUUID())
        .sort()
        .reverse()
      const otherRoleId = randomUUID()
      const mismatchedRecipientId = randomUUID()
      const occurredAt = new Date()
      await db.auditLog.createMany({
        data: [...ids, otherRoleId, mismatchedRecipientId].map((id) => ({
          action: "notification.push_sent",
          actorType: "system",
          entityType: "NotificationDelivery",
          id,
          metadata: {
            notificationType: "payment.receipt.updated",
            recipient: user.email,
            ...(id === otherRoleId ? { intendedRole: "tenant_admin" } : {}),
            ...(id === mismatchedRecipientId
              ? { recipientUserId: randomUUID() }
              : {}),
            ...(id === ids[0]
              ? {
                  recipientUserId: user.id,
                  recipient: "old-address@example.test",
                }
              : {}),
          },
          occurredAt,
          tenantId: tenant.id,
        })),
      })
      const first = await getMobileNotificationCenter(
        { ...input, scopedPage: true },
        db
      )
      expect(first.deliveries.map(({ id }) => id)).toEqual(ids.slice(0, 25))
      expect(first.summary).toMatchObject({ totalDeliveries: 29, unread: 29 })
      expect(first.nextCursor).toBe(ids[24]!)
      const unread = await getMobileNotificationPage(
        { ...input, limit: 2, unreadOnly: true },
        db
      )
      expect(unread.deliveries.map(({ id }) => id)).toEqual(ids.slice(0, 2))
      await markMobileNotificationsRead(
        {
          actorUserId: user.id,
          deliveryIds: ids.slice(0, 2),
          tenantId: tenant.id,
          userEmail: user.email,
        },
        db
      )
      const beforeBulk = await getMobileNotificationUnreadCount(input, db)
      expect(beforeBulk).toBe(27)
      const older = await getMobileNotificationPage(
        {
          ...input,
          cursor: unread.nextCursor,
          limit: 2,
          unreadOnly: true,
        },
        db
      )
      expect(older.deliveries.map(({ id }) => id)).toEqual(ids.slice(2, 4))

      const result = await Promise.all([
        markAllMobileNotificationsRead(input, db),
        markAllMobileNotificationsRead(input, db),
      ])
      expect(result.reduce((sum, item) => sum + item.markedCount, 0)).toBe(27)
      expect(await getMobileNotificationUnreadCount(input, db)).toBe(0)
      expect(
        await getMobileNotificationUnreadCount(
          { ...input, role: "tenant_admin" },
          db
        )
      ).toBe(1)
      expect(
        await getMobileNotificationPage({ ...input, unreadOnly: true }, db)
      ).toEqual({ deliveries: [], nextCursor: null })
      const lastId = ids.at(-1)!
      expect(
        await db.auditLog.findUnique({
          where: {
            id: deriveMobileNotificationReadAuditId(tenant.id, user.id, lastId),
          },
          select: { entityId: true },
        })
      ).toEqual({ entityId: lastId })
    } finally {
      await db.auditLog.deleteMany({ where: { tenantId: tenant.id } })
      if (userId) await db.user.delete({ where: { id: userId } })
      await db.tenant.delete({ where: { id: tenant.id } })
    }
  }, 20_000)
})
