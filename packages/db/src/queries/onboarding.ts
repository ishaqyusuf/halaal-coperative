import type { PrismaClient } from "@prisma/client"
import {
  buildDashboardHostname,
  buildTenantSiteHostname,
  normalizeSubdomainLabel,
} from "@halaal-vest/utils"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import { listSeedMemberships, listSeedUsers } from "./auth"
import { listSeedTenantDomains, getTenantById, type TenantRecord } from "./tenants"

function getTenantDomainRoutingScope(input: {
  hostname: string
  kind: "site" | "dashboard" | "custom"
}) {
  if (input.kind === "site") return "site"
  if (input.kind === "dashboard") return "dashboard"
  return input.hostname.startsWith("dashboard.") ? "dashboard" : "site"
}

export type TenantOnboardingStepKey =
  | "tenant_profile"
  | "site_domain"
  | "dashboard_domain"
  | "workspace_owner"
  | "policy_defaults"
  | "ledger_bootstrap"

export type TenantOnboardingStep = {
  key: TenantOnboardingStepKey
  label: string
  description: string
  complete: boolean
}

export type TenantOnboardingSnapshot = {
  status: "complete" | "incomplete"
  completedStepCount: number
  totalStepCount: number
  completionRatio: number
  primarySiteHostname: string | null
  primaryDashboardHostname: string | null
  steps: TenantOnboardingStep[]
}

export type TenantBootstrapInput = {
  name: string
  slug: string
  ownerFullName: string
  ownerEmail: string
  currentSize?: number
  officeAddress?: string | null
  startDate?: string | null
  region?: string | null
  currencyCode?: string
  timezone?: string
  reserveBufferAmount?: number
  monthlyLevyAmount?: number | null
  quickLoanTermMonths?: number
  normalLoanTermMonths?: number
  loanEligibilityMultiple?: number
  requiresDualLoanApproval?: boolean
  allowOfflineFinancialCapture?: boolean
}

export type TenantBootstrapResult = {
  tenant: TenantRecord
  ownerUserId: string
  primarySiteHostname: string
  primaryDashboardHostname: string
  onboarding: TenantOnboardingSnapshot
}

const defaultBootstrapPolicy = {
  allowOfflineFinancialCapture: true,
  eligibilityMultiple: 2,
  monthlyLevyAmount: null,
  normalLoanTermMonths: 18,
  quickLoanTermMonths: 3,
  requiresDualLoanApproval: false,
  reserveBuffer: 450_000,
} as const

function toTenantRecord(input: {
  id: string
  slug: string
  name: string
  currentSize?: number | null
  officeAddress?: string | null
  startDate?: Date | string | null
  region: string | null
  currencyCode: string
  timezone: string
  status: TenantRecord["status"]
  members?: { id: string }[]
}) {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    currentSize: input.currentSize ?? null,
    officeAddress: input.officeAddress ?? null,
    startDate:
      input.startDate instanceof Date
        ? input.startDate.toISOString().slice(0, 10)
        : input.startDate ?? null,
    region: input.region,
    currencyCode: input.currencyCode,
    timezone: input.timezone,
    status: input.status,
    memberCount: input.members?.length ?? 0,
  } satisfies TenantRecord
}

function buildTenantOnboardingSnapshot(input: {
  hasTenantProfile: boolean
  hasPrimarySiteDomain: boolean
  hasPrimaryDashboardDomain: boolean
  hasWorkspaceOwner: boolean
  hasPolicyDefaults: boolean
  hasLedgerBootstrap: boolean
  primarySiteHostname?: string | null
  primaryDashboardHostname?: string | null
}) {
  const steps: TenantOnboardingStep[] = [
    {
      key: "tenant_profile",
      label: "Tenant profile",
      description: "Cooperative name, slug, region, and workspace identity are saved.",
      complete: input.hasTenantProfile,
    },
    {
      key: "site_domain",
      label: "Public site hostname",
      description: "The tenant public website has a primary hostname for routing.",
      complete: input.hasPrimarySiteDomain,
    },
    {
      key: "dashboard_domain",
      label: "Dashboard hostname",
      description: "The tenant dashboard resolves through a dedicated workspace hostname.",
      complete: input.hasPrimaryDashboardDomain,
    },
    {
      key: "workspace_owner",
      label: "Primary admin contact",
      description: "A primary cooperative admin account and default membership are assigned.",
      complete: input.hasWorkspaceOwner,
    },
    {
      key: "policy_defaults",
      label: "Policy defaults",
      description: "Core savings, levy, reserve, and approval defaults are configured.",
      complete: input.hasPolicyDefaults,
    },
    {
      key: "ledger_bootstrap",
      label: "Ledger bootstrap",
      description: "The baseline chart of accounts has been provisioned for money flows.",
      complete: input.hasLedgerBootstrap,
    },
  ]

  const completedStepCount = steps.filter((step) => step.complete).length
  const totalStepCount = steps.length

  return {
    status: completedStepCount === totalStepCount ? "complete" : "incomplete",
    completedStepCount,
    totalStepCount,
    completionRatio: totalStepCount > 0 ? completedStepCount / totalStepCount : 0,
    primarySiteHostname: input.primarySiteHostname ?? null,
    primaryDashboardHostname: input.primaryDashboardHostname ?? null,
    steps,
  } satisfies TenantOnboardingSnapshot
}

export async function getTenantOnboardingState(tenantId: string) {
  const prisma = createPrismaClient()

  if (!prisma) {
    const tenant = getTenantById(tenantId)
    const domains = listSeedTenantDomains().filter((domain) => domain.tenantId === tenantId)
    const primarySiteDomain =
      domains.find((domain) => getTenantDomainRoutingScope(domain) === "site" && domain.isPrimary) ?? null
    const primaryDashboardDomain =
      domains.find((domain) => getTenantDomainRoutingScope(domain) === "dashboard" && domain.isPrimary) ?? null
    const hasWorkspaceOwner = listSeedMemberships().some((membership) =>
      listSeedUsers().some(
        (user) => user.id === membership.userId && membership.tenantId === tenantId && membership.role === "tenant_admin",
      ),
    )

    return buildTenantOnboardingSnapshot({
      hasTenantProfile: Boolean(tenant),
      hasPrimarySiteDomain: Boolean(primarySiteDomain),
      hasPrimaryDashboardDomain: Boolean(primaryDashboardDomain),
      hasWorkspaceOwner,
      hasPolicyDefaults: Boolean(tenant),
      hasLedgerBootstrap: true,
      primarySiteHostname: primarySiteDomain?.hostname ?? null,
      primaryDashboardHostname: primaryDashboardDomain?.hostname ?? null,
    })
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
    include: {
      domains: true,
      policies: true,
      users: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
      memberships: {
        where: {
          role: "tenant_admin",
          isDefault: true,
        },
        select: {
          id: true,
        },
      },
      ledgerAccounts: {
        select: {
          id: true,
        },
      },
    },
  })

  const primarySiteDomain =
    tenant?.domains.find((domain) => getTenantDomainRoutingScope(domain) === "site" && domain.isPrimary) ?? null
  const primaryDashboardDomain =
    tenant?.domains.find((domain) => getTenantDomainRoutingScope(domain) === "dashboard" && domain.isPrimary) ?? null

  return buildTenantOnboardingSnapshot({
    hasTenantProfile: Boolean(tenant),
    hasPrimarySiteDomain: Boolean(primarySiteDomain),
    hasPrimaryDashboardDomain: Boolean(primaryDashboardDomain),
    hasWorkspaceOwner: Boolean(tenant?.users.length && tenant.memberships.length),
    hasPolicyDefaults: Boolean(tenant?.policies),
    hasLedgerBootstrap: Boolean(tenant?.ledgerAccounts.length),
    primarySiteHostname: primarySiteDomain?.hostname ?? null,
    primaryDashboardHostname: primaryDashboardDomain?.hostname ?? null,
  })
}

export async function createTenantWorkspaceBootstrap(input: TenantBootstrapInput): Promise<TenantBootstrapResult> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Tenant bootstrap requires DATABASE_URL to be configured")
  }

  const slug = normalizeSubdomainLabel(input.slug)
  if (!slug) {
    throw new Error("A valid tenant slug is required")
  }

  const primarySiteHostname = buildTenantSiteHostname(slug)
  const primaryDashboardHostname = buildDashboardHostname(slug)

  const tenant = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        slug,
        name: input.name.trim(),
        currentSize: input.currentSize,
        officeAddress: input.officeAddress?.trim() || null,
        startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null,
        region: input.region?.trim() || null,
        currencyCode: input.currencyCode?.trim().toUpperCase() || "NGN",
        timezone: input.timezone?.trim() || "Africa/Lagos",
        status: "pending",
      },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
    })

    await tx.tenantDomain.createMany({
      data: [
        {
          tenantId: createdTenant.id,
          hostname: primarySiteHostname,
          kind: "site",
          isPrimary: true,
        },
        {
          tenantId: createdTenant.id,
          hostname: primaryDashboardHostname,
          kind: "dashboard",
          isPrimary: true,
        },
      ],
    })

    const owner = await tx.user.create({
      data: {
        tenantId: createdTenant.id,
        email: input.ownerEmail.trim().toLowerCase(),
        fullName: input.ownerFullName.trim(),
      },
    })

    await tx.membership.create({
      data: {
        tenantId: createdTenant.id,
        userId: owner.id,
        role: "tenant_admin",
        isDefault: true,
      },
    })

    await tx.tenantPolicy.create({
      data: {
        tenantId: createdTenant.id,
        reserveBufferAmount: input.reserveBufferAmount ?? defaultBootstrapPolicy.reserveBuffer,
        monthlyLevyAmount: input.monthlyLevyAmount ?? defaultBootstrapPolicy.monthlyLevyAmount,
        quickLoanTermMonths: input.quickLoanTermMonths ?? defaultBootstrapPolicy.quickLoanTermMonths,
        normalLoanTermMonths: input.normalLoanTermMonths ?? defaultBootstrapPolicy.normalLoanTermMonths,
        loanEligibilityMultiple: input.loanEligibilityMultiple ?? defaultBootstrapPolicy.eligibilityMultiple,
        requiresDualLoanApproval:
          input.requiresDualLoanApproval ?? defaultBootstrapPolicy.requiresDualLoanApproval,
        allowOfflineFinancialCapture:
          input.allowOfflineFinancialCapture ?? defaultBootstrapPolicy.allowOfflineFinancialCapture,
      },
    })

    await ensureTenantLedgerAccounts(createdTenant.id, tx as unknown as PrismaClient)

    return {
      ownerUserId: owner.id,
      tenant: createdTenant,
    }
  })

  const onboarding = await getTenantOnboardingState(tenant.tenant.id)

  return {
    tenant: toTenantRecord(tenant.tenant),
    ownerUserId: tenant.ownerUserId,
    primarySiteHostname,
    primaryDashboardHostname,
    onboarding,
  }
}
