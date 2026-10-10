import { ExpectedQueryError } from "../query-error"
import type {
  MembershipRole,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

type InvitationDeliveryStatus = "failed" | "queued" | "sent"

function requirePrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Production QA invitation proof requires HALAALVEST_DATABASE_URL."
    )
  }
  return prisma
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function deliveryStatus(value: unknown): InvitationDeliveryStatus | null {
  return value === "failed" || value === "queued" || value === "sent"
    ? value
    : null
}

function actionMatchesStatus(action: string, status: InvitationDeliveryStatus) {
  return action === `notification.email_${status}`
}

export async function findProductionQaHarnessOperatorId(
  prismaOverride?: PrismaClient
) {
  const operator = await requirePrisma(prismaOverride).user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
    where: { deletedAt: null, isPlatformOwner: true },
  })
  if (!operator) {
    throw ExpectedQueryError.permission(
      "Production QA invitation proof requires an active platform owner."
    )
  }
  return operator.id
}

export async function inspectProductionQaInvitationProof(
  input: {
    expectedEmail: string
    expectedRole: Exclude<MembershipRole, "super_admin">
    membershipId: string
    startedAt: Date
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma(prismaOverride)
  const expectedEmail = input.expectedEmail.trim().toLowerCase()
  const [membership, audits] = await Promise.all([
    prisma.membership.findFirst({
      select: {
        id: true,
        isDefault: true,
        role: true,
        user: {
          select: {
            cooperativeAccessCode: true,
            email: true,
            passwordHash: true,
          },
        },
      },
      where: { id: input.membershipId, tenantId: input.tenantId },
    }),
    prisma.auditLog.findMany({
      orderBy: { occurredAt: "desc" },
      select: {
        action: true,
        entityId: true,
        metadata: true,
        occurredAt: true,
      },
      where: {
        action: {
          in: [
            "membership.provisioned",
            "notification.email_failed",
            "notification.email_queued",
            "notification.email_sent",
          ],
        },
        occurredAt: { gte: input.startedAt },
        tenantId: input.tenantId,
      },
    }),
  ])

  const membershipAuditFound = audits.some(
    (audit) =>
      audit.action === "membership.provisioned" &&
      audit.entityId === input.membershipId
  )
  const deliveryAudit = audits.find((audit) => {
    const metadata = metadataRecord(audit.metadata)
    const status = deliveryStatus(metadata?.status)
    return Boolean(
      metadata &&
      status &&
      actionMatchesStatus(audit.action, status) &&
      metadata.source === "mobile.workspace_access" &&
      typeof metadata.recipient === "string" &&
      metadata.recipient.trim().toLowerCase() === expectedEmail
    )
  })
  const deliveryMetadata = metadataRecord(deliveryAudit?.metadata)
  const status = deliveryStatus(deliveryMetadata?.status)
  const deliveredRecipients = stringArray(
    deliveryMetadata?.deliveredRecipients
  ).map((recipient) => recipient.trim().toLowerCase())
  const originalRecipientContacted = Boolean(
    status === "sent" && deliveredRecipients.includes(expectedEmail)
  )
  const qaRouted = deliveryMetadata?.routingMode === "qa_domain"

  const identity = {
    cooperativeNumberValid: Boolean(
      membership?.user.cooperativeAccessCode &&
      /^[A-Z]{3,5}-\d{4}$/.test(membership.user.cooperativeAccessCode)
    ),
    emailMatches: membership?.user.email.toLowerCase() === expectedEmail,
    found: Boolean(membership),
    isDefault: membership?.isDefault === true,
    passwordAbsent: membership?.user.passwordHash === null,
    roleMatches: membership?.role === input.expectedRole,
  }
  const delivery = {
    auditFound: Boolean(deliveryAudit && status),
    deliveredRecipientCount: deliveredRecipients.length,
    originalRecipientContacted,
    qaRouted,
    status,
  }

  return {
    complete:
      Object.values(identity).every(Boolean) &&
      membershipAuditFound &&
      delivery.auditFound &&
      delivery.qaRouted &&
      !delivery.originalRecipientContacted,
    delivery,
    identity,
    membershipAuditFound,
  }
}
