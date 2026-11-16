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

type AuditRow = {
  action: string
  id: string
  metadata: Record<string, string> | null
  occurredAt: Date
  tenantId: string
}

type MetadataFilter = {
  metadata: { equals?: string; path: string[]; string_contains?: string }
}

/**
 * Applies the delivery `where` to rows in memory (tenant, action, metadata
 * path filters), so paging and totals are checked against real row sets.
 */
function memoryAuditLogPrisma(
  input: Array<{ action: string; recipient: string | null; tenantId: string }>
) {
  const rows: AuditRow[] = input.map((row, index) => ({
    action: row.action,
    id: `log-${String(index).padStart(3, "0")}`,
    metadata: row.recipient
      ? { notificationType: "contribution.recorded", recipient: row.recipient }
      : null,
    occurredAt: new Date(Date.UTC(2026, 10, 1, 0, index)),
    tenantId: row.tenantId,
  }))
  const matches = (
    row: AuditRow,
    where: {
      AND?: MetadataFilter[]
      action: string | { in: string[] }
      tenantId: string
    }
  ) =>
    row.tenantId === where.tenantId &&
    (typeof where.action === "string"
      ? row.action === where.action
      : where.action.in.includes(row.action)) &&
    (where.AND ?? []).every(({ metadata: filter }) => {
      const value = row.metadata?.[filter.path[0] ?? ""]
      if (typeof value !== "string") return false
      if (filter.equals !== undefined) return value === filter.equals
      return value.includes(filter.string_contains ?? "")
    })
  const newestFirst = (a: AuditRow, b: AuditRow) =>
    b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id)

  const prisma = {
    auditLog: {
      findMany: async (args: {
        cursor?: { id: string }
        take: number
        where: Parameters<typeof matches>[1]
      }) => {
        const sorted = rows
          .filter((row) => matches(row, args.where))
          .sort(newestFirst)
        const start = args.cursor
          ? sorted.findIndex((row) => row.id === args.cursor?.id) + 1
          : 0
        return sorted.slice(start, start + args.take)
      },
      groupBy: async (args: { where: Parameters<typeof matches>[1] }) => {
        const counts = new Map<string, number>()
        for (const row of rows.filter((row) => matches(row, args.where))) {
          counts.set(row.action, (counts.get(row.action) ?? 0) + 1)
        }
        return [...counts].map(([action, count]) => ({
          _count: { _all: count },
          action,
        }))
      },
    },
  }

  return prisma as unknown as PrismaClient
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

  test("totals stay right when there are more emails than one page", async () => {
    const prisma = memoryAuditLogPrisma([
      // 70 emails for tenant 1: every tenth failed, every tenth +5 waiting.
      ...Array.from({ length: 70 }, (_, index) => ({
        action:
          index % 10 === 0
            ? "notification.email_failed"
            : index % 10 === 5
              ? "notification.email_queued"
              : "notification.email_sent",
        recipient: index % 2 === 0 ? "aisha@example.com" : "bilal@example.com",
        tenantId: "tenant-1",
      })),
      // Not counted: another cooperative's email and a non-email audit row.
      ...Array.from({ length: 10 }, () => ({
        action: "notification.email_sent",
        recipient: "aisha@example.com",
        tenantId: "tenant-2",
      })),
      { action: "contribution.recorded", recipient: null, tenantId: "tenant-1" },
    ])

    const firstPage = await listNotificationDeliveries(
      "tenant-1",
      { pageSize: 25 },
      prisma
    )
    const pageOneFailed = firstPage.data.filter(
      (row) => row.status === "failed"
    ).length
    const listed = [...firstPage.data]
    let cursor = firstPage.nextCursor

    while (cursor) {
      const page = await listNotificationDeliveries(
        "tenant-1",
        { cursor, pageSize: 25 },
        prisma
      )
      listed.push(...page.data)
      cursor = page.nextCursor
    }

    const totals = await countNotificationDeliveriesByStatus(
      "tenant-1",
      {},
      prisma
    )

    expect(firstPage.data).toHaveLength(25)
    expect(listed).toHaveLength(70)
    expect(totals).toEqual({ failed: 7, queued: 7, sent: 56 })
    expect(totals.failed).toBeGreaterThan(pageOneFailed)
    expect(totals).toEqual({
      failed: listed.filter((row) => row.status === "failed").length,
      queued: listed.filter((row) => row.status === "queued").length,
      sent: listed.filter((row) => row.status === "sent").length,
    })

    // A member's totals cover only their own emails, across every page.
    expect(
      await countNotificationDeliveriesByStatus(
        "tenant-1",
        { recipient: "aisha@example.com" },
        prisma
      )
    ).toEqual({ failed: 7, queued: 0, sent: 28 })
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
