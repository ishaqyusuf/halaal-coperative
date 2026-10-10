import { describe, expect, test } from "bun:test"
import {
  findProductionQaHarnessOperatorId,
  inspectProductionQaInvitationProof,
} from "./production-qa-invitation-proof"

const STARTED_AT = new Date("2026-09-04T17:00:00.000Z")

describe("production QA invitation proof", () => {
  test("finds a platform operator without returning identity data", async () => {
    await expect(
      findProductionQaHarnessOperatorId({
        user: {
          findFirst: async () => ({ id: "platform-operator-1" }),
        },
      } as never)
    ).resolves.toBe("platform-operator-1")

    await expect(
      findProductionQaHarnessOperatorId({
        user: { findFirst: async () => null },
      } as never)
    ).rejects.toThrow("active platform owner")
  })

  test("proves persisted default admin access and QA-routed delivery without exposing recipients", async () => {
    const proof = await inspectProductionQaInvitationProof(
      {
        expectedEmail: "ticket30.admin@ishaq.qa.test",
        expectedRole: "tenant_admin",
        membershipId: "membership-invited-admin",
        startedAt: STARTED_AT,
        tenantId: "qa-tenant-1",
      },
      {
        auditLog: {
          findMany: async () => [
            {
              action: "notification.email_sent",
              entityId: "delivery-1",
              metadata: {
                deliveredRecipients: ["tester-inbox@example.com"],
                recipient: "ticket30.admin@ishaq.qa.test",
                routingMode: "qa_domain",
                source: "mobile.workspace_access",
                status: "sent",
              },
              occurredAt: new Date("2026-09-04T17:00:02.000Z"),
            },
            {
              action: "membership.provisioned",
              entityId: "membership-invited-admin",
              metadata: { role: "tenant_admin" },
              occurredAt: new Date("2026-09-04T17:00:01.000Z"),
            },
          ],
        },
        membership: {
          findFirst: async () => ({
            id: "membership-invited-admin",
            isDefault: true,
            role: "tenant_admin",
            user: {
              cooperativeAccessCode: "QSH-4821",
              email: "ticket30.admin@ishaq.qa.test",
              passwordHash: null,
            },
          }),
        },
      } as never
    )

    expect(proof).toEqual({
      complete: true,
      delivery: {
        auditFound: true,
        deliveredRecipientCount: 1,
        originalRecipientContacted: false,
        qaRouted: true,
        status: "sent",
      },
      identity: {
        cooperativeNumberValid: true,
        emailMatches: true,
        found: true,
        isDefault: true,
        passwordAbsent: true,
        roleMatches: true,
      },
      membershipAuditFound: true,
    })
    expect(JSON.stringify(proof)).not.toContain("ticket30.admin")
    expect(JSON.stringify(proof)).not.toContain("tester-inbox")
  })

  test("fails proof when a sent delivery targets the original reserved address", async () => {
    const proof = await inspectProductionQaInvitationProof(
      {
        expectedEmail: "ticket30.admin@ishaq.qa.test",
        expectedRole: "tenant_admin",
        membershipId: "membership-invited-admin",
        startedAt: STARTED_AT,
        tenantId: "qa-tenant-1",
      },
      {
        auditLog: {
          findMany: async () => [
            {
              action: "notification.email_sent",
              entityId: "delivery-1",
              metadata: {
                deliveredRecipients: ["ticket30.admin@ishaq.qa.test"],
                recipient: "ticket30.admin@ishaq.qa.test",
                routingMode: "live",
                source: "mobile.workspace_access",
                status: "sent",
              },
              occurredAt: new Date("2026-09-04T17:00:02.000Z"),
            },
            {
              action: "membership.provisioned",
              entityId: "membership-invited-admin",
              metadata: {},
              occurredAt: new Date("2026-09-04T17:00:01.000Z"),
            },
          ],
        },
        membership: {
          findFirst: async () => ({
            id: "membership-invited-admin",
            isDefault: true,
            role: "tenant_admin",
            user: {
              cooperativeAccessCode: "QSH-4821",
              email: "ticket30.admin@ishaq.qa.test",
              passwordHash: null,
            },
          }),
        },
      } as never
    )

    expect(proof.complete).toBe(false)
    expect(proof.delivery).toMatchObject({
      originalRecipientContacted: true,
      qaRouted: false,
    })
  })
})
