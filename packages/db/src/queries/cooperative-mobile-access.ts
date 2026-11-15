import { cooperativeMobileAccessTerms as terms } from "@halaalvest/domain/cooperative-mobile-access"
import { previewCooperativeAccessCode } from "@halaalvest/utils"
import {
  Prisma,
  type CooperativeMobileAccessTerm,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  ExpectedQueryError,
  isUniqueConstraintError,
  QueryInfrastructureError,
} from "../query-error"
import { lockCooperativeMobileBilling } from "./cooperative-mobile-billing-lock"
import {
  decideMemberAccept,
  decideMemberTurnOff,
  isWithinTerm,
  memberAccessActions,
} from "./cooperative-mobile-access-policy"

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
          cooperativeMobileSelfServiceEnabled: true,
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
    acceptedAt: term.acceptedAt,
  }
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

function approvalDates(now: Date, termMonths: number) {
  return {
    approvedAt: now,
    startsAt: now,
    endsAt: addCalendarMonths(now, termMonths),
    chargeDueAt: lagosMonthEnd(now),
  }
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

/**
 * The signed-in member's own mobile access. The router has already checked the
 * member role from the request context, so this reads only the tenant flags.
 */
export async function getCooperativeMobileMemberStatus(
  input: Pick<Actor, "tenantId" | "userId">
) {
  const db = database()
  const [tenant, member] = await Promise.all([
    db.tenant.findUnique({
      where: { id: input.tenantId },
      select: {
        cooperativeMobileAccessEnabled: true,
        cooperativeMobileSelfServiceEnabled: true,
        cooperativeCodePrefix: true,
      },
    }),
    db.member.findFirst({
      where: activeMemberForUser(input.tenantId, input.userId),
      select: {
        id: true,
        fullName: true,
        user: {
          select: {
            cooperativeAccessCode: true,
            passwordHash: true,
          },
        },
      },
    }),
  ])
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
  const enabled = tenant?.cooperativeMobileAccessEnabled === true
  const selfService = tenant?.cooperativeMobileSelfServiceEnabled === true
  const actions = member
    ? memberAccessActions(term, now, { enabled, selfService })
    : null
  // Turning access on needs a password login and a cooperative number. Say so
  // up front rather than failing after the member agrees.
  const blockedReason = !actions?.acceptTurnsOn
    ? null
    : !member?.user?.passwordHash
      ? ("no_password" as const)
      : !member.user.cooperativeAccessCode && !tenant?.cooperativeCodePrefix
        ? ("no_cooperative_number" as const)
        : null
  return {
    ...terms,
    enabled,
    selfService,
    canRequest: Boolean(actions?.canAccept && !blockedReason),
    acceptTurnsOn: actions?.acceptTurnsOn ?? false,
    canTurnOff: actions?.canTurnOff ?? false,
    canTurnBackOn: actions?.canTurnBackOn ?? false,
    turnedOffBy: actions?.turnedOffBy ?? null,
    blockedReason,
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

async function requireOwnMember(db: Prisma.TransactionClient, input: Actor) {
  const membership = await findMembership(db, input)
  if (membership?.role !== "member") {
    throw ExpectedQueryError.permission("Member access is required.")
  }
  // Only the member linked to the signed-in user; no input names a member.
  const member = await db.member.findFirst({
    where: activeMemberForUser(input.tenantId, input.userId),
    select: { ...credentialMemberSelect, id: true },
  })
  if (!member) {
    throw ExpectedQueryError.permission("An active member profile is required.")
  }
  return { tenant: membership.tenant, member }
}

const cooperativeTurnedOffMessage =
  "Your cooperative turned off your mobile access. Ask them to turn it back on."

/**
 * The member agrees to the disclosed charge. With self-service on, access
 * starts now and is billed like an approved request; otherwise the agreement
 * waits for an administrator. The acceptance (who, when, which terms) is kept
 * on the term and in the audit log.
 */
export async function acceptCooperativeMobileAccess(
  input: Actor & { termsVersion: string }
) {
  return changeAccess(async (db) => {
    // Turning access on creates a billable term; hold the billing lock first,
    // as an administrator approval does.
    await lockCooperativeMobileBilling(db, input.tenantId)
    const { tenant, member } = await requireOwnMember(db, input)
    if (input.termsVersion !== terms.termsVersion) {
      throw ExpectedQueryError.conflict(
        "Mobile access terms changed. Review the current terms and try again."
      )
    }
    const now = new Date()
    const previous = await latestTerm(db, input.tenantId, member.id)
    const decision = decideMemberAccept(previous, now, {
      enabled: tenant.cooperativeMobileAccessEnabled,
      selfService: tenant.cooperativeMobileSelfServiceEnabled,
    })
    if (decision.kind === "blocked") {
      throw decision.reason === "not_enabled"
        ? ExpectedQueryError.precondition(
            "This cooperative is not giving out the mobile app right now."
          )
        : ExpectedQueryError.conflict(cooperativeTurnedOffMessage)
    }
    if (decision.kind === "unchanged" && previous) {
      return presentTerm(previous, now)
    }
    if (decision.kind === "reinstate" && previous) {
      return reinstateOwnTerm(db, input, previous, now)
    }
    const turnsOn =
      decision.kind === "approve_pending" ||
      (decision.kind === "create" && decision.status === "approved")
    if (turnsOn) {
      await assignMobileCredential(db, member, tenant.cooperativeCodePrefix)
    }
    const acceptance = {
      acceptedAt: now,
      acceptedByUserId: input.userId,
      acceptanceSource: turnsOn
        ? ("member_self_service" as const)
        : ("member_request" as const),
    }
    const term =
      decision.kind === "approve_pending" && previous
        ? await db.cooperativeMobileAccessTerm.update({
            where: { id: previous.id, tenantId: input.tenantId },
            // Today's agreement replaces the request's, at today's terms.
            data: {
              ...terms,
              ...acceptance,
              status: "approved",
              reviewedAt: now,
              reviewNote: "Turned on by the member.",
              ...approvalDates(now, terms.termMonths),
            },
          })
        : await db.cooperativeMobileAccessTerm.create({
            data: {
              ...terms,
              ...acceptance,
              tenantId: input.tenantId,
              memberId: member.id,
              requestedAt: now,
              ...(turnsOn && {
                status: "approved" as const,
                reviewedAt: now,
                reviewNote: "Turned on by the member.",
                ...approvalDates(now, terms.termMonths),
              }),
            },
          })
    await auditAccess(db, input, {
      action: turnsOn ? "self_enabled" : "requested",
      termId: term.id,
      metadata: {
        source: acceptance.acceptanceSource,
        approvedPendingRequest: decision.kind === "approve_pending",
        termsVersion: terms.termsVersion,
        amount: terms.amount,
        currencyCode: terms.currencyCode,
        termMonths: terms.termMonths,
      },
      occurredAt: now,
    })
    return presentTerm(term, now)
  })
}

async function reinstateOwnTerm(
  db: Prisma.TransactionClient,
  input: Actor,
  term: CooperativeMobileAccessTerm,
  now: Date
) {
  const updated = await db.cooperativeMobileAccessTerm.update({
    where: { id: term.id, tenantId: input.tenantId },
    data: {
      status: "approved",
      revokedAt: null,
      revokedByMember: false,
      reviewedAt: now,
      reviewNote: "Turned back on by the member.",
    },
  })
  await auditAccess(db, input, {
    action: "member_reinstated",
    termId: term.id,
    occurredAt: now,
  })
  return presentTerm(updated, now)
}

/**
 * The member turns their own access back on after turning it off this term.
 * No new charge: the term was already billed when it started.
 */
export async function turnOwnCooperativeMobileAccessBackOn(input: Actor) {
  return changeAccess(async (db) => {
    const { member } = await requireOwnMember(db, input)
    const now = new Date()
    const term = await latestTerm(db, input.tenantId, member.id)
    if (term && term.status === "approved" && isWithinTerm(term, now)) {
      return presentTerm(term, now)
    }
    if (!term || term.status !== "revoked" || !isWithinTerm(term, now)) {
      throw ExpectedQueryError.conflict(
        "There is no mobile access to turn back on. Refresh and try again."
      )
    }
    if (!term.revokedByMember) {
      throw ExpectedQueryError.conflict(cooperativeTurnedOffMessage)
    }
    return reinstateOwnTerm(db, input, term, now)
  })
}

/**
 * The member turns their own access off. Sign-in on the app stops at the next
 * request; the term's charge stays (no refund).
 */
export async function turnOffOwnCooperativeMobileAccess(input: Actor) {
  return changeAccess(async (db) => {
    const { member } = await requireOwnMember(db, input)
    const now = new Date()
    const term = await latestTerm(db, input.tenantId, member.id)
    const decision = decideMemberTurnOff(term, now)
    if (decision.kind === "blocked" || !term) {
      throw ExpectedQueryError.conflict(
        "Your mobile access is not on. Refresh and try again."
      )
    }
    if (decision.kind === "unchanged") return presentTerm(term, now)
    const updated = await db.cooperativeMobileAccessTerm.update({
      where: { id: term.id, tenantId: input.tenantId },
      data: {
        status: "revoked",
        revokedAt: now,
        revokedByMember: true,
        reviewedAt: now,
        reviewNote: "Turned off by the member.",
      },
    })
    await auditAccess(db, input, {
      action: "member_turned_off",
      termId: term.id,
      occurredAt: now,
    })
    return presentTerm(updated, now)
  })
}

/** An administrator chooses whether members turn the app on themselves. */
export async function setCooperativeMobileSelfServiceEnabled(
  input: Actor & { enabled: boolean }
) {
  return changeAccess(async (db) => {
    const tenant = await requireAdmin(db, input)
    if (tenant.cooperativeMobileSelfServiceEnabled === input.enabled) {
      return { selfService: input.enabled }
    }
    await db.tenant.update({
      where: { id: input.tenantId },
      data: { cooperativeMobileSelfServiceEnabled: input.enabled },
    })
    await auditAccess(db, input, {
      action: input.enabled ? "self_service_enabled" : "self_service_disabled",
      occurredAt: new Date(),
    })
    return { selfService: input.enabled }
  })
}

export type CooperativeMobileAccessListStatus =
  | "pending"
  | "active"
  | "off"
  | "declined"
  | "ended"

function listStatusWhere(
  status: CooperativeMobileAccessListStatus,
  now: Date
): Prisma.CooperativeMobileAccessTermWhereInput {
  switch (status) {
    case "pending":
      return { status: "pending" }
    case "active":
      return { status: "approved", endsAt: { gt: now } }
    case "off":
      return { status: "revoked", endsAt: { gt: now } }
    case "declined":
      return { status: "rejected" }
    case "ended":
      return { status: { in: ["approved", "revoked"] }, endsAt: { lte: now } }
  }
}

// Keyset cursors carry the sort values, so a next page needs no lookup.
function encodeCursor(value: string, id: string) {
  return `${value}|${id}`
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null
  const split = cursor.lastIndexOf("|")
  const value = cursor.slice(0, split)
  const id = cursor.slice(split + 1)
  if (split < 1 || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw ExpectedQueryError.validation(
      "The list changed. Refresh it and try again."
    )
  }
  return { value, id }
}

/**
 * One statement for the page header: whether mobile access is on and how many
 * terms sit in each list. The router checks the administrator role.
 */
export async function getCooperativeMobileAccessSummary(input: {
  tenantId: string
}) {
  const [row] = await database().$queryRaw<
    {
      enabled: boolean
      self_service: boolean
      pending: number
      active: number
      off: number
      declined: number
      ended: number
    }[]
  >(Prisma.sql`
    select
      t.cooperative_mobile_access_enabled as enabled,
      t.cooperative_mobile_self_service_enabled as self_service,
      (count(s.id) filter (where s.status = 'pending'))::int as pending,
      (count(s.id) filter (where s.status = 'approved' and s.ends_at > now()))::int as active,
      (count(s.id) filter (where s.status = 'revoked' and s.ends_at > now()))::int as off,
      (count(s.id) filter (where s.status = 'rejected'))::int as declined,
      (count(s.id) filter (where s.status in ('approved', 'revoked') and s.ends_at <= now()))::int as ended
    from tenants t
    left join cooperative_mobile_access_terms s on s.tenant_id = t.id
    where t.id = ${input.tenantId}::uuid
    group by t.id
  `)
  return {
    ...terms,
    enabled: row?.enabled === true,
    selfService: row?.self_service === true,
    counts: {
      pending: row?.pending ?? 0,
      active: row?.active ?? 0,
      off: row?.off ?? 0,
      declined: row?.declined ?? 0,
      ended: row?.ended ?? 0,
    },
  }
}

/**
 * One page of a mobile access list. The router checks the administrator role
 * from the request context, so this reads only the terms and member names.
 */
export async function listCooperativeMobileAccessTerms(input: {
  tenantId: string
  status: CooperativeMobileAccessListStatus
  cursor?: string
  limit: number
}) {
  const db = database()
  const now = new Date()
  const cursor = decodeCursor(input.cursor)
  const cursorDate = cursor ? new Date(cursor.value) : null
  if (cursorDate && Number.isNaN(cursorDate.getTime())) {
    throw ExpectedQueryError.validation(
      "The list changed. Refresh it and try again."
    )
  }
  const rows = await db.cooperativeMobileAccessTerm.findMany({
    where: {
      tenantId: input.tenantId,
      ...listStatusWhere(input.status, now),
      ...(cursor &&
        cursorDate && {
          OR: [
            { requestedAt: { lt: cursorDate } },
            { requestedAt: cursorDate, id: { lt: cursor.id } },
          ],
        }),
    },
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    select: {
      id: true,
      status: true,
      requestedAt: true,
      approvedAt: true,
      startsAt: true,
      endsAt: true,
      chargeDueAt: true,
      reviewNote: true,
      revokedAt: true,
      memberId: true,
      member: { select: { fullName: true, memberNumber: true } },
    },
  })
  const page = rows.slice(0, input.limit)
  const last = page.at(-1)
  return {
    items: page.map((term) => {
      const within = Boolean(
        term.startsAt &&
        term.startsAt <= now &&
        term.endsAt &&
        now < term.endsAt
      )
      return {
        id: term.id,
        status: term.status,
        requestedAt: term.requestedAt,
        endsAt: term.endsAt,
        chargeDueAt: term.chargeDueAt,
        reviewNote: term.reviewNote,
        memberId: term.memberId,
        memberName: term.member.fullName,
        memberNumber: term.member.memberNumber,
        canTurnOff: term.status === "approved" && within,
        canTurnOn: term.status === "revoked" && within,
      }
    }),
    nextCursor:
      rows.length > page.length && last
        ? encodeCursor(last.requestedAt.toISOString(), last.id)
        : null,
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
        "Set your cooperative number prefix in settings before turning on the mobile app."
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

const credentialMemberSelect = {
  memberNumber: true,
  user: {
    select: {
      id: true,
      cooperativeAccessCode: true,
      deletedAt: true,
      passwordHash: true,
    },
  },
} satisfies Prisma.MemberSelect

type CredentialMember = Prisma.MemberGetPayload<{
  select: typeof credentialMemberSelect
}>

async function assignMobileCredential(
  db: Prisma.TransactionClient,
  member: CredentialMember,
  cooperativeCodePrefix: string | null
) {
  if (!member.user?.passwordHash || member.user.deletedAt) {
    throw ExpectedQueryError.precondition(
      "This member needs a login before they can use the app."
    )
  }
  if (member.user.cooperativeAccessCode) return
  const { code } = previewCooperativeAccessCode(
    cooperativeCodePrefix,
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

async function ensureMobileCredential(
  db: Prisma.TransactionClient,
  input: {
    tenantId: string
    memberId: string
    cooperativeCodePrefix: string | null
  }
) {
  const member = await db.member.findFirst({
    where: { id: input.memberId, tenantId: input.tenantId, status: "active" },
    select: credentialMemberSelect,
  })
  if (!member) {
    throw ExpectedQueryError.precondition(
      "This member needs a login before they can use the app."
    )
  }
  await assignMobileCredential(db, member, input.cooperativeCodePrefix)
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
        "This changed while you were looking. Refresh and try again."
      )
    }
    if (input.decision === "approve" || input.decision === "reinstate") {
      if (
        input.decision === "approve" &&
        !tenant.cooperativeMobileAccessEnabled
      ) {
        throw ExpectedQueryError.precondition(
          "Turn on the mobile app for your cooperative first."
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
        ...(input.decision === "approve" &&
          approvalDates(now, term.termMonths)),
        ...(input.decision === "revoke" && {
          revokedAt: now,
          revokedByMember: false,
        }),
        ...(input.decision === "reinstate" && {
          revokedAt: null,
          revokedByMember: false,
        }),
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

/**
 * Active members an administrator can give mobile access to right now: they
 * have a portal login and no current term. A pending request is flagged, as
 * giving access approves it. The router checks the administrator role.
 */
export async function listCooperativeMobileAccessMembers(input: {
  tenantId: string
  search?: string
  cursor?: string
  limit: number
}) {
  const db = database()
  const now = new Date()
  const search = input.search?.trim()
  const cursor = decodeCursor(input.cursor)
  const rows = await db.member.findMany({
    where: {
      tenantId: input.tenantId,
      status: "active",
      user: { deletedAt: null, passwordHash: { not: null } },
      cooperativeMobileAccessTerms: {
        none: {
          tenantId: input.tenantId,
          status: { in: ["approved", "revoked"] },
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
      },
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { memberNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(cursor && {
        AND: {
          OR: [
            { fullName: { gt: cursor.value } },
            { fullName: cursor.value, id: { gt: cursor.id } },
          ],
        },
      }),
    },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    take: input.limit + 1,
    select: {
      id: true,
      fullName: true,
      memberNumber: true,
      cooperativeMobileAccessTerms: {
        where: { tenantId: input.tenantId, status: "pending" },
        select: { id: true },
        take: 1,
      },
    },
  })
  const page = rows.slice(0, input.limit)
  const last = page.at(-1)
  return {
    items: page.map((member) => ({
      memberId: member.id,
      memberName: member.fullName,
      memberNumber: member.memberNumber,
      requested: member.cooperativeMobileAccessTerms.length > 0,
    })),
    nextCursor:
      rows.length > page.length && last
        ? encodeCursor(last.fullName, last.id)
        : null,
  }
}

export type CooperativeMobileAccessGrantResult = {
  memberId: string
  memberName: string | null
  outcome: "enabled" | "already_active" | "failed"
  message?: string
  endsAt?: Date | null
}

async function grantMemberAccess(
  input: Actor & { memberId: string; note: string | null }
): Promise<CooperativeMobileAccessGrantResult> {
  return changeAccess(async (db) => {
    await lockCooperativeMobileBilling(db, input.tenantId)
    const tenant = await requireAdmin(db, input)
    if (!tenant.cooperativeMobileAccessEnabled) {
      throw ExpectedQueryError.precondition(
        "Turn on the mobile app for your cooperative first."
      )
    }
    // One read for the member, their login and their latest term.
    const member = await db.member.findFirst({
      where: {
        id: input.memberId,
        tenantId: input.tenantId,
        status: "active",
      },
      select: {
        ...credentialMemberSelect,
        id: true,
        fullName: true,
        cooperativeMobileAccessTerms: {
          where: { tenantId: input.tenantId },
          orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
    })
    if (!member) throw ExpectedQueryError.notFound("Active member not found.")
    const now = new Date()
    const previous = member.cooperativeMobileAccessTerms[0] ?? null
    if (previous && isWithinTerm(previous, now)) {
      if (previous.status === "approved") {
        return {
          memberId: member.id,
          memberName: member.fullName,
          outcome: "already_active",
          endsAt: previous.endsAt,
        }
      }
      throw ExpectedQueryError.conflict(
        "Access was turned off this term. Turn it back on from the Turned off list."
      )
    }
    await assignMobileCredential(db, member, tenant.cooperativeCodePrefix)
    const reviewNote = input.note ?? "Enabled by a cooperative administrator."
    // The administrator confirms the member agreed. A waiting request keeps
    // the member's own agreement.
    const adminAcceptance = {
      acceptedAt: now,
      acceptedByUserId: input.userId,
      acceptanceSource: "admin_confirmed" as const,
    }
    const term =
      previous?.status === "pending"
        ? await db.cooperativeMobileAccessTerm.update({
            where: { id: previous.id, tenantId: input.tenantId },
            data: {
              status: "approved",
              reviewedAt: now,
              reviewNote,
              ...(!previous.acceptedAt && adminAcceptance),
              ...approvalDates(now, previous.termMonths),
            },
          })
        : await db.cooperativeMobileAccessTerm.create({
            data: {
              ...terms,
              tenantId: input.tenantId,
              memberId: member.id,
              status: "approved",
              requestedAt: now,
              reviewedAt: now,
              reviewNote,
              ...adminAcceptance,
              ...approvalDates(now, terms.termMonths),
            },
          })
    await auditAccess(db, input, {
      action: "granted",
      termId: term.id,
      metadata: {
        source: "admin_direct",
        memberAgreementConfirmed: true,
        approvedPendingRequest: previous?.status === "pending",
        termsVersion: term.termsVersion,
        amount: term.amount.toNumber(),
        currencyCode: term.currencyCode,
        note: input.note,
      },
      occurredAt: now,
    })
    return {
      memberId: member.id,
      memberName: member.fullName,
      outcome: "enabled",
      endsAt: term.endsAt,
    }
  })
}

/**
 * Enables mobile access for members chosen by a cooperative administrator.
 * The administrator confirms each member agreed to the disclosed charge; the
 * resulting term is billed exactly like an approved member request.
 */
export async function grantCooperativeMobileAccess(
  input: Actor & {
    memberIds: string[]
    termsVersion: string
    note?: string
  }
) {
  if (input.termsVersion !== terms.termsVersion) {
    throw ExpectedQueryError.conflict(
      "Mobile access terms changed. Review the current terms and try again."
    )
  }
  const results: CooperativeMobileAccessGrantResult[] = []
  for (const memberId of new Set(input.memberIds)) {
    try {
      results.push(
        await grantMemberAccess({
          ...input,
          memberId,
          note: input.note ?? null,
        })
      )
    } catch (error) {
      if (!(error instanceof ExpectedQueryError)) throw error
      if (error.code === "PERMISSION_DENIED") throw error
      results.push({
        memberId,
        memberName: null,
        outcome: "failed",
        message: error.publicMessage,
      })
    }
  }
  return {
    results,
    enabled: results.filter((result) => result.outcome === "enabled").length,
  }
}
