import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  countNotificationDeliveriesByStatus,
  listNotificationDeliveries,
  listStaffNotificationSettings,
} from "./notifications"

function fakePrisma(input: {
  groups?: Array<{ _count: { _all: number }; action: string }>
  preferences?: Array<Record<string, unknown>>
  rows?: Array<Record<string, unknown>>
}) {
  const calls: Array<Record<string, any>> = []
  const prisma = {
    auditLog: {
      findMany: async (args: Record<string, unknown>) => {
        calls.push(args)
        return input.rows ?? []
      },
      groupBy: async (args: Record<string, unknown>) => {
        calls.push(args)
        return input.groups ?? []
      },
    },
    notificationPreference: {
      findMany: async () => input.preferences ?? [],
    },
  }

  return { calls, prisma: prisma as unknown as PrismaClient }
}

describe("notification deliveries", () => {
  test("filters a member's emails and the status in SQL", async () => {
    const { calls, prisma } = fakePrisma({})

    await listNotificationDeliveries(
      "tenant-1",
      { recipient: "aisha@example.com", status: "failed" },
      prisma
    )

    expect(calls[0]?.where).toEqual({
      AND: [{ metadata: { equals: "aisha@example.com", path: ["recipient"] } }],
      action: "notification.email_failed",
      tenantId: "tenant-1",
    })
  })

  test("pages with a cursor and maps plain fields", async () => {
    const rows = [1, 2, 3].map((index) => ({
      action: "notification.email_sent",
      id: `log-${index}`,
      metadata: {
        notificationType: "contribution.recorded",
        recipient: "a@b.c",
      },
      occurredAt: new Date("2026-11-13T00:00:00Z"),
    }))
    const { prisma } = fakePrisma({ rows })

    const page = await listNotificationDeliveries(
      "tenant-1",
      { pageSize: 2 },
      prisma
    )

    expect(page.data).toHaveLength(2)
    expect(page.data[0]).toMatchObject({
      notificationType: "contribution.recorded",
      recipient: "a@b.c",
      status: "sent",
    })
    expect(page.nextCursor).toBe("log-2")
  })

  test("counts every page by status in one grouped read", async () => {
    const { calls, prisma } = fakePrisma({
      groups: [
        { _count: { _all: 40 }, action: "notification.email_sent" },
        { _count: { _all: 2 }, action: "notification.email_failed" },
      ],
    })

    expect(
      await countNotificationDeliveriesByStatus("tenant-1", {}, prisma)
    ).toEqual({ failed: 2, queued: 0, sent: 40 })
    expect(calls).toHaveLength(1)
  })

  test("treats an email with no saved choice as on", async () => {
    const { prisma } = fakePrisma({
      preferences: [
        {
          channel: "email",
          enabled: false,
          notificationType: "charge.applied",
          role: "finance_officer",
        },
      ],
    })

    const settings = await listStaffNotificationSettings(
      "tenant-1",
      {
        notificationTypes: ["charge.applied"],
        roles: ["tenant_admin", "finance_officer"],
      },
      prisma
    )

    expect(settings[0]?.roles).toEqual([
      { enabled: true, role: "tenant_admin" },
      { enabled: false, role: "finance_officer" },
    ])
  })
})
