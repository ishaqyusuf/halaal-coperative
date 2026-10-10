import { describe, expect, test } from "bun:test"
import { listActivityReportEvents } from "./audit"

describe("audit activity report", () => {
  test("normalizes actor, authorizer, entity, date, and change summary", async () => {
    const auditFindManyCalls: unknown[] = []
    const userFindManyCalls: unknown[] = []
    const occurredAt = new Date("2026-07-09T10:15:00.000Z")

    const events = await listActivityReportEvents(
      "tenant-1",
      { limit: 50, search: "receipt" },
      {
        auditLog: {
          findMany: async (args: unknown) => {
            auditFindManyCalls.push(args)
            return [
              {
                action: "member_payment_receipt.approved",
                actorType: "user",
                actorUser: {
                  email: "finance@example.com",
                  fullName: "Finance Officer",
                  id: "user-1",
                },
                actorUserId: "user-1",
                createdAt: occurredAt,
                entityId: "receipt-1",
                entityType: "MemberPaymentReceipt",
                id: "audit-1",
                metadata: {
                  adjustmentReason: "Wrong split corrected",
                  approvedByUserId: "user-2",
                  memberId: "member-1",
                  next: {
                    status: "approved",
                    totalAmount: 50000,
                  },
                  previous: {
                    status: "pending",
                    totalAmount: 45000,
                  },
                  previousStatus: "pending",
                  status: "approved",
                },
                occurredAt,
                tenantId: "tenant-1",
              },
            ]
          },
        },
        user: {
          findMany: async (args: unknown) => {
            userFindManyCalls.push(args)
            return [
              {
                email: "admin@example.com",
                fullName: "Cooperative Admin",
                id: "user-2",
              },
            ]
          },
        },
      } as never,
    )

    expect(auditFindManyCalls[0]).toMatchObject({
      take: 50,
      where: {
        tenantId: "tenant-1",
      },
    })
    expect(userFindManyCalls[0]).toMatchObject({
      where: {
        id: {
          in: ["user-2"],
        },
        tenantId: "tenant-1",
      },
    })
    expect(events).toEqual([
      {
        action: "member_payment_receipt.approved",
        actionLabel: "Member Payment Receipt Approved",
        actorEmail: "finance@example.com",
        actorLabel: "Finance Officer",
        actorName: "Finance Officer",
        actorType: "user",
        actorUserId: "user-1",
        authorizationRole: "Approver",
        authorizerEmail: "admin@example.com",
        authorizerLabel: "Cooperative Admin",
        authorizerName: "Cooperative Admin",
        authorizerUserId: "user-2",
        entityId: "receipt-1",
        entityType: "MemberPaymentReceipt",
        id: "audit-1",
        metadataSummary: [
          "Status: pending -> approved",
          "Total Amount: 45000 -> 50000",
          "Adjustment Reason: Wrong split corrected",
        ],
        occurredAt,
      },
    ])
  })

  test("redacts sensitive values and excludes arbitrary before-and-after payloads", async () => {
    const occurredAt = new Date("2026-08-31T10:15:00.000Z")
    const [event] = await listActivityReportEvents(
      "tenant-1",
      { limit: 10 },
      {
        auditLog: {
          findMany: async () => [
            {
              action: "member.updated",
              actorType: "user",
              actorUser: null,
              actorUserId: "user-1",
              createdAt: occurredAt,
              entityId: "member-1",
              entityType: "Member",
              id: "audit-1",
              metadata: {
                next: {
                  email: "member@example.com",
                  phoneNumber: "+234 801 234 5678",
                  status: "active",
                },
                notes:
                  "Contact member@example.com or +234 801 234 5678 at https://private.example.test/file",
                previous: {
                  email: "old@example.com",
                  phoneNumber: "+234 800 000 0000",
                  status: "pending",
                },
                previousStatus: "pending",
                status: "active",
              },
              occurredAt,
              tenantId: "tenant-1",
            },
          ],
        },
        user: { findMany: async () => [] },
      } as never,
    )

    expect(event?.metadataSummary).toEqual([
      "Status: pending -> active",
      "Notes: Contact [redacted email] or [redacted phone] at [redacted link]",
    ])
    expect(JSON.stringify(event)).not.toContain("member@example.com")
    expect(JSON.stringify(event)).not.toContain("234 801")
  })
})
