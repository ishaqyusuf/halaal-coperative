import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { searchGuarantorOptions } from "./guarantor-options"

const tenantId = "tenant-1"

type MemberRow = {
  email: string
  fullName: string
  id: string
  joinedAt: Date
  kycStatus: string
  memberNumber: string
  status: string
  tenantId: string
  totalSavingsSnapshot: number
}

function member(overrides: Partial<MemberRow> & { id: string }): MemberRow {
  return {
    email: `${overrides.id}@example.test`,
    fullName: overrides.id,
    joinedAt: new Date(),
    kycStatus: "verified",
    memberNumber: `M-${overrides.id}`,
    status: "active",
    tenantId,
    totalSavingsSnapshot: 250_000,
    ...overrides,
  }
}

function fakePrisma(rows: MemberRow[]) {
  const calls: Array<{ select: unknown; where: Record<string, any> }> = []
  const matches = (row: MemberRow, where: Record<string, any>) => {
    if (where.tenantId && row.tenantId !== where.tenantId) return false
    if (where.status && row.status !== where.status) return false
    if (where.kycStatus && row.kycStatus !== where.kycStatus) return false
    if (where.NOT?.id && row.id === where.NOT.id) return false
    if (where.id?.in && !where.id.in.includes(row.id)) return false
    if (
      where.fullName?.contains &&
      !row.fullName
        .toLowerCase()
        .includes(String(where.fullName.contains).toLowerCase())
    ) {
      return false
    }
    return true
  }
  const pick = (row: MemberRow, select: Record<string, boolean>) =>
    Object.fromEntries(
      Object.keys(select).map((key) => [key, row[key as keyof MemberRow]])
    )

  const prisma = {
    member: {
      findMany: async (args: {
        select: Record<string, boolean>
        take?: number
        where: Record<string, any>
      }) => {
        calls.push({ select: args.select, where: args.where })
        return rows
          .filter((row) => matches(row, args.where))
          .slice(0, args.take ?? rows.length)
          .map((row) => pick(row, args.select))
      },
    },
  }

  return { calls, prisma: prisma as unknown as PrismaClient }
}

describe("searchGuarantorOptions", () => {
  test("returns names only, for ready members of the same cooperative", async () => {
    const { calls, prisma } = fakePrisma([
      member({ fullName: "Aisha Bello", id: "a" }),
      member({ fullName: "Bala Musa", id: "b", kycStatus: "pending" }),
      member({ fullName: "Chika Obi", id: "c", status: "suspended" }),
      member({ fullName: "Dauda Ali", id: "d", tenantId: "tenant-2" }),
      member({ fullName: "Esther John", id: "self" }),
    ])

    const options = await searchGuarantorOptions(
      { excludeMemberId: "self", tenantId },
      prisma
    )

    expect(options).toEqual([{ fullName: "Aisha Bello", id: "a" }])
    // The candidate read never selects contact details, numbers or balances.
    expect(calls[0]!.select).toEqual({ fullName: true, id: true })
  })

  test("searches by name, never by member number", async () => {
    const { calls, prisma } = fakePrisma([
      member({ fullName: "Aisha Bello", id: "a", memberNumber: "KAD-001" }),
      member({ fullName: "Bala Musa", id: "b" }),
    ])

    expect(
      await searchGuarantorOptions({ query: "bell", tenantId }, prisma)
    ).toEqual([{ fullName: "Aisha Bello", id: "a" }])
    expect(
      await searchGuarantorOptions({ query: "KAD-001", tenantId }, prisma)
    ).toEqual([])
    expect(calls[1]!.where).not.toHaveProperty("OR")
  })

  test("resolving ids applies the same rules", async () => {
    const { prisma } = fakePrisma([
      member({ fullName: "Aisha Bello", id: "a" }),
      member({ fullName: "Bala Musa", id: "b", kycStatus: "not_started" }),
      member({ fullName: "Other Coop", id: "x", tenantId: "tenant-2" }),
      member({ fullName: "Esther John", id: "self" }),
    ])

    expect(
      await searchGuarantorOptions(
        { excludeMemberId: "self", ids: ["a", "b", "x", "self"], tenantId },
        prisma
      )
    ).toEqual([{ fullName: "Aisha Bello", id: "a" }])
  })

  test("leaves out members whose opening balances are not finished", async () => {
    const { prisma } = fakePrisma([
      member({ fullName: "Aisha Bello", id: "a" }),
      member({
        fullName: "Bala Musa",
        id: "b",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      }),
    ])

    // Bala joined long ago with no applied history, so is not ready.
    expect(await searchGuarantorOptions({ tenantId }, prisma)).toEqual([
      { fullName: "Aisha Bello", id: "a" },
    ])
  })
})
