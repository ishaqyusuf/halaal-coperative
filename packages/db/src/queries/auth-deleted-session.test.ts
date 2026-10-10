import { expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  findMembershipsForUserAsync,
  findUserByCooperativeAccessCodeAsync,
  findUserByEmailAsync,
  findUserByIdAsync,
} from "./auth"

const deletedUserId = "d13f5262-0fd6-4838-bbe5-8975161d37f3"

test("a soft-deleted account cannot resolve from an already-issued session", async () => {
  const previousUrl = process.env.HALAALVEST_DATABASE_URL
  const prismaGlobal = globalThis as typeof globalThis & {
    __halaalVestPrisma?: PrismaClient
  }
  const previousClient = prismaGlobal.__halaalVestPrisma
  let lookupCount = 0

  process.env.HALAALVEST_DATABASE_URL = "postgresql://unused@localhost/unused"
  prismaGlobal.__halaalVestPrisma = {
    user: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; deletedAt: null }
      }) => {
        lookupCount++
        expect(where).toEqual({ id: deletedUserId, deletedAt: null })
        return null
      },
    },
  } as unknown as PrismaClient

  try {
    expect(await findUserByIdAsync(deletedUserId)).toBeNull()
    expect(lookupCount).toBe(1)
  } finally {
    prismaGlobal.__halaalVestPrisma = previousClient
    if (previousUrl === undefined) delete process.env.HALAALVEST_DATABASE_URL
    else process.env.HALAALVEST_DATABASE_URL = previousUrl
  }
})

test("production authentication never falls back to seed identities", async () => {
  const previousEnvironment = process.env.NODE_ENV
  const previousUrl = process.env.HALAALVEST_DATABASE_URL
  process.env.NODE_ENV = "production"
  delete process.env.HALAALVEST_DATABASE_URL

  try {
    expect(await findUserByIdAsync("user-platform-owner")).toBeNull()
    expect(
      await findUserByEmailAsync({ email: "owner@halaalvest.local" })
    ).toBeNull()
    expect(await findUserByCooperativeAccessCodeAsync("AMN-OWNER")).toBeNull()
    expect(await findMembershipsForUserAsync("user-platform-owner")).toEqual([])
    process.env.HALAALVEST_DATABASE_URL = "postgresql://unused@localhost/unused"
    expect(await findUserByIdAsync("user-platform-owner")).toBeNull()
    expect(await findMembershipsForUserAsync("user-platform-owner")).toEqual([])
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousEnvironment
    if (previousUrl === undefined) delete process.env.HALAALVEST_DATABASE_URL
    else process.env.HALAALVEST_DATABASE_URL = previousUrl
  }
})
