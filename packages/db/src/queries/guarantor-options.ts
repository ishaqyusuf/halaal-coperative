import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getMembersOperationalReadiness } from "./member-readiness"

/** What a member may see about another member when choosing a guarantor. */
export type GuarantorOption = {
  fullName: string
  id: string
}

export const guarantorOptionLimit = 20
// Readiness also needs finished opening balances, which SQL here does not
// check; read a few more candidates so most searches still fill a page.
const guarantorCandidateLimit = 40

/**
 * Members-safe guarantor search: names only, and only members of the same
 * cooperative who are operationally ready (active, KYC verified, opening
 * balances finished). Never returns member numbers, contact details or
 * balances, and never the asking member.
 *
 * With `ids`, resolves those ids under the same rules (for a picker's
 * selected label), so an id cannot be used to read a member who is not a
 * valid guarantor.
 */
export async function searchGuarantorOptions(
  input: {
    excludeMemberId?: string | null
    ids?: string[]
    query?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<GuarantorOption[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const ids = [...new Set((input.ids ?? []).filter(Boolean))]
  const query = input.query?.trim() ?? ""

  const candidates: GuarantorOption[] = await prisma.member.findMany({
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: { fullName: true, id: true },
    take: ids.length > 0 ? ids.length : guarantorCandidateLimit,
    where: {
      kycStatus: "verified",
      status: "active",
      tenantId: input.tenantId,
      ...(input.excludeMemberId ? { NOT: { id: input.excludeMemberId } } : {}),
      ...(ids.length > 0
        ? { id: { in: ids } }
        : query
          ? { fullName: { contains: query, mode: "insensitive" as const } }
          : {}),
    },
  })

  if (candidates.length === 0) return []

  const readiness = await getMembersOperationalReadiness(
    {
      memberIds: candidates.map((candidate) => candidate.id),
      tenantId: input.tenantId,
    },
    prisma
  )

  return candidates
    .filter((candidate) => readiness.get(candidate.id)?.isReady === true)
    .slice(0, guarantorOptionLimit)
    .map((candidate) => ({ fullName: candidate.fullName, id: candidate.id }))
}
