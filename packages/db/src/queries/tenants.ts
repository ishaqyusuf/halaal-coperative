export type TenantStatus = "pending" | "active" | "suspended" | "archived"

export type TenantRecord = {
  id: string
  slug: string
  name: string
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
  isPrimary: boolean
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
    hostname: "amanah.halaal-vest.com",
    kind: "site",
    isPrimary: true,
  },
  {
    id: "tenant-domain-amanah-dashboard",
    tenantId: "tenant-amanah-demo",
    hostname: "dashboard.amanah.halaal-vest.com",
    kind: "dashboard",
    isPrimary: true,
  },
  {
    id: "tenant-domain-amanah-custom",
    tenantId: "tenant-amanah-demo",
    hostname: "app.amanah.example",
    kind: "custom",
    isPrimary: false,
  },
  {
    id: "tenant-domain-barakah-site",
    tenantId: "tenant-barakah-demo",
    hostname: "barakah.halaal-vest.com",
    kind: "site",
    isPrimary: true,
  },
  {
    id: "tenant-domain-barakah-dashboard",
    tenantId: "tenant-barakah-demo",
    hostname: "dashboard.barakah.halaal-vest.com",
    kind: "dashboard",
    isPrimary: true,
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
    region: input.region,
    currencyCode: input.currencyCode,
    timezone: input.timezone,
    status: input.status,
    memberCount: input.members?.length ?? 0,
  } satisfies TenantRecord
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

  return {
    id: domain.id,
    tenantId: domain.tenantId,
    hostname: domain.hostname,
    kind: domain.kind,
    isPrimary: domain.isPrimary,
  } satisfies TenantDomainRecord
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
import { createPrismaClient } from "../prisma.js"
