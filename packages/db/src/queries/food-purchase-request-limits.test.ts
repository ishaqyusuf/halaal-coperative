import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { getFoodPurchaseRequestLimits } from "./food-purchase"

function prismaWith(policy: unknown) {
  const calls: unknown[] = []
  const prisma = {
    tenantPolicy: {
      findUnique: async (args: unknown) => {
        calls.push(args)
        return policy
      },
    },
  } as unknown as PrismaClient
  return { calls, prisma }
}

describe("getFoodPurchaseRequestLimits", () => {
  test("reads the tenant's maximum payback months", async () => {
    const { calls, prisma } = prismaWith({
      foodPurchaseMaximumPaybackMonths: 3,
    })
    expect(
      await getFoodPurchaseRequestLimits({ tenantId: "t1" }, prisma)
    ).toEqual({ maximumPaybackMonths: 3 })
    expect(calls).toEqual([
      {
        select: { foodPurchaseMaximumPaybackMonths: true },
        where: { tenantId: "t1" },
      },
    ])
  })

  test("defaults to one month, like the request writer", async () => {
    const { prisma } = prismaWith(null)
    expect(
      await getFoodPurchaseRequestLimits({ tenantId: "t1" }, prisma)
    ).toEqual({ maximumPaybackMonths: 1 })
  })
})
