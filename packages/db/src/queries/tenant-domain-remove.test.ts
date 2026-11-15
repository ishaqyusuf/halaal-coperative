import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { removeTenantCustomDomain } from "./tenants"

type Domain = {
  hostname: string
  id: string
  isPrimary: boolean
  kind: "custom" | "platform"
  tenantId: string
  verificationStatus: string
}

function prismaWith(domains: Domain[]) {
  const deleted: string[] = []
  const audits: unknown[] = []
  const tx = {
    auditLog: {
      create: async (args: { data: unknown }) => {
        audits.push(args.data)
        return args.data
      },
    },
    tenantDomain: {
      delete: async (args: { where: { id: string } }) => {
        deleted.push(args.where.id)
        return args
      },
      findFirst: async (args: { where: { id: string; tenantId: string } }) =>
        domains.find(
          (domain) =>
            domain.id === args.where.id &&
            domain.tenantId === args.where.tenantId
        ) ?? null,
    },
  }
  const prisma = {
    $transaction: async (run: (client: typeof tx) => Promise<unknown>) =>
      run(tx),
  } as unknown as PrismaClient
  return { audits, deleted, prisma }
}

const domains: Domain[] = [
  {
    hostname: "coop.halaalvest.com",
    id: "platform",
    isPrimary: false,
    kind: "platform",
    tenantId: "t1",
    verificationStatus: "verified",
  },
  {
    hostname: "www.coop.ng",
    id: "main",
    isPrimary: true,
    kind: "custom",
    tenantId: "t1",
    verificationStatus: "verified",
  },
  {
    hostname: "old.coop.ng",
    id: "spare",
    isPrimary: false,
    kind: "custom",
    tenantId: "t1",
    verificationStatus: "pending_dns",
  },
]

const remove = (domainId: string, prisma: PrismaClient, tenantId = "t1") =>
  removeTenantCustomDomain({ actorUserId: "u1", domainId, tenantId }, prisma)

describe("removeTenantCustomDomain", () => {
  test("removes an extra custom address and records who did it", async () => {
    const { audits, deleted, prisma } = prismaWith(domains)

    expect(await remove("spare", prisma)).toEqual({
      hostname: "old.coop.ng",
      id: "spare",
    })
    expect(deleted).toEqual(["spare"])
    expect(audits).toMatchObject([
      {
        action: "tenant_domain.removed",
        actorUserId: "u1",
        entityId: "spare",
        metadata: { hostname: "old.coop.ng" },
        tenantId: "t1",
      },
    ])
  })

  test("refuses the main address", async () => {
    const { deleted, prisma } = prismaWith(domains)

    await expect(remove("main", prisma)).rejects.toThrow(
      "Make another address the main one first."
    )
    expect(deleted).toEqual([])
  })

  test("refuses the Halaalvest address", async () => {
    const { deleted, prisma } = prismaWith(domains)

    await expect(remove("platform", prisma)).rejects.toThrow(
      "Your Halaalvest address can't be removed."
    )
    expect(deleted).toEqual([])
  })

  test("can't reach another cooperative's address", async () => {
    const { deleted, prisma } = prismaWith(domains)

    await expect(remove("spare", prisma, "t2")).rejects.toThrow(
      "Address not found"
    )
    expect(deleted).toEqual([])
  })
})
