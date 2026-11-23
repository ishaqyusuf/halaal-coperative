import { Prisma, type PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"

export const paymentReceiptMemberAudiences = [
  "disabled",
  "enabled",
  "selected_members",
] as const

export type PaymentReceiptMemberAudience =
  (typeof paymentReceiptMemberAudiences)[number]

export const maxPaymentReceiptMemberGrants = 250

type ReceiptMemberScope = { tenantId: string } & (
  | { memberId: string }
  | { userId: string }
)
type ReceiptAccessClient = Pick<Prisma.TransactionClient, "$queryRaw">

/** The member home snapshot embeds the same predicate as the receipt write. */
export function memberReceiptSubmissionAccessSql(scope: ReceiptMemberScope) {
  const identity =
    "memberId" in scope
      ? Prisma.sql`member.id = ${scope.memberId}::uuid`
      : Prisma.sql`member.user_id = ${scope.userId}::uuid`
  return Prisma.sql`
    EXISTS (
      SELECT 1 FROM members member
      LEFT JOIN tenant_payment_receipt_member_access policy
        ON policy.tenant_id = member.tenant_id
      LEFT JOIN tenant_service_settings setting
        ON setting.tenant_id = member.tenant_id
        AND setting.service_key = 'payment_receipts'
      WHERE member.tenant_id = ${scope.tenantId}::uuid
        AND ${identity}
        AND member.status = 'active'
        AND CASE policy.audience
          WHEN 'enabled' THEN true
          WHEN 'disabled' THEN false
          WHEN 'selected_members' THEN EXISTS (
            SELECT 1 FROM tenant_payment_receipt_member_grants grant_row
            WHERE grant_row.tenant_id = member.tenant_id
              AND grant_row.member_id = member.id
          )
          ELSE setting.access_mode = 'member_self_service'
        END
    )
  `
}

export async function getMemberReceiptSubmissionAccess(
  scope: ReceiptMemberScope,
  prismaOverride?: ReceiptAccessClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [row] = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT ${memberReceiptSubmissionAccessSql(scope)} AS allowed
  `
  return row?.allowed === true
}

export async function getPaymentReceiptMemberAudienceSettings(
  tenantId: string,
  prismaOverride?: Prisma.TransactionClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const policy = await prisma.tenantPaymentReceiptMemberAccess.findUnique({
    where: { tenantId },
    select: {
      audience: true,
      revision: true,
      grants: {
        take: maxPaymentReceiptMemberGrants,
        orderBy: { memberId: "asc" },
        select: {
          member: {
            select: { fullName: true, id: true, memberNumber: true },
          },
        },
      },
    },
  })
  if (policy) {
    return {
      audience: policy.audience,
      members: policy.grants.map(({ member }) => member),
      revision: policy.revision,
    }
  }

  const service = await prisma.tenantServiceSetting.findUnique({
    where: {
      tenantId_serviceKey: { tenantId, serviceKey: "payment_receipts" },
    },
    select: { accessMode: true },
  })
  return {
    audience: (service?.accessMode === "member_self_service"
      ? "enabled"
      : "disabled") as PaymentReceiptMemberAudience,
    members: [],
    revision: 0,
  }
}

export type PaymentReceiptMemberAudienceSettings = Awaited<
  ReturnType<typeof getPaymentReceiptMemberAudienceSettings>
>

export async function updatePaymentReceiptMemberAudience(
  input: {
    actorUserId: string
    audience: PaymentReceiptMemberAudience
    changeReason?: string | null
    expectedRevision: number
    memberIds: string[]
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const { actorUserId, audience, expectedRevision, tenantId } = input
  const memberIds = [...new Set(input.memberIds)]
  if (
    memberIds.length > maxPaymentReceiptMemberGrants ||
    (audience !== "selected_members" && memberIds.length)
  ) {
    throw ExpectedQueryError.validation("Invalid receipt member selection.")
  }
  const stale = () =>
    ExpectedQueryError.conflict(
      "Receipt submission settings changed. Refresh before saving."
    )

  try {
    await prisma.$transaction(async (tx) => {
      const [previous, actor, memberCount] = await Promise.all([
        getPaymentReceiptMemberAudienceSettings(tenantId, tx),
        tx.membership.findFirst({
          where: {
            tenantId,
            userId: actorUserId,
            role: { in: ["tenant_admin", "super_admin"] },
          },
          select: { id: true },
        }),
        memberIds.length
          ? tx.member.count({
              where: { tenantId, id: { in: memberIds }, status: "active" },
            })
          : 0,
      ])
      if (!actor)
        throw ExpectedQueryError.permission("Admin access is required.")
      if (previous.revision !== expectedRevision) throw stale()
      if (memberCount !== memberIds.length) {
        throw ExpectedQueryError.validation(
          "Select active members from your cooperative."
        )
      }

      const previousIds = previous.members.map(({ id }) => id)
      const nextIds = new Set(memberIds)
      const removedIds = previousIds.filter((id) => !nextIds.has(id))
      const sameSelection =
        previousIds.length === memberIds.length && !removedIds.length
      if (audience === previous.audience && sameSelection) return

      const changeReason = input.changeReason?.trim() || null
      if (
        !changeReason &&
        ((previous.audience === "enabled" && audience !== "enabled") ||
          (previous.audience === "selected_members" &&
            audience !== "enabled" &&
            (audience === "disabled" || removedIds.length > 0)))
      ) {
        throw ExpectedQueryError.validation(
          "Enter a reason for removing members' receipt submission access."
        )
      }

      if (previous.revision === 0) {
        await tx.tenantPaymentReceiptMemberAccess.create({
          data: { audience, tenantId },
        })
      } else {
        const { count } = await tx.tenantPaymentReceiptMemberAccess.updateMany({
          where: { tenantId, revision: expectedRevision },
          data: { audience, revision: { increment: 1 } },
        })
        if (count !== 1) throw stale()
      }

      if (removedIds.length) {
        await tx.tenantPaymentReceiptMemberGrant.deleteMany({
          where: { tenantId, memberId: { in: removedIds } },
        })
      }
      const previousSet = new Set(previousIds)
      const addedIds = memberIds.filter((id) => !previousSet.has(id))
      if (addedIds.length) {
        await tx.tenantPaymentReceiptMemberGrant.createMany({
          data: addedIds.map((memberId) => ({ tenantId, memberId })),
        })
      }
      await tx.auditLog.create({
        data: {
          action: "tenant_operation_profile.receipt_member_audience_updated",
          actorType: "user",
          actorUserId,
          entityId: tenantId,
          entityType: "TenantPaymentReceiptMemberAccess",
          metadata: {
            changeReason,
            previousAudience: previous.audience,
            nextAudience: audience,
            addedMemberIds: addedIds,
            removedMemberIds: removedIds,
            revision: previous.revision + 1,
          },
          occurredAt: new Date(),
          tenantId,
        },
      })
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw stale()
    }
    throw error
  }
}
