import type { MemberSignupAccessMode, PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

export type TenantMemberSignupSettings = {
  memberSignupAccessMode: MemberSignupAccessMode
}

export type MemberSignupLinkRecord = {
  id: string
  tenantId: string
  name: string
  notes: string | null
  tokenVersion: number
  tokenIssuedAt: Date
  expiresAt: Date | null
  maxSignups: number | null
  isEnabled: boolean
  lastUsedAt: Date | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
  analytics: {
    approvedCount: number
    pendingApprovalCount: number
    rejectedCount: number
    remainingSlots: number | null
    totalRequests: number
    verifiedCount: number
  }
}

export type MemberSignupLinkAccessRecord = {
  currentSignupCount: number
  expiresAt: Date | null
  id: string
  isEnabled: boolean
  maxSignups: number | null
  name: string
  notes: string | null
  tenantId: string
  tokenVersion: number
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized.",
    )
  }
}

function mapAnalytics(
  counts: Map<string, { approvedCount: number; pendingApprovalCount: number; rejectedCount: number; totalRequests: number; verifiedCount: number }>,
  input: {
    id: string
    tenantId: string
    name: string
    notes: string | null
    tokenVersion: number
    tokenIssuedAt: Date
    expiresAt: Date | null
    maxSignups: number | null
    isEnabled: boolean
    lastUsedAt: Date | null
    createdByUserId: string | null
    createdAt: Date
    updatedAt: Date
  },
): MemberSignupLinkRecord {
  const analytics = counts.get(input.id) ?? {
    approvedCount: 0,
    pendingApprovalCount: 0,
    rejectedCount: 0,
    totalRequests: 0,
    verifiedCount: 0,
  }

  return {
    ...input,
    analytics: {
      ...analytics,
      remainingSlots:
        input.maxSignups === null ? null : Math.max(0, input.maxSignups - analytics.totalRequests),
    },
  }
}

function buildAnalyticsMap(
  rows: Array<{
    _count: { _all: number }
    signupLinkId: string | null
    status: string
  }>,
) {
  const counts = new Map<
    string,
    {
      approvedCount: number
      pendingApprovalCount: number
      rejectedCount: number
      totalRequests: number
      verifiedCount: number
    }
  >()

  for (const row of rows) {
    if (!row.signupLinkId) continue

    const current = counts.get(row.signupLinkId) ?? {
      approvedCount: 0,
      pendingApprovalCount: 0,
      rejectedCount: 0,
      totalRequests: 0,
      verifiedCount: 0,
    }

    current.totalRequests += row._count._all

    if (row.status === "approved") {
      current.approvedCount += row._count._all
      current.verifiedCount += row._count._all
    }

    if (row.status === "pending_approval") {
      current.pendingApprovalCount += row._count._all
      current.verifiedCount += row._count._all
    }

    if (row.status === "rejected") {
      current.rejectedCount += row._count._all
    }

    counts.set(row.signupLinkId, current)
  }

  return counts
}

export async function getTenantMemberSignupSettings(
  tenantId: string,
  prismaOverride?: PrismaClient,
): Promise<TenantMemberSignupSettings> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return {
      memberSignupAccessMode: "in_office",
    }
  }

  const policy = await prisma.tenantPolicy.findUnique({
    where: {
      tenantId,
    },
    select: {
      memberSignupAccessMode: true,
    },
  })

  return {
    memberSignupAccessMode: policy?.memberSignupAccessMode ?? "in_office",
  }
}

export async function updateTenantMemberSignupSettings(
  input: {
    actorUserId: string
    memberSignupAccessMode: MemberSignupAccessMode
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const policy = await prisma.tenantPolicy.upsert({
    where: {
      tenantId: input.tenantId,
    },
    create: {
      tenantId: input.tenantId,
      memberSignupAccessMode: input.memberSignupAccessMode,
    },
    update: {
      memberSignupAccessMode: input.memberSignupAccessMode,
    },
  })

  await createAuditLogEntry(
    {
      action: "tenant_policy.member_signup_access_updated",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: policy.id,
      entityType: "TenantPolicy",
      metadata: {
        memberSignupAccessMode: input.memberSignupAccessMode,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return policy
}

export async function listMemberSignupLinks(
  tenantId: string,
  prismaOverride?: PrismaClient,
): Promise<MemberSignupLinkRecord[]> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  const [links, grouped] = await Promise.all([
    prisma.memberSignupLink.findMany({
      where: {
        tenantId,
      },
      orderBy: [{ isEnabled: "desc" }, { createdAt: "desc" }],
    }),
    prisma.memberOnboardingRequest.groupBy({
      by: ["signupLinkId", "status"],
      where: {
        tenantId,
        signupLinkId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ])

  const counts = buildAnalyticsMap(grouped)

  return links.map((link) => mapAnalytics(counts, link))
}

export async function getMemberSignupLinkById(
  input: {
    linkId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
): Promise<MemberSignupLinkRecord | null> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return null
  }

  const [link, grouped] = await Promise.all([
    prisma.memberSignupLink.findFirst({
      where: {
        id: input.linkId,
        tenantId: input.tenantId,
      },
    }),
    prisma.memberOnboardingRequest.groupBy({
      by: ["signupLinkId", "status"],
      where: {
        tenantId: input.tenantId,
        signupLinkId: input.linkId,
      },
      _count: {
        _all: true,
      },
    }),
  ])

  if (!link) {
    return null
  }

  const counts = buildAnalyticsMap(grouped)
  return mapAnalytics(counts, link)
}

export async function getMemberSignupLinkAccess(
  input: {
    linkId: string
    tenantId: string
    tokenVersion: number
  },
  prismaOverride?: PrismaClient,
): Promise<MemberSignupLinkAccessRecord | null> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return null
  }

  const [link, currentSignupCount] = await Promise.all([
    prisma.memberSignupLink.findFirst({
      where: {
        id: input.linkId,
        tenantId: input.tenantId,
      },
      select: {
        expiresAt: true,
        id: true,
        isEnabled: true,
        maxSignups: true,
        name: true,
        notes: true,
        tenantId: true,
        tokenVersion: true,
      },
    }),
    prisma.memberOnboardingRequest.count({
      where: {
        signupLinkId: input.linkId,
        tenantId: input.tenantId,
      },
    }),
  ])

  if (!link || link.tokenVersion !== input.tokenVersion) {
    return null
  }

  return {
    ...link,
    currentSignupCount,
  }
}

export async function createMemberSignupLink(
  input: {
    actorUserId: string
    expiresAt?: Date | null
    maxSignups?: number | null
    name: string
    notes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const link = await prisma.memberSignupLink.create({
    data: {
      createdByUserId: input.actorUserId,
      expiresAt: input.expiresAt ?? null,
      maxSignups: input.maxSignups ?? null,
      name: input.name.trim(),
      notes: input.notes?.trim() || null,
      tenantId: input.tenantId,
      tokenIssuedAt: new Date(),
    },
  })

  await createAuditLogEntry(
    {
      action: "member_signup_link.created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: link.id,
      entityType: "MemberSignupLink",
      metadata: {
        expiresAt: link.expiresAt?.toISOString() ?? null,
        isEnabled: link.isEnabled,
        maxSignups: link.maxSignups,
        name: link.name,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return link
}

export async function updateMemberSignupLink(
  input: {
    actorUserId: string
    expiresAt?: Date | null
    linkId: string
    maxSignups?: number | null
    name: string
    notes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const existingLink = await prisma.memberSignupLink.findFirst({
    where: {
      id: input.linkId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
    },
  })

  if (!existingLink) {
    throw new Error("Signup link not found.")
  }

  const link = await prisma.memberSignupLink.update({
    where: {
      id: existingLink.id,
    },
    data: {
      expiresAt: input.expiresAt ?? null,
      maxSignups: input.maxSignups ?? null,
      name: input.name.trim(),
      notes: input.notes?.trim() || null,
    },
  })

  await createAuditLogEntry(
    {
      action: "member_signup_link.updated",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: link.id,
      entityType: "MemberSignupLink",
      metadata: {
        expiresAt: link.expiresAt?.toISOString() ?? null,
        isEnabled: link.isEnabled,
        maxSignups: link.maxSignups,
        name: link.name,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return link
}

export async function setMemberSignupLinkEnabled(
  input: {
    actorUserId: string
    enabled: boolean
    linkId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const existingLink = await prisma.memberSignupLink.findFirst({
    where: {
      id: input.linkId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
    },
  })

  if (!existingLink) {
    throw new Error("Signup link not found.")
  }

  const link = await prisma.memberSignupLink.update({
    where: {
      id: existingLink.id,
    },
    data: {
      isEnabled: input.enabled,
    },
  })

  await createAuditLogEntry(
    {
      action: input.enabled ? "member_signup_link.enabled" : "member_signup_link.disabled",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: link.id,
      entityType: "MemberSignupLink",
      metadata: {
        expiresAt: link.expiresAt?.toISOString() ?? null,
        isEnabled: link.isEnabled,
        maxSignups: link.maxSignups,
        name: link.name,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return link
}

export async function rotateMemberSignupLinkToken(
  input: {
    actorUserId: string
    linkId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const existingLink = await prisma.memberSignupLink.findFirst({
    where: {
      id: input.linkId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
    },
  })

  if (!existingLink) {
    throw new Error("Signup link not found.")
  }

  const link = await prisma.memberSignupLink.update({
    where: {
      id: existingLink.id,
    },
    data: {
      tokenIssuedAt: new Date(),
      tokenVersion: {
        increment: 1,
      },
    },
  })

  await createAuditLogEntry(
    {
      action: "member_signup_link.rotated",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: link.id,
      entityType: "MemberSignupLink",
      metadata: {
        tokenVersion: link.tokenVersion,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return link
}
