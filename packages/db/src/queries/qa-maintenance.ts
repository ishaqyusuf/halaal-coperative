import { createHash } from "node:crypto"
import { createPrismaClient } from "../prisma"

export type QaMaintenanceCounts = {
  auditLogs: number
  fileBytes: number
  files: number
  ledgerTransactions: number
  members: number
  users: number
  workspaces: number
}

export type QaMaintenancePreview = {
  blockers: Array<{
    category: "live_custom_domain" | "required_provider_credential"
    tenantId: string
    tenantName: string
  }>
  counts: QaMaintenanceCounts
  fingerprint: string
  tenants: Array<{
    id: string
    name: string
    qaSourceDomain: string | null
    slug: string
    hostnames: string[]
  }>
}

function requirePrisma() {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("QA maintenance requires DATABASE_URL to be configured.")
  }

  return prisma
}

function normalizeQaDomains(domains: readonly string[]) {
  return [
    ...new Set(
      domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean)
    ),
  ]
}

export function resolveConfiguredQaDomain(
  email: string,
  domains: readonly string[]
) {
  const domain = email.trim().toLowerCase().split("@").pop() ?? ""

  return normalizeQaDomains(domains).includes(domain) ? domain : null
}

export async function assertQaIdentityLane(input: {
  email?: string | null
  prisma: {
    tenant: {
      findUnique: (args: {
        select: {
          dataClassification: true
          qaSourceDomain: true
        }
        where: { id: string }
      }) => Promise<{
        dataClassification: "live" | "qa"
        qaSourceDomain: string | null
      } | null>
    }
  }
  tenantId: string
}) {
  const emailDomain =
    input.email?.trim().toLowerCase().split("@").pop() ?? null

  if (!emailDomain) return

  const tenant = await input.prisma.tenant.findUnique({
    select: {
      dataClassification: true,
      qaSourceDomain: true,
    },
    where: { id: input.tenantId },
  })

  if (!tenant) throw new Error("Workspace not found.")

  if (
    tenant.dataClassification === "qa" &&
    emailDomain !== tenant.qaSourceDomain
  ) {
    throw new Error("Normal identities cannot be added to a QA workspace.")
  }
  if (
    tenant.dataClassification === "live" &&
    emailDomain.endsWith(".test")
  ) {
    throw new Error("QA identities cannot be added to a live workspace.")
  }
}

export async function discoverQaTenantCandidates(domains: readonly string[]) {
  const prisma = requirePrisma()
  const configuredDomains = normalizeQaDomains(domains)

  if (configuredDomains.length === 0) return []

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      id: true,
      name: true,
      slug: true,
      users: {
        select: {
          email: true,
          memberships: {
            select: { role: true },
          },
        },
        where: { deletedAt: null },
      },
    },
    where: {
      dataClassification: "live",
      qaPurgeStartedAt: null,
    },
  })

  return tenants.flatMap((tenant) => {
    const owner = tenant.users.find(
      (user) =>
        user.memberships.some(
          (membership) =>
            membership.role === "tenant_admin" ||
            membership.role === "super_admin"
        ) && resolveConfiguredQaDomain(user.email, configuredDomains)
    )
    const qaSourceDomain = owner
      ? resolveConfiguredQaDomain(owner.email, configuredDomains)
      : null

    return qaSourceDomain
      ? [
          {
            createdAt: tenant.createdAt.toISOString(),
            id: tenant.id,
            name: tenant.name,
            qaSourceDomain,
            slug: tenant.slug,
          },
        ]
      : []
  })
}

export async function adoptQaTenantCandidates(input: {
  domains: readonly string[]
  tenantIds: readonly string[]
}) {
  const prisma = requirePrisma()
  const candidates = await discoverQaTenantCandidates(input.domains)
  const requestedIds = new Set(input.tenantIds)
  const selected = candidates.filter((candidate) =>
    requestedIds.has(candidate.id)
  )

  if (selected.length !== requestedIds.size) {
    throw new Error(
      "One or more selected workspaces no longer qualify as QA candidates."
    )
  }

  await prisma.$transaction(
    selected.map((candidate) =>
      prisma.tenant.update({
        data: {
          dataClassification: "qa",
          qaMarkedAt: new Date(),
          qaSourceDomain: candidate.qaSourceDomain,
        },
        where: {
          id: candidate.id,
          dataClassification: "live",
          qaPurgeStartedAt: null,
        },
      })
    )
  )

  return { adoptedCount: selected.length }
}

export async function getQaMaintenancePreview(): Promise<QaMaintenancePreview> {
  const prisma = requirePrisma()
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      qaSourceDomain: true,
      slug: true,
      updatedAt: true,
      domains: {
        select: {
          hostname: true,
          updatedAt: true,
        },
      },
    },
    where: {
      dataClassification: "qa",
    },
  })
  const tenantIds = tenants.map((tenant) => tenant.id)

  if (tenantIds.length === 0) {
    return {
      blockers: [],
      counts: {
        auditLogs: 0,
        fileBytes: 0,
        files: 0,
        ledgerTransactions: 0,
        members: 0,
        users: 0,
        workspaces: 0,
      },
      fingerprint: createHash("sha256").update("empty").digest("hex"),
      tenants: [],
    }
  }

  const [users, members, ledgerTransactions, auditLogs, liveCustomDomains] =
    await Promise.all([
      prisma.user.count({ where: { tenantId: { in: tenantIds } } }),
      prisma.member.count({ where: { tenantId: { in: tenantIds } } }),
      prisma.ledgerTransaction.count({
        where: { tenantId: { in: tenantIds } },
      }),
      prisma.auditLog.count({ where: { tenantId: { in: tenantIds } } }),
      prisma.tenantDomain.findMany({
        select: {
          tenantId: true,
          tenant: { select: { name: true } },
        },
        where: {
          kind: "custom",
          tenantId: { in: tenantIds },
          verifiedAt: { not: null },
        },
      }),
    ])
  const fingerprint = createHash("sha256")
    .update(
      tenants
        .map(
          (tenant) =>
            `${tenant.id}:${tenant.updatedAt.toISOString()}:${tenant.domains
              .map(
                (domain) =>
                  `${domain.hostname}:${domain.updatedAt.toISOString()}`,
              )
              .join(",")}`,
        )
        .join("|")
    )
    .digest("hex")

  return {
    blockers: liveCustomDomains.map((domain) => ({
      category: "live_custom_domain",
      tenantId: domain.tenantId,
      tenantName: domain.tenant.name,
    })),
    counts: {
      auditLogs,
      fileBytes: 0,
      files: 0,
      ledgerTransactions,
      members,
      users,
      workspaces: tenants.length,
    },
    fingerprint,
    tenants: tenants.map(({ domains, updatedAt: _updatedAt, ...tenant }) => ({
      ...tenant,
      hostnames: domains.map((domain) => domain.hostname),
    })),
  }
}

export async function createQaPurgeRun(requestedByUserId: string) {
  const prisma = requirePrisma()

  return prisma.qaPurgeRun.create({
    data: {
      activeKey: "global",
      requestedByUserId,
      status: "queued",
    },
    select: {
      id: true,
      status: true,
    },
  })
}

export async function getQaPurgeRun(id: string) {
  const prisma = requirePrisma()

  return prisma.qaPurgeRun.findUnique({
    select: {
      completedAt: true,
      createdAt: true,
      deletedCounts: true,
      errorCategory: true,
      id: true,
      startedAt: true,
      status: true,
      updatedAt: true,
    },
    where: { id },
  })
}

export async function blockQaPurgeRun(id: string, errorCategory: string) {
  const prisma = requirePrisma()

  return prisma.qaPurgeRun.update({
    data: {
      activeKey: null,
      completedAt: new Date(),
      errorCategory,
      status: "blocked",
    },
    where: { id, status: "queued" },
  })
}

export async function beginQaPurgeRun(id: string) {
  const prisma = requirePrisma()
  const preview = await getQaMaintenancePreview()

  if (preview.blockers.length > 0) {
    await prisma.qaPurgeRun.update({
      data: {
        activeKey: null,
        completedAt: new Date(),
        errorCategory: "live_provider_resource",
        status: "blocked",
      },
      where: { id },
    })
    throw new Error("QA purge is blocked by live custom-domain resources.")
  }

  const startedAt = new Date()

  await prisma.$transaction([
    prisma.qaPurgeRun.update({
      data: { startedAt, status: "running" },
      where: { id, status: "queued" },
    }),
    prisma.tenant.updateMany({
      data: { qaPurgeStartedAt: startedAt },
      where: {
        dataClassification: "qa",
        id: { in: preview.tenants.map((tenant) => tenant.id) },
      },
    }),
  ])

  return {
    counts: preview.counts,
    tenants: preview.tenants,
  }
}

export async function deleteQaTenant(tenantId: string) {
  const prisma = requirePrisma()

  return prisma.tenant.delete({
    where: {
      id: tenantId,
      dataClassification: "qa",
      qaPurgeStartedAt: { not: null },
    },
  })
}

export async function finishQaPurgeRun(input: {
  counts: QaMaintenanceCounts
  errorCategory?: string
  id: string
  status: "completed" | "failed" | "partially_completed"
}) {
  const prisma = requirePrisma()

  return prisma.qaPurgeRun.update({
    data: {
      activeKey: null,
      completedAt: new Date(),
      deletedCounts: input.counts,
      errorCategory: input.errorCategory,
      status: input.status,
    },
    where: { id: input.id },
  })
}
