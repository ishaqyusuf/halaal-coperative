import type { Prisma } from "../../generated/prisma/client"

/**
 * Internal audit writer shared by the AuthChallenge-backed flows
 * (mobile account access and workspace session handoff). Not exported from
 * the package index. Never pass raw tokens, codes or evidence in `metadata`.
 */
export async function auditAuthEvent(
  tx: Prisma.TransactionClient,
  input: {
    action: string
    actorUserId?: string | null
    entityId?: string | null
    metadata?: Prisma.InputJsonValue
    tenantId: string
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      entityId: input.entityId ?? null,
      entityType: "AuthChallenge",
      metadata: input.metadata,
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })
}
