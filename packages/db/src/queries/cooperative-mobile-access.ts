import { cooperativeMobileAccessTerms as terms } from "@halaalvest/domain/cooperative-mobile-access"
import { previewCooperativeAccessCode } from "@halaalvest/utils"
import type {
  CooperativeMobileAccessTerm,
  CooperativeMobileAccessTermStatus,
  Prisma,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  ExpectedQueryError,
  isUniqueConstraintError,
  QueryInfrastructureError,
} from "../query-error"
import { lockCooperativeMobileBilling } from "./cooperative-mobile-billing-lock"

type Actor = { tenantId: string; userId: string; membershipId: string }

function database() {
  const db = createPrismaClient()
  if (!db) throw new QueryInfrastructureError("Database not configured")
  return db
}

async function changeAccess<T>(
  change: (tx: Prisma.TransactionClient) => Promise<T>
) {
  const db = database()
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(change, { isolationLevel: "Serializable" })
    } catch (error) {
      if (
        (error as { code?: string } | null)?.code !== "P2034" ||
        attempt >= 3
      ) {
        throw error
      }
    }
  }
}

function findMembership(db: Prisma.TransactionClient, input: Actor) {
  return db.membership.findFirst({
    where: {
      id: input.membershipId,
      tenantId: input.tenantId,
      userId: input.userId,
      user: { deletedAt: null },
      tenant: { status: "active", qaPurgeStartedAt: null },
    },
    select: {
      role: true,
      tenant: {
        select: {
          cooperativeCodePrefix: true,
          cooperativeMobileAccessEnabled: true,
          currencyCode: true,
        },
      },
    },
  })
}

async function requireAdmin(db: Prisma.TransactionClient, input: Actor) {
  const membership = await findMembership(db, input)
  if (
    membership?.role !== "tenant_admin" &&
    membership?.role !== "super_admin"
  ) {
    throw ExpectedQueryError.permission(
      "Cooperative administrator access is required."
    )
  }
  return membership.tenant
}

function activeMemberForUser(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    status: "active",
    user: { deletedAt: null },
  } as const
}

function latestTerm(
  db: Prisma.TransactionClient,
  tenantId: string,
  memberId: string
) {
  return db.cooperativeMobileAccessTerm.findFirst({
    where: { tenantId, memberId },
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
  })
}

function isWithinTerm(term: CooperativeMobileAccessTerm, now: Date) {
  return Boolean(
    term.startsAt && term.startsAt <= now && term.endsAt && now < term.endsAt
  )
}

function statusAt(term: CooperativeMobileAccessTerm, now: Date) {
  if (term.status === "approved") {
    return isWithinTerm(term, now) ? ("active" as const) : ("expired" as const)
  }
  if (term.status === "revoked" && term.endsAt && now >= term.endsAt) {
    return "expired" as const
  }
  return term.status
}

function presentTerm(term: CooperativeMobileAccessTerm, now: Date) {
  return {
    id: term.id,
    status: statusAt(term, now),
    requestedAt: term.requestedAt,
    approvedAt: term.approvedAt,
    startsAt: term.startsAt,
    endsAt: term.endsAt,
    chargeDueAt: term.chargeDueAt,
    reviewNote: term.reviewNote,
    revokedAt: term.revokedAt,
  }
}

function blocksNewTerm(term: CooperativeMobileAccessTerm, now: Date) {
  return term.status === "pending" || isWithinTerm(term, now)
}

const lagosOffsetMs = 60 * 60 * 1000

function lagosMonthEnd(now: Date) {
  const lagos = new Date(now.getTime() + lagosOffsetMs)
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth() + 1, 0))
}

function addCalendarMonths(now: Date, months: number) {
  const expiry = new Date(now.getTime() + lagosOffsetMs)
  const day = expiry.getUTCDate()
  expiry.setUTCDate(1)
  expiry.setUTCMonth(expiry.getUTCMonth() + months)
  const lastDay = new Date(
    Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0)
  )
  expiry.setUTCDate(Math.min(day, lastDay.getUTCDate()))
  return new Date(expiry.getTime() - lagosOffsetMs)
}

async function auditAccess(
  db: Prisma.TransactionClient,
  actor: Actor,
  input: {
    action: string
    termId?: string
    metadata?: Prisma.InputJsonObject
    occurredAt: Date
  }
) {
  await db.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      actorType: "user",
      entityType: input.termId ? "CooperativeMobileAccessTerm" : "Tenant",
      entityId: input.termId ?? actor.tenantId,
      action: `cooperative_mobile_access.${input.action}`,
      metadata: input.metadata,
      occurredAt: input.occurredAt,
    },
  })
}

export async function getCooperativeMobileAccessSnapshot(input: Actor) {
  const db = createPrismaClient()
  const scope = {
    userBinding: input.userId,
    tenantId: input.tenantId,
    membershipId: input.membershipId,
  }
  const membership = db ? await findMembership(db, input) : null
  if (!db || membership?.role !== "member") {
    const allowed = membership?.tenant.cooperativeMobileAccessEnabled === true
    return {
      ...scope,
      accessAllowed: allowed,
      status: allowed ? ("active" as const) : ("not_requested" as const),
      accessEndsAt: null,
    }
  }

  const term = await db.cooperativeMobileAccessTerm.findFirst({
    where: {
      tenantId: input.tenantId,
      member: activeMemberForUser(input.tenantId, input.userId),
    },
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
  })
  const status = term ? statusAt(term, new Date()) : "not_requested"
  return {
    ...scope,
    accessAllowed: status === "active",
    status,
    accessEndsAt: status === "active" ? (term?.endsAt ?? null) : null,
  }
}

export async function getCooperativeMobileMemberStatus(input: Actor) {
  const db = database()
  const membership = await findMembership(db, input)
  if (membership?.role !== "member") {
    throw ExpectedQueryError.permission("Member access is required.")
  }
  const member = await db.member.findFirst({
    where: activeMemberForUser(input.tenantId, input.userId),
    select: {
      id: true,
      fullName: true,
      user: { select: { cooperativeAccessCode: true } },
    },
  })
  const term = member ? await latestTerm(db, input.tenantId, member.id) : null
  const item = term?.approvedAt
    ? await db.cooperativeMobileInvoiceItem.findUnique({
        where: { termId: term.id },
        select: {
          chargeApplication: {
            select: {
              status: true,
              ledgerTransaction: {
                select: { postedAt: true, reference: true },
              },
            },
          },
        },
      })
    : null
  const charge = item?.chargeApplication
  const now = new Date()
  const enabled = membership.tenant.cooperativeMobileAccessEnabled
  return {
    ...terms,
    enabled,
    canRequest: Boolean(
      enabled && member && (!term || !blocksNewTerm(term, now))
    ),
    memberName: member?.fullName ?? null,
    term: term
      ? {
          ...presentTerm(term, now),
          amount: term.amount.toNumber(),
          currencyCode: term.currencyCode,
          payment: charge
            ? {
                status: charge.status,
                paidAt:
                  charge.status === "posted"
                    ? (charge.ledgerTransaction?.postedAt ?? null)
                    : null,
                reference:
                  charge.status === "posted"
                    ? (charge.ledgerTransaction?.reference ?? null)
                    : null,
              }
            : null,
        }
      : null,
    cooperativeNumber:
      term && statusAt(term, now) === "active"
        ? (member?.user?.cooperativeAccessCode ?? null)
        : null,
  }
}

export async function requestCooperativeMobileAccess(
  input: Actor & { termsVersion: string }
) {
  return changeAccess(async (db) => {
    const membership = await findMembership(db, input)
    if (membership?.role !== "member") {
      throw ExpectedQueryError.permission("Member access is required.")
    }
    if (!membership.tenant.cooperativeMobileAccessEnabled) {
      throw ExpectedQueryError.precondition(
        "This cooperative is not accepting mobile access requests."
      )
    }
    if (input.termsVersion !== terms.termsVersion) {
      throw ExpectedQueryError.conflict(
        "Mobile access terms changed. Review the current terms and try again."
      )
    }
    const member = await db.member.findFirst({
      where: activeMemberForUser(input.tenantId, input.userId),
      select: { id: true },
    })
    if (!member)
      throw ExpectedQueryError.permission(
        "An active member profile is required."
      )
    const now = new Date()
    const previous = await latestTerm(db, input.tenantId, member.id)
    if (previous && blocksNewTerm(previous, now)) {
      if (previous.status === "pending") return presentTerm(previous, now)
      throw ExpectedQueryError.conflict(
        "There is already a mobile access term for this member."
      )
    }
    const term = await db.cooperativeMobileAccessTerm.create({
      data: {
        ...terms,
        tenantId: input.tenantId,
        memberId: member.id,
        requestedAt: now,
      },
    })
    await auditAccess(db, input, {
      action: "requested",
      termId: term.id,
      metadata: {
        termsVersion: terms.termsVersion,
        amount: terms.amount,
        currencyCode: terms.currencyCode,
      },
      occurredAt: now,
    })
    return presentTerm(term, now)
  })
}

export async function listCooperativeMobileAccessTerms(
  input: Actor & {
    status?: CooperativeMobileAccessTermStatus
    cursor?: string
    limit: number
  }
) {
  const db = database()
  const tenant = await requireAdmin(db, input)
  const where = { tenantId: input.tenantId, status: input.status }
  const cursor = input.cursor
    ? await db.cooperativeMobileAccessTerm.findFirst({
        where: { ...where, id: input.cursor },
        select: { id: true, requestedAt: true },
      })
    : null
  if (input.cursor && !cursor)
    throw ExpectedQueryError.validation(
      "The request list changed. Refresh it and try again."
    )
  const rows = await db.cooperativeMobileAccessTerm.findMany({
    where: {
      ...where,
      ...(cursor && {
        OR: [
          { requestedAt: { lt: cursor.requestedAt } },
          { requestedAt: cursor.requestedAt, id: { lt: cursor.id } },
        ],
      }),
    },
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    include: { member: { select: { fullName: true, memberNumber: true } } },
  })
  const now = new Date()
  const page = rows.slice(0, input.limit)
  return {
    ...terms,
    enabled: tenant.cooperativeMobileAccessEnabled,
    items: page.map((term) => ({
      ...presentTerm(term, now),
      memberId: term.memberId,
      memberName: term.member.fullName,
      memberNumber: term.member.memberNumber,
      amount: term.amount.toNumber(),
      currencyCode: term.currencyCode,
      canReinstate: term.status === "revoked" && isWithinTerm(term, now),
    })),
    nextCursor: rows.length > page.length ? (page.at(-1)?.id ?? null) : null,
  }
}

export async function setCooperativeMobileAccessEnabled(
  input: Actor & {
    enabled: boolean
    termsVersion: string
  }
) {
  return changeAccess(async (db) => {
    const tenant = await requireAdmin(db, input)
    if (
      input.enabled &&
      (input.termsVersion !== terms.termsVersion ||
        tenant.currencyCode !== terms.currencyCode)
    ) {
      throw ExpectedQueryError.precondition(
        "Review the current cooperative mobile access terms. The annual rate is available for NGN cooperatives."
      )
    }
    if (input.enabled && !tenant.cooperativeCodePrefix) {
      throw ExpectedQueryError.precondition(
        "Set your cooperative number prefix before enabling mobile access."
      )
    }
    if (tenant.cooperativeMobileAccessEnabled === input.enabled)
      return { enabled: input.enabled }
    await db.tenant.update({
      where: { id: input.tenantId },
      data: { cooperativeMobileAccessEnabled: input.enabled },
    })
    await auditAccess(db, input, {
      action: input.enabled ? "enabled" : "disabled",
      metadata: { ...terms },
      occurredAt: new Date(),
    })
    return { enabled: input.enabled }
  })
}

async function ensureMobileCredential(
  db: Prisma.TransactionClient,
  input: {
    tenantId: string
    memberId: string
    cooperativeCodePrefix: string | null
  }
) {
  const member = await db.member.findFirst({
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
      status: "active",
      user: { deletedAt: null },
    },
    select: {
      memberNumber: true,
      user: {
        select: { id: true, cooperativeAccessCode: true, passwordHash: true },
      },
    },
  })
  if (!member?.user?.passwordHash) {
    throw ExpectedQueryError.precondition(
      "The member needs an active portal login before mobile access can be approved."
    )
  }
  if (member.user.cooperativeAccessCode) return
  const { code } = previewCooperativeAccessCode(
    input.cooperativeCodePrefix,
    member.memberNumber
  )
  if (!code || code.length > 96) {
    throw ExpectedQueryError.precondition(
      "A valid cooperative number is required before approving mobile access."
    )
  }
  try {
    await db.user.update({
      where: { id: member.user.id },
      data: { cooperativeAccessCode: code },
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    throw ExpectedQueryError.conflict(
      "That cooperative number is already assigned to another account."
    )
  }
}

export async function reviewCooperativeMobileAccess(
  input: Actor & {
    termId: string
    decision: "approve" | "reject" | "revoke" | "reinstate"
    note?: string
  }
) {
  return changeAccess(async (db) => {
    if (input.decision === "approve") {
      await lockCooperativeMobileBilling(db, input.tenantId)
    }
    const tenant = await requireAdmin(db, input)
    const term = await db.cooperativeMobileAccessTerm.findFirst({
      where: { id: input.termId, tenantId: input.tenantId },
    })
    if (!term)
      throw ExpectedQueryError.notFound("Mobile access request not found.")
    const now = new Date()
    const nextStatus = {
      approve: "approved",
      reject: "rejected",
      revoke: "revoked",
      reinstate: "approved",
    } as const
    const status = nextStatus[input.decision]
    if (term.status === status) return presentTerm(term, now)
    const mayDecide =
      input.decision === "approve" || input.decision === "reject"
        ? term.status === "pending"
        : isWithinTerm(term, now) &&
          term.status === (input.decision === "revoke" ? "approved" : "revoked")
    if (!mayDecide) {
      throw ExpectedQueryError.conflict(
        "This mobile access term has changed. Refresh and try again."
      )
    }
    if (input.decision === "approve" || input.decision === "reinstate") {
      if (
        input.decision === "approve" &&
        !tenant.cooperativeMobileAccessEnabled
      ) {
        throw ExpectedQueryError.precondition(
          "Enable cooperative mobile access before approving a new term."
        )
      }
      await ensureMobileCredential(db, {
        tenantId: input.tenantId,
        memberId: term.memberId,
        cooperativeCodePrefix: tenant.cooperativeCodePrefix,
      })
    }
    const updated = await db.cooperativeMobileAccessTerm.update({
      where: { id: term.id, tenantId: input.tenantId },
      data: {
        status,
        reviewedAt: now,
        reviewNote: input.note ?? null,
        ...(input.decision === "approve" && {
          approvedAt: now,
          startsAt: now,
          endsAt: addCalendarMonths(now, term.termMonths),
          chargeDueAt: lagosMonthEnd(now),
        }),
        ...(input.decision === "revoke" && { revokedAt: now }),
        ...(input.decision === "reinstate" && { revokedAt: null }),
      },
    })
    await auditAccess(db, input, {
      action:
        status === "approved" && input.decision === "reinstate"
          ? "reinstated"
          : status,
      termId: term.id,
      metadata: { note: input.note ?? null },
      occurredAt: now,
    })
    return presentTerm(updated, now)
  })
}
