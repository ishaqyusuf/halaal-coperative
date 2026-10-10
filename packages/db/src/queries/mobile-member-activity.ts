import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMemberByUserId } from "./members"

export const mobileMemberActivityKindKeys = [
  "commitments",
  "shares",
  "statement",
] as const

export type MobileMemberActivityKind =
  (typeof mobileMemberActivityKindKeys)[number]

export type MobileMemberActivityRow = {
  detail: string
  format: "currency" | "percent" | "count" | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberActivityPage = {
  generatedAt: string
  items: MobileMemberActivityRow[]
  kind: MobileMemberActivityKind
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
}

type ActivityCursor = {
  id: string
  occurredAt: Date
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

function humanizeStatus(value: string | null | undefined) {
  if (!value) return null

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function encodeCursor(cursor: ActivityCursor) {
  return `${cursor.occurredAt.toISOString()}|${cursor.id}`
}

function decodeCursor(cursor: string | null | undefined): ActivityCursor | null {
  if (!cursor) return null

  const separator = cursor.indexOf("|")
  if (separator <= 0 || separator === cursor.length - 1) {
    throw ExpectedQueryError.validation("Member activity cursor is invalid.")
  }

  const occurredAt = new Date(cursor.slice(0, separator))
  const id = cursor.slice(separator + 1)
  if (Number.isNaN(occurredAt.getTime()) || !id.trim()) {
    throw ExpectedQueryError.validation("Member activity cursor is invalid.")
  }

  return { id, occurredAt }
}

function emptyActivityPage(
  kind: MobileMemberActivityKind,
  state: MobileMemberActivityPage["state"]
): MobileMemberActivityPage {
  return {
    generatedAt: new Date().toISOString(),
    items: [],
    kind,
    nextCursor: null,
    state,
  }
}

function pageSize(value: number | undefined) {
  return Math.min(Math.max(value ?? 20, 1), 50)
}

export async function getMobileMemberActivityPage(input: {
  cursor?: string | null
  kind: MobileMemberActivityKind
  limit?: number
  tenantId: string
  userId: string
}, prismaOverride?: PrismaClient): Promise<MobileMemberActivityPage> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptyActivityPage(input.kind, "database_unavailable")

  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptyActivityPage(input.kind, "member_profile_missing")

  const cursor = decodeCursor(input.cursor)
  const take = pageSize(input.limit)

  if (input.kind === "commitments") {
    const rows = await prisma.contribution.findMany({
      where: {
        memberId: member.id,
        status: "posted",
        tenantId: input.tenantId,
        ...(cursor
          ? {
              OR: [
                { postedAt: { lt: cursor.occurredAt } },
                { id: { lt: cursor.id }, postedAt: cursor.occurredAt },
              ],
            }
          : {}),
      },
      orderBy: [{ postedAt: "desc" }, { id: "desc" }],
      take: take + 1,
    })
    const hasNextPage = rows.length > take
    const pageRows = rows.slice(0, take)
    const last = pageRows.at(-1)

    return {
      generatedAt: new Date().toISOString(),
      items: pageRows.map((row) => ({
        detail: [
          humanizeStatus(row.channel),
          `Posted ${formatDateLabel(row.postedAt)}`,
          row.reference ? `Ref ${row.reference}` : null,
          Number(row.extraSavingsAmount) > 0
            ? `Special savings ${Number(row.extraSavingsAmount)}`
            : null,
        ]
          .filter(Boolean)
          .join(" - "),
        format: "currency",
        key: `contribution-${row.id}`,
        label: row.periodLabel ?? "Contribution posted",
        status: "Posted",
        value: Number(row.amount),
      })),
      kind: input.kind,
      nextCursor:
        hasNextPage && last
          ? encodeCursor({ id: last.id, occurredAt: last.postedAt })
          : null,
      state: "available",
    }
  }

  if (input.kind === "shares") {
    const rows = await prisma.memberShareLedgerEntry.findMany({
      where: {
        memberId: member.id,
        tenantId: input.tenantId,
        ...(cursor
          ? {
              OR: [
                { effectiveDate: { lt: cursor.occurredAt } },
                { effectiveDate: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
      take: take + 1,
    })
    const hasNextPage = rows.length > take
    const pageRows = rows.slice(0, take)
    const last = pageRows.at(-1)

    return {
      generatedAt: new Date().toISOString(),
      items: pageRows.map((row) => ({
        detail: `Effective ${formatDateLabel(row.effectiveDate)}`,
        format: "currency",
        key: `share-ledger-${row.id}`,
        label: row.notes ?? "Share ledger movement",
        status: humanizeStatus(row.sourceType),
        value: Number(row.amount),
      })),
      kind: input.kind,
      nextCursor:
        hasNextPage && last
          ? encodeCursor({ id: last.id, occurredAt: last.effectiveDate })
          : null,
      state: "available",
    }
  }

  const rows = await prisma.ledgerTransaction.findMany({
    where: {
      memberId: member.id,
      tenantId: input.tenantId,
      ...(cursor
        ? {
            OR: [
              { postedAt: { lt: cursor.occurredAt } },
              { id: { lt: cursor.id }, postedAt: cursor.occurredAt },
            ],
          }
        : {}),
    },
    include: { entries: true },
    orderBy: [{ postedAt: "desc" }, { id: "desc" }],
    take: take + 1,
  })
  const hasNextPage = rows.length > take
  const pageRows = rows.slice(0, take)
  const last = pageRows.at(-1)

  return {
    generatedAt: new Date().toISOString(),
    items: pageRows.map((row) => {
      const debitEntries = row.entries.filter(
        (entry) => entry.direction === "debit"
      )
      const amountEntries = debitEntries.length > 0 ? debitEntries : row.entries
      const amount = amountEntries.reduce(
        (total, entry) => total + Number(entry.amount),
        0
      )

      return {
        detail: [
          `Posted ${formatDateLabel(row.postedAt)}`,
          row.reference ? `Ref ${row.reference}` : null,
          `${row.entries.length} ledger entr${row.entries.length === 1 ? "y" : "ies"}`,
        ]
          .filter(Boolean)
          .join(" - "),
        format: amount > 0 ? ("currency" as const) : null,
        key: `ledger-${row.id}`,
        label:
          row.narration ??
          humanizeStatus(row.transactionType) ??
          "Ledger transaction",
        status: humanizeStatus(row.transactionType),
        value: amount > 0 ? amount : null,
      }
    }),
    kind: input.kind,
    nextCursor:
      hasNextPage && last
        ? encodeCursor({ id: last.id, occurredAt: last.postedAt })
        : null,
    state: "available",
  }
}
