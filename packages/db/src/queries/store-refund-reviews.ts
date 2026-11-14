import { ExpectedQueryError } from "../query-error"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"

const pageSize = 30

function unavailable() {
  return new AppError({
    code: "PRECONDITION_FAILED",
    publicMessage: "Store refund reviews are temporarily unavailable.",
  })
}

function parseCursor(value: string | null | undefined) {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString()
    )
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== "string" ||
      typeof parsed[1] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed[0]) ||
      !Number.isFinite(Date.parse(parsed[0])) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        parsed[1]
      )
    )
      throw ExpectedQueryError.validation("Invalid cursor")
    return { occurredAt: new Date(parsed[0]), id: parsed[1] }
  } catch {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage: "Refresh the refund review queue and try again.",
    })
  }
}

function metadata(payload: Prisma.JsonValue | null) {
  const value =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : null
  const date = (candidate: unknown) =>
    typeof candidate === "string" && Number.isFinite(Date.parse(candidate))
      ? candidate
      : null
  return {
    orderId: typeof value?.orderId === "string" ? value.orderId : null,
    refundReason:
      typeof value?.refundReason === "number" &&
      Number.isInteger(value.refundReason)
        ? value.refundReason
        : null,
    accountBinding:
      typeof value?.obfuscatedAccountId === "string"
        ? value.obfuscatedAccountId
        : null,
    receivedAt: date(value?.receivedAt),
    reviewBy: date(value?.reviewBy),
  }
}

const reviewSelection = {
  id: true,
  tenantId: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
  attempts: true,
  payload: true,
} as const

type ReviewRow = {
  attempts: number
  payload: Prisma.JsonValue | null
  updatedAt: Date
  id: string
  tenantId: string | null
  occurredAt: Date
  createdAt: Date
}

function toReview({ payload, attempts, updatedAt, ...row }: ReviewRow) {
  return {
    ...row,
    ...metadata(payload),
    trackedDeliveries: attempts > 0 ? attempts : null,
    lastObservedAt: attempts > 0 ? updatedAt : null,
  }
}

async function requireRefundReviewer(db: PrismaClient, actorUserId: string) {
  const actor = await db.user.findFirst({
    where: { id: actorUserId, isPlatformOwner: true, deletedAt: null },
    select: { id: true },
  })
  if (!actor)
    throw new AppError({
      code: "PERMISSION_DENIED",
      publicMessage: "Platform-owner access is required.",
    })
}

const pendingReviewWhere = {
  providerName: "google_play",
  eventType: "pending_refund_review.received",
} as const

/** One Google refund review for the details sheet (2 statements). */
export async function getStoreRefundReview(
  input: { actorUserId: string; reviewId: string },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db) throw unavailable()
  await requireRefundReviewer(db, input.actorUserId)
  const row = await db.subscriptionProviderEvent.findFirst({
    where: { id: input.reviewId, ...pendingReviewWhere },
    select: { ...reviewSelection, status: true },
  })
  if (!row) throw ExpectedQueryError.notFound("Refund review not found.")
  const { status, ...rest } = row
  return { ...toReview(rest), pending: status === "received" }
}

export async function listPendingStoreRefundReviews(
  input: { actorUserId: string; cursor?: string | null },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db) throw unavailable()
  await requireRefundReviewer(db, input.actorUserId)
  const cursor = parseCursor(input.cursor)
  const rows = await db.subscriptionProviderEvent.findMany({
    where: {
      ...pendingReviewWhere,
      status: "received",
      ...(cursor
        ? {
            OR: [
              { occurredAt: { gt: cursor.occurredAt } },
              { occurredAt: cursor.occurredAt, id: { gt: cursor.id } },
            ],
          }
        : {}),
    },
    select: reviewSelection,
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    take: pageSize + 1,
  })
  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  return {
    asOf: new Date().toISOString(),
    data: page.map(toReview),
    meta: {
      cursor:
        rows.length > pageSize && last
          ? Buffer.from(
              JSON.stringify([last.occurredAt.toISOString(), last.id])
            ).toString("base64url")
          : null,
    },
  }
}
