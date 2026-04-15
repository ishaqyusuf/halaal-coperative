import { resolveCname } from "node:dns/promises"
import type { Prisma } from "@prisma/client"
import {
  buildDashboardHostname,
  buildTenantSiteHostname,
  platformAppHostname,
} from "@halaal-vest/utils"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"

export type TenantStatus = "pending" | "active" | "suspended" | "archived"

export type TenantRecord = {
  id: string
  slug: string
  name: string
  currentSize?: number | null
  officeAddress?: string | null
  startDate?: string | null
  region: string | null
  currencyCode: string
  timezone: string
  status: TenantStatus
  memberCount: number
  isCaseStudy?: boolean
}

export type TenantDomainKind = "site" | "dashboard" | "custom"

export type TenantDomainRecord = {
  id: string
  tenantId: string
  hostname: string
  kind: TenantDomainKind
  routingScope: "site" | "dashboard"
  isPrimary: boolean
  verificationStatus: string
  verificationCheckedAt?: string | null
  verifiedAt?: string | null
  verificationRecordType?: "CNAME" | "ALIAS"
  verificationTarget?: string | null
  verificationNote?: string | null
  verificationDetails?: Record<string, unknown> | null
}

export type TenantResolution = {
  tenant: TenantRecord | null
  resolvedBy: "subdomain" | "hostname" | "fallback" | "none"
  tenantDomain: TenantDomainRecord | null
}

const seedTenants: TenantRecord[] = [
  {
    id: "tenant-amanah-demo",
    slug: "amanah",
    name: "Amanah Staff Thrift Cooperative",
    currentSize: 428,
    officeAddress: "12 Marina Road, Lagos Island, Lagos",
    startDate: "2016-01-15",
    region: "Lagos",
    currencyCode: "NGN",
    timezone: "Africa/Lagos",
    status: "active",
    memberCount: 428,
    isCaseStudy: true,
  },
  {
    id: "tenant-barakah-demo",
    slug: "barakah",
    name: "Barakah Multipurpose Cooperative",
    currentSize: 212,
    officeAddress: "44 Shehu Shagari Way, Abuja",
    startDate: "2018-06-01",
    region: "Abuja",
    currencyCode: "NGN",
    timezone: "Africa/Lagos",
    status: "active",
    memberCount: 212,
  },
]

const seedTenantDomains: TenantDomainRecord[] = [
  {
    id: "tenant-domain-amanah-site",
    tenantId: "tenant-amanah-demo",
    hostname: buildTenantSiteHostname("amanah"),
    kind: "site",
    routingScope: "site",
    isPrimary: true,
    verificationStatus: "verified",
    verificationCheckedAt: "2026-04-14T00:00:00.000Z",
    verifiedAt: "2026-04-14T00:00:00.000Z",
  },
  {
    id: "tenant-domain-amanah-dashboard",
    tenantId: "tenant-amanah-demo",
    hostname: buildDashboardHostname("amanah"),
    kind: "dashboard",
    routingScope: "dashboard",
    isPrimary: false,
    verificationStatus: "verified",
    verificationCheckedAt: "2026-04-14T00:00:00.000Z",
    verifiedAt: "2026-04-14T00:00:00.000Z",
  },
  {
    id: "tenant-domain-amanah-custom",
    tenantId: "tenant-amanah-demo",
    hostname: "app.amanah.example",
    kind: "custom",
    routingScope: "site",
    isPrimary: false,
    verificationStatus: "pending_dns",
    verificationCheckedAt: null,
    verifiedAt: null,
  },
  {
    id: "tenant-domain-barakah-site",
    tenantId: "tenant-barakah-demo",
    hostname: buildTenantSiteHostname("barakah"),
    kind: "site",
    routingScope: "site",
    isPrimary: true,
    verificationStatus: "verified",
    verificationCheckedAt: "2026-04-14T00:00:00.000Z",
    verifiedAt: "2026-04-14T00:00:00.000Z",
  },
  {
    id: "tenant-domain-barakah-dashboard",
    tenantId: "tenant-barakah-demo",
    hostname: buildDashboardHostname("barakah"),
    kind: "dashboard",
    routingScope: "dashboard",
    isPrimary: false,
    verificationStatus: "verified",
    verificationCheckedAt: "2026-04-14T00:00:00.000Z",
    verifiedAt: "2026-04-14T00:00:00.000Z",
  },
]

export function listSeedTenants() {
  return seedTenants
}

export function listSeedTenantDomains() {
  return seedTenantDomains
}

export function getTenantById(tenantId: string) {
  return seedTenants.find((tenant) => tenant.id === tenantId) ?? null
}

export function findTenantBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null
  }

  return seedTenants.find((tenant) => tenant.slug === slug.trim().toLowerCase()) ?? null
}

export function findTenantDomainByHostname(hostname: string | null | undefined) {
  if (!hostname) {
    return null
  }

  const normalizedHostname = hostname.trim().toLowerCase()

  return seedTenantDomains.find((domain) => domain.hostname === normalizedHostname) ?? null
}

export function resolveTenantByHostname(hostname: string | null | undefined) {
  const tenantDomain = findTenantDomainByHostname(hostname)

  if (!tenantDomain) {
    return null
  }

  return getTenantById(tenantDomain.tenantId)
}

export function resolveTenant(input: {
  hostname?: string | null
  slug?: string | null
  fallbackTenantId?: string | null
}): TenantResolution {
  const tenantFromSlug = findTenantBySlug(input.slug)

  if (tenantFromSlug) {
    return {
      tenant: tenantFromSlug,
      tenantDomain: null,
      resolvedBy: "subdomain",
    }
  }

  const tenantDomain = findTenantDomainByHostname(input.hostname)

  if (tenantDomain) {
    return {
      tenant: getTenantById(tenantDomain.tenantId),
      tenantDomain,
      resolvedBy: "hostname",
    }
  }

  const fallbackTenant = input.fallbackTenantId ? getTenantById(input.fallbackTenantId) : null

  if (fallbackTenant) {
    return {
      tenant: fallbackTenant,
      tenantDomain: null,
      resolvedBy: "fallback",
    }
  }

  return {
    tenant: null,
    tenantDomain: null,
    resolvedBy: "none",
  }
}

function mapPrismaTenantRecord(input: {
  id: string
  slug: string
  name: string
  currentSize: number | null
  officeAddress: string | null
  startDate: Date | null
  region: string | null
  currencyCode: string
  timezone: string
  status: TenantStatus
  members?: unknown[]
}) {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    currentSize: input.currentSize,
    officeAddress: input.officeAddress,
    startDate: input.startDate ? input.startDate.toISOString().slice(0, 10) : null,
    region: input.region,
    currencyCode: input.currencyCode,
    timezone: input.timezone,
    status: input.status,
    memberCount: input.members?.length ?? 0,
  } satisfies TenantRecord
}

const platformIngressHostname = platformAppHostname

function getTenantDomainRoutingScope(input: {
  hostname: string
  kind: TenantDomainKind
}): "site" | "dashboard" {
  if (input.kind === "site") return "site"
  if (input.kind === "dashboard") return "dashboard"

  return input.hostname.startsWith("dashboard.") ? "dashboard" : "site"
}

function getTenantDomainVerificationGuide(input: {
  hostname: string
  kind: TenantDomainKind
  verificationStatus: string
  verificationDetails?: Record<string, unknown> | null
}) {
  const routingScope = getTenantDomainRoutingScope(input)

  const details = input.verificationDetails
  const dnsSummary =
    details && Array.isArray(details.resolvedRecords) && details.resolvedRecords.length > 0
      ? `Resolved: ${details.resolvedRecords.join(", ")}.`
      : null
  const errorSummary = typeof details?.errorMessage === "string" ? details.errorMessage : null

  if (input.kind !== "custom") {
    return {
      routingScope,
      verificationRecordType: "ALIAS" as const,
      verificationTarget: null,
      verificationNote:
        routingScope === "dashboard"
          ? "Platform-managed legacy dashboard alias. Verification is handled by the platform."
          : "Platform-managed canonical tenant hostname. Verification is handled by the platform.",
    }
  }

  return {
    routingScope,
    verificationRecordType: "CNAME" as const,
    verificationTarget: platformIngressHostname,
    verificationNote:
      input.verificationStatus === "verified"
        ? dnsSummary
          ? `DNS target looks ready and the domain is approved for promotion within its routing scope. ${dnsSummary}`
          : "DNS target looks ready and the domain is approved for promotion within its routing scope."
        : input.verificationStatus === "failed" && errorSummary
          ? `Verification failed. ${errorSummary}`
        : routingScope === "dashboard"
          ? `Point this legacy dashboard alias to ${platformIngressHostname}, then run a verification check before making it primary.`
          : `Point this canonical tenant hostname to ${platformIngressHostname}, then run a verification check before making it primary.`,
  }
}

function mapTenantDomainRecord(input: {
  id: string
  tenantId: string
  hostname: string
  kind: TenantDomainKind
  isPrimary: boolean
  verificationStatus: string
  verificationCheckedAt?: Date | string | null
  verificationDetails?: Prisma.JsonValue | null
  verifiedAt?: Date | string | null
}) {
  const verificationDetails =
    input.verificationDetails && typeof input.verificationDetails === "object"
      ? (input.verificationDetails as Record<string, unknown>)
      : null
  const guide = getTenantDomainVerificationGuide({
    hostname: input.hostname,
    kind: input.kind,
    verificationStatus: input.verificationStatus,
    verificationDetails,
  })

  return {
    id: input.id,
    tenantId: input.tenantId,
    hostname: input.hostname,
    kind: input.kind,
    routingScope: guide.routingScope,
    isPrimary: input.isPrimary,
    verificationStatus: input.verificationStatus,
    verificationCheckedAt:
      input.verificationCheckedAt instanceof Date
        ? input.verificationCheckedAt.toISOString()
        : input.verificationCheckedAt ?? null,
    verifiedAt:
      input.verifiedAt instanceof Date ? input.verifiedAt.toISOString() : input.verifiedAt ?? null,
    verificationRecordType: guide.verificationRecordType,
    verificationTarget: guide.verificationTarget,
    verificationNote: guide.verificationNote,
    verificationDetails,
  } satisfies TenantDomainRecord
}

async function verifyCustomHostnameDns(hostname: string) {
  try {
    const cnameRecords = await resolveCname(hostname)
    const normalizedRecords = cnameRecords.map((record) => record.replace(/\.$/, "").toLowerCase())
    const matchedTarget = normalizedRecords.includes(platformIngressHostname)

    return {
      checkedAt: new Date().toISOString(),
      errorCode: null,
      errorMessage: matchedTarget
        ? null
        : `Expected CNAME target ${platformIngressHostname} but found ${normalizedRecords.join(", ")}.`,
      lookupMethod: "resolveCname",
      matchedTarget,
      resolvedRecords: normalizedRecords,
      status: matchedTarget ? "verified" : "failed",
    } as const
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "UNKNOWN"
    const isPendingDns = code === "ENODATA" || code === "ENOTFOUND" || code === "ESERVFAIL"

    return {
      checkedAt: new Date().toISOString(),
      errorCode: code,
      errorMessage: isPendingDns
        ? `DNS record not found yet. Add a CNAME to ${platformIngressHostname} and run the check again.`
        : error instanceof Error
          ? error.message
          : "DNS lookup failed.",
      lookupMethod: "resolveCname",
      matchedTarget: false,
      resolvedRecords: [],
      status: isPendingDns ? "pending_dns" : "failed",
    } as const
  }
}

export async function listTenants() {
  const prisma = createPrismaClient()

  if (!prisma) {
    return listSeedTenants()
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      members: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return tenants.map(mapPrismaTenantRecord)
}

export async function getTenantByIdAsync(tenantId: string) {
  const prisma = createPrismaClient()

  if (!prisma) {
    return getTenantById(tenantId)
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
    include: {
      members: {
        select: {
          id: true,
        },
      },
    },
  })

  return tenant ? mapPrismaTenantRecord(tenant) : null
}

export async function findTenantBySlugAsync(slug: string | null | undefined) {
  if (!slug) {
    return null
  }

  const prisma = createPrismaClient()

  if (!prisma) {
    return findTenantBySlug(slug)
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: slug.trim().toLowerCase(),
    },
    include: {
      members: {
        select: {
          id: true,
        },
      },
    },
  })

  return tenant ? mapPrismaTenantRecord(tenant) : null
}

export async function findTenantDomainByHostnameAsync(hostname: string | null | undefined) {
  if (!hostname) {
    return null
  }

  const prisma = createPrismaClient()

  if (!prisma) {
    return findTenantDomainByHostname(hostname)
  }

  const domain = await prisma.tenantDomain.findUnique({
    where: {
      hostname: hostname.trim().toLowerCase(),
    },
  })

  if (!domain) {
    return null
  }

  return mapTenantDomainRecord(domain)
}

export async function resolveTenantAsync(input: {
  hostname?: string | null
  slug?: string | null
  fallbackTenantId?: string | null
}): Promise<TenantResolution> {
  const tenantFromSlug = await findTenantBySlugAsync(input.slug)

  if (tenantFromSlug) {
    return {
      tenant: tenantFromSlug,
      tenantDomain: null,
      resolvedBy: "subdomain",
    }
  }

  const tenantDomain = await findTenantDomainByHostnameAsync(input.hostname)

  if (tenantDomain) {
    return {
      tenant: await getTenantByIdAsync(tenantDomain.tenantId),
      tenantDomain,
      resolvedBy: "hostname",
    }
  }

  const fallbackTenant = input.fallbackTenantId
    ? await getTenantByIdAsync(input.fallbackTenantId)
    : null

  if (fallbackTenant) {
    return {
      tenant: fallbackTenant,
      tenantDomain: null,
      resolvedBy: "fallback",
    }
  }

  return {
    tenant: null,
    tenantDomain: null,
    resolvedBy: "none",
  }
}

export async function listTenantDomainsByTenantId(tenantId: string) {
  const prisma = createPrismaClient()

  if (!prisma) {
    return listSeedTenantDomains().filter((domain) => domain.tenantId === tenantId)
  }

  const domains = await prisma.tenantDomain.findMany({
    where: {
      tenantId,
    },
    orderBy: [{ isPrimary: "desc" }, { hostname: "asc" }],
  })

  return domains.map(mapTenantDomainRecord)
}

export async function updateTenantProfile(
  input: {
    actorUserId: string
    currentSize?: number | null
    name: string
    officeAddress?: string | null
    region?: string | null
    startDate?: string | null
    tenantId: string
    timezone: string
  },
) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  const tenant = await prisma.tenant.update({
    where: {
      id: input.tenantId,
    },
    data: {
      currentSize: input.currentSize ?? null,
      name: input.name,
      officeAddress: input.officeAddress ?? null,
      region: input.region ?? null,
      startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null,
      timezone: input.timezone,
    },
  })

  await createAuditLogEntry(
    {
      action: "tenant.profile_updated",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: tenant.id,
      entityType: "Tenant",
      metadata: {
        currentSize: input.currentSize ?? null,
        name: input.name,
        officeAddress: input.officeAddress ?? null,
        region: input.region ?? null,
        startDate: input.startDate ?? null,
        timezone: input.timezone,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return tenant
}

export async function createTenantCustomDomain(input: {
  actorUserId: string
  hostname: string
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  const hostname = input.hostname.trim().toLowerCase()

  if (!hostname) {
    throw new Error("Hostname is required")
  }

  const domain = await prisma.tenantDomain.create({
    data: {
      tenantId: input.tenantId,
      hostname,
      kind: "custom",
      isPrimary: false,
      verificationStatus: "pending_dns",
      verificationDetails: {
        checkedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: `Point this hostname to ${platformIngressHostname} and run a verification check.`,
        lookupMethod: "manual",
        matchedTarget: false,
        resolvedRecords: [],
        status: "pending_dns",
      } satisfies Prisma.InputJsonValue,
      verificationCheckedAt: new Date(),
    },
  })

  await createAuditLogEntry(
    {
      action: "tenant_domain.created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: domain.id,
      entityType: "TenantDomain",
      metadata: {
        hostname,
        kind: domain.kind,
        isPrimary: domain.isPrimary,
        verificationStatus: domain.verificationStatus,
        verificationDetails: domain.verificationDetails,
      },
      tenantId: input.tenantId,
    },
    prisma,
  )

  return mapTenantDomainRecord(domain)
}

export async function setTenantDomainPrimary(input: {
  actorUserId: string
  domainId: string
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma.$transaction(async (tx) => {
    const domain = await tx.tenantDomain.findFirst({
      where: {
        id: input.domainId,
        tenantId: input.tenantId,
      },
    })

    if (!domain) {
      throw new Error("Domain not found")
    }

    if (domain.kind === "custom" && domain.verificationStatus !== "verified") {
      throw new Error("Custom domains must be verified before they can become primary.")
    }

    const routingScope = getTenantDomainRoutingScope({
      hostname: domain.hostname,
      kind: domain.kind,
    })

    const scopedDomains = await tx.tenantDomain.findMany({
      where: {
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        hostname: true,
        kind: true,
      },
    })

    const scopedDomainIds = scopedDomains
      .filter((item) => getTenantDomainRoutingScope({ hostname: item.hostname, kind: item.kind }) === routingScope)
      .map((item) => item.id)

    await tx.tenantDomain.updateMany({
      where: {
        id: {
          in: scopedDomainIds,
        },
      },
      data: {
        isPrimary: false,
      },
    })

    const updated = await tx.tenantDomain.update({
      where: {
        id: domain.id,
      },
      data: {
        isPrimary: true,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "tenant_domain.primary_set",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: updated.id,
        entityType: "TenantDomain",
        metadata: {
          hostname: updated.hostname,
          kind: updated.kind,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return mapTenantDomainRecord(updated)
  })
}

export async function updateTenantDomainVerificationStatus(input: {
  actorUserId: string
  domainId: string
  status: "failed" | "pending_dns" | "verified"
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  const domain = await prisma.tenantDomain.findFirst({
    where: {
      id: input.domainId,
      tenantId: input.tenantId,
    },
  })

  if (!domain) {
    throw new Error("Domain not found")
  }

  const updated = await prisma.tenantDomain.update({
    where: {
      id: domain.id,
    },
    data: {
      verificationStatus: input.status,
      verificationDetails: {
        checkedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage:
          input.status === "verified"
            ? null
            : input.status === "pending_dns"
              ? `Awaiting DNS alignment to ${platformIngressHostname}.`
              : "Verification was manually marked as failed.",
        lookupMethod: "manual_override",
        matchedTarget: input.status === "verified",
        resolvedRecords: [],
        status: input.status,
      } satisfies Prisma.InputJsonValue,
      verificationCheckedAt: new Date(),
      verifiedAt: input.status === "verified" ? new Date() : null,
    },
  })

  await createAuditLogEntry({
    action: "tenant_domain.verification_updated",
    actorType: "user",
    actorUserId: input.actorUserId,
    entityId: updated.id,
    entityType: "TenantDomain",
    metadata: {
      hostname: updated.hostname,
      status: updated.verificationStatus,
      verificationDetails: updated.verificationDetails,
    },
    tenantId: input.tenantId,
  })

  return mapTenantDomainRecord(updated)
}

export async function syncTenantDomainVerificationByHostname(input: {
  hostname: string
  tenantId: string
  verificationDetails: Prisma.InputJsonValue
  verificationStatus: "failed" | "pending_dns" | "verified"
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    return null
  }

  const domain = await prisma.tenantDomain.findFirst({
    where: {
      hostname: input.hostname.trim().toLowerCase(),
      tenantId: input.tenantId,
    },
  })

  if (!domain) {
    return null
  }

  const updated = await prisma.tenantDomain.update({
    where: {
      id: domain.id,
    },
    data: {
      verificationCheckedAt: new Date(),
      verificationDetails: input.verificationDetails,
      verificationStatus: input.verificationStatus,
      verifiedAt: input.verificationStatus === "verified" ? domain.verifiedAt ?? new Date() : null,
    },
  })

  return mapTenantDomainRecord(updated)
}

function isValidHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase()

  if (!normalized || normalized.length > 253 || normalized.includes("://") || normalized.includes("/")) {
    return false
  }

  const labels = normalized.split(".")
  if (labels.length < 2) {
    return false
  }

  return labels.every((label) => /^[a-z0-9-]+$/.test(label) && !label.startsWith("-") && !label.endsWith("-"))
}

export async function runTenantDomainVerificationCheck(input: {
  actorUserId: string
  domainId: string
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  const domain = await prisma.tenantDomain.findFirst({
    where: {
      id: input.domainId,
      tenantId: input.tenantId,
    },
  })

  if (!domain) {
    throw new Error("Domain not found")
  }

  const verificationResult =
    domain.kind === "site" || domain.kind === "dashboard"
      ? {
          checkedAt: new Date().toISOString(),
          errorCode: null,
          errorMessage: null,
          lookupMethod: "platform_managed",
          matchedTarget: true,
          resolvedRecords: [],
          status: "verified",
        }
      : !isValidHostname(domain.hostname)
        ? {
            checkedAt: new Date().toISOString(),
            errorCode: "INVALID_HOSTNAME",
            errorMessage: "Hostname format is invalid.",
            lookupMethod: "validation",
            matchedTarget: false,
            resolvedRecords: [],
            status: "failed",
          }
        : await verifyCustomHostnameDns(domain.hostname)

  const updated = await prisma.tenantDomain.update({
    where: {
      id: domain.id,
    },
    data: {
      verificationStatus: verificationResult.status,
      verificationDetails: verificationResult satisfies Prisma.InputJsonValue,
      verificationCheckedAt: new Date(),
      verifiedAt: verificationResult.status === "verified" ? domain.verifiedAt ?? new Date() : null,
    },
  })

  await createAuditLogEntry({
    action: "tenant_domain.verification_checked",
    actorType: "user",
    actorUserId: input.actorUserId,
    entityId: updated.id,
    entityType: "TenantDomain",
    metadata: {
      hostname: updated.hostname,
      status: updated.verificationStatus,
      verificationDetails: updated.verificationDetails,
    },
    tenantId: input.tenantId,
  })

  return mapTenantDomainRecord(updated)
}
