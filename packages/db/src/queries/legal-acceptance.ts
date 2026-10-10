import { AppError } from "@halaalvest/errors"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  validateLegalAcknowledgement,
  type LegalAcknowledgement,
} from "../legal-publication"

export async function recordLegalAcceptanceInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string
    userId: string
    acknowledgement: LegalAcknowledgement
    surface: "web_onboarding" | "web_account" | "mobile_account"
  }
) {
  const documents = validateLegalAcknowledgement(input.acknowledgement)
  const result = await tx.legalAcceptance.createMany({
    data: documents.map((document) => ({
      tenantId: input.tenantId,
      userId: input.userId,
      documentType: document.documentType,
      documentVersion: document.documentVersion,
      contentHash: document.contentHash,
      contentSnapshot: document.contentSnapshot,
      action: document.action,
      surface: input.surface,
    })),
    skipDuplicates: true,
  })
  if (result.count)
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorType: "user",
        actorUserId: input.userId,
        action: "legal.platform_documents_acknowledged",
        entityType: "user",
        entityId: input.userId,
        metadata: {
          surface: input.surface,
          documents: documents.map(
            ({ documentType, documentVersion, contentHash }) => ({
              documentType,
              documentVersion,
              contentHash,
            })
          ),
        },
        occurredAt: new Date(),
      },
    })
  return { recorded: result.count }
}
export async function acceptPlatformDocuments(
  input: {
    tenantId: string
    userId: string
    acknowledgement: LegalAcknowledgement
    surface: "web_account" | "mobile_account"
  },
  override?: PrismaClient
) {
  validateLegalAcknowledgement(input.acknowledgement)
  const db = override ?? createPrismaClient()
  if (!db)
    throw new AppError({
      code: "PROVIDER_UNAVAILABLE",
      publicMessage: "Agreement recording is temporarily unavailable.",
    })
  return db.$transaction(
    async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: input.userId,
          deletedAt: null,
          memberships: { some: { tenantId: input.tenantId } },
        },
        select: { id: true },
      })
      if (!user)
        throw new AppError({
          code: "PRECONDITION_FAILED",
          publicMessage:
            "Sign in to the current workspace before accepting documents.",
        })
      return recordLegalAcceptanceInTransaction(tx, input)
    },
    { isolationLevel: "Serializable" }
  )
}

export async function listOwnLegalAcceptances(
  input: { tenantId: string; userId: string },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db)
    throw new AppError({
      code: "PROVIDER_UNAVAILABLE",
      publicMessage: "Agreement records are temporarily unavailable.",
    })
  const user = await db.user.findFirst({
    where: {
      id: input.userId,
      deletedAt: null,
      memberships: { some: { tenantId: input.tenantId } },
    },
    select: { id: true },
  })
  if (!user)
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Sign in to the current workspace to view agreement records.",
    })
  return db.legalAcceptance.findMany({
    where: { userId: input.userId },
    select: {
      documentType: true,
      documentVersion: true,
      contentHash: true,
      action: true,
      acceptedAt: true,
    },
    orderBy: { acceptedAt: "desc" },
    take: 20,
  })
}
