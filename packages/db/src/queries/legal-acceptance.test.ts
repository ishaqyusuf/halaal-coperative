import { describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { listOwnLegalAcceptances } from "./legal-acceptance"

describe("account-wide legal acceptance history", () => {
  it("shows a member's existing platform consent in another workspace", async () => {
    const calls: unknown[] = []
    const record = {
      documentType: "terms",
      documentVersion: "1.0",
      contentHash: "a".repeat(64),
      action: "accept_terms",
      acceptedAt: new Date("2026-09-25T00:00:00.000Z"),
    }
    const db = {
      user: {
        findFirst: async (args: unknown) => {
          calls.push(args)
          return { id: "user-1" }
        },
      },
      legalAcceptance: {
        findMany: async (args: unknown) => {
          calls.push(args)
          return [record]
        },
      },
    } as unknown as PrismaClient

    expect(
      await listOwnLegalAcceptances(
        { tenantId: "workspace-b", userId: "user-1" },
        db
      )
    ).toEqual([record])
    expect(calls[0]).toMatchObject({
      where: {
        id: "user-1",
        deletedAt: null,
        memberships: { some: { tenantId: "workspace-b" } },
      },
    })
    expect(calls[1]).toMatchObject({ where: { userId: "user-1" } })
  })

  it("denies history when the user lacks the current workspace membership", async () => {
    let historyQueried = false
    const db = {
      user: { findFirst: async () => null },
      legalAcceptance: {
        findMany: async () => {
          historyQueried = true
          return []
        },
      },
    } as unknown as PrismaClient

    await expect(
      listOwnLegalAcceptances({ tenantId: "workspace-b", userId: "user-1" }, db)
    ).rejects.toThrow("Sign in to the current workspace")
    expect(historyQueried).toBe(false)
  })
})
