import type { PrismaClient } from "../../generated/prisma/client"
import {
  buildTenantSiteHostname,
  isReservedTenantSubdomainLabel,
  normalizeSubdomainLabel,
} from "@halaalvest/utils"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import { listSeedMemberships, listSeedUsers } from "./auth"
import {
  listSeedTenantDomains,
  getTenantById,
  type TenantRecord,
} from "./tenants"

export type TenantOnboardingStepKey =
  | "tenant_profile"
  | "site_domain"
  | "workspace_access"
  | "workspace_owner"
  | "policy_defaults"
  | "charge_setup"
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

export type TenantFirstRunOnboardingStepKey =
  | "charges"
  | "shares"
  | "business"
  | "members"
  | "member_migration"
  | "loan"
  | "commitments"

export type TenantFirstRunOnboardingStep = {
  key: TenantFirstRunOnboardingStepKey
  label: string
  description: string
  complete: boolean
  href: string
}

export type TenantFirstRunOnboardingSnapshot = {
  completedStepCount: number
  totalStepCount: number
  completionRatio: number
  shouldOpenForEmptyWorkspace: boolean
  steps: TenantFirstRunOnboardingStep[]
}

export type TenantBootstrapInput = {
  name: string
  slug: string
  ownerFullName: string
  ownerEmail: string
  ownerPasswordHash?: string
  ownerMemberNumber?: string
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
        : (input.startDate ?? null),
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
  hasWorkspaceAccess: boolean
  hasWorkspaceOwner: boolean
  hasPolicyDefaults: boolean
  hasChargeSetup: boolean
  hasLedgerBootstrap: boolean
  primarySiteHostname?: string | null
  primaryDashboardHostname?: string | null
}) {
  const steps: TenantOnboardingStep[] = [
    {
      key: "tenant_profile",
      label: "Tenant profile",
      description:
        "Cooperative name, slug, region, and workspace identity are saved.",
      complete: input.hasTenantProfile,
    },
    {
      key: "site_domain",
      label: "Public site hostname",
      description:
        "The tenant public website has a primary hostname for routing.",
      complete: input.hasPrimarySiteDomain,
    },
    {
      key: "workspace_access",
      label: "Workspace app route",
      description:
        "The tenant hostname also serves the authenticated workspace under /app.",
      complete: input.hasWorkspaceAccess,
    },
    {
      key: "workspace_owner",
      label: "Primary admin contact",
      description:
        "A primary cooperative admin account and default membership are assigned.",
      complete: input.hasWorkspaceOwner,
    },
    {
      key: "policy_defaults",
      label: "Policy defaults",
      description:
        "Core savings, levy, reserve, and approval defaults are configured.",
      complete: input.hasPolicyDefaults,
    },
    {
      key: "charge_setup",
      label: "Charges setup",
      description:
        "At least one active tenant charge definition is ready for member finance workflows.",
      complete: input.hasChargeSetup,
    },
    {
      key: "ledger_bootstrap",
      label: "Ledger bootstrap",
      description:
        "The baseline chart of accounts has been provisioned for money flows.",
      complete: input.hasLedgerBootstrap,
    },
  ]

  const completedStepCount = steps.filter((step) => step.complete).length
  const totalStepCount = steps.length

  return {
    status: completedStepCount === totalStepCount ? "complete" : "incomplete",
    completedStepCount,
    totalStepCount,
    completionRatio:
      totalStepCount > 0 ? completedStepCount / totalStepCount : 0,
    primarySiteHostname: input.primarySiteHostname ?? null,
    primaryDashboardHostname:
      input.primaryDashboardHostname ?? input.primarySiteHostname ?? null,
    steps,
  } satisfies TenantOnboardingSnapshot
}

export async function getTenantOnboardingState(tenantId: string) {
  const prisma = createPrismaClient()

  if (!prisma) {
    const tenant = getTenantById(tenantId)
    const domains = listSeedTenantDomains().filter(
      (domain) => domain.tenantId === tenantId
    )
    const primarySiteDomain =
      domains.find(
        (domain) =>
          domain.kind === "site" && domain.isPrimary
      ) ?? null
    const hasWorkspaceOwner = listSeedMemberships().some((membership) =>
      listSeedUsers().some(
        (user) =>
          user.id === membership.userId &&
          membership.tenantId === tenantId &&
          membership.role === "tenant_admin"
      )
    )

    return buildTenantOnboardingSnapshot({
      hasTenantProfile: Boolean(tenant),
      hasPrimarySiteDomain: Boolean(primarySiteDomain),
      hasWorkspaceAccess: Boolean(primarySiteDomain),
      hasWorkspaceOwner,
      hasPolicyDefaults: Boolean(tenant),
      hasChargeSetup: Boolean(tenant),
      hasLedgerBootstrap: true,
      primarySiteHostname: primarySiteDomain?.hostname ?? null,
      primaryDashboardHostname: primarySiteDomain?.hostname ?? null,
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
      chargeDefinitions: {
        where: {
          isActive: true,
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
    tenant?.domains.find(
      (domain) =>
        domain.kind === "site" && domain.isPrimary
    ) ?? null
  return buildTenantOnboardingSnapshot({
    hasTenantProfile: Boolean(tenant),
    hasPrimarySiteDomain: Boolean(primarySiteDomain),
    hasWorkspaceAccess: Boolean(primarySiteDomain),
    hasWorkspaceOwner: Boolean(
      tenant?.users.length && tenant.memberships.length
    ),
    hasPolicyDefaults: Boolean(tenant?.policies),
    hasChargeSetup: Boolean(tenant?.chargeDefinitions.length),
    hasLedgerBootstrap: Boolean(tenant?.ledgerAccounts.length),
    primarySiteHostname: primarySiteDomain?.hostname ?? null,
    primaryDashboardHostname: primarySiteDomain?.hostname ?? null,
  })
}

export async function getTenantFirstRunOnboardingState(
  tenantId: string
): Promise<TenantFirstRunOnboardingSnapshot> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return {
      completedStepCount: 0,
      totalStepCount: 0,
      completionRatio: 0,
      shouldOpenForEmptyWorkspace: false,
      steps: [],
    }
  }

  const [
    activeCharges,
    shareVersions,
    shareBusinesses,
    activeMembers,
    appliedBackfillMonths,
    loanProducts,
    activeLoans,
    contributionPlans,
    contributions,
    monthlyRecords,
    importBatches,
  ] = await Promise.all([
    prisma.chargeDefinition.count({
      where: { isActive: true, tenantId },
    }),
    prisma.tenantShareStructureVersion.count({ where: { tenantId } }),
    prisma.shareBusiness.count({ where: { tenantId } }),
    prisma.member.count({
      where: { status: { not: "exited" }, tenantId },
    }),
    prisma.appliedBackfillMonth.count({ where: { tenantId } }),
    prisma.loanProduct.count({ where: { isActive: true, tenantId } }),
    prisma.loan.count({ where: { tenantId } }),
    prisma.contributionPlan.count({ where: { tenantId } }),
    prisma.contribution.count({ where: { tenantId } }),
    prisma.monthlyRecord.count({ where: { tenantId } }),
    prisma.importBatch.count({
      where: {
        status: "applied",
        tenantId,
      },
    }),
  ])
  const hasMembersBeyondOwner = activeMembers > 1 || importBatches > 0
  const steps: TenantFirstRunOnboardingStep[] = [
    {
      key: "charges",
      label: "Charges",
      description: "Create the active member charge or levy structures.",
      complete: activeCharges > 0,
      href: "/settings/finance/charges",
    },
    {
      key: "shares",
      label: "Shares",
      description: "Configure the cooperative share structure.",
      complete: shareVersions > 0,
      href: "/settings/finance/shares",
    },
    {
      key: "business",
      label: "Business",
      description: "Register the business or profit-sharing setup.",
      complete: shareBusinesses > 0,
      href: "/settings/finance/business",
    },
    {
      key: "members",
      label: "Add or import members",
      description: "Create the first real member set or import a batch.",
      complete: hasMembersBeyondOwner,
      href: "/settings/imports/members",
    },
    {
      key: "member_migration",
      label: "Member migration",
      description: "Review historical member balances and backfill rows.",
      complete: appliedBackfillMonths > 0,
      href: "/settings/finance/migration",
    },
    {
      key: "loan",
      label: "Loan",
      description: "Configure loan products or migrate active loans.",
      complete: loanProducts > 0 || activeLoans > 0,
      href: "/settings/finance/loan",
    },
    {
      key: "commitments",
      label: "Commitment progression",
      description: "Confirm monthly commitments and contribution readiness.",
      complete: contributionPlans > 0 || monthlyRecords > 0,
      href: "/monthly-records",
    },
  ]
  const completedStepCount = steps.filter((step) => step.complete).length
  const totalStepCount = steps.length
  const hasOperationalData =
    activeCharges > 0 ||
    shareVersions > 0 ||
    shareBusinesses > 0 ||
    hasMembersBeyondOwner ||
    appliedBackfillMonths > 0 ||
    loanProducts > 0 ||
    activeLoans > 0 ||
    contributionPlans > 0 ||
    contributions > 0 ||
    monthlyRecords > 0

  return {
    completedStepCount,
    totalStepCount,
    completionRatio:
      totalStepCount > 0 ? completedStepCount / totalStepCount : 0,
    shouldOpenForEmptyWorkspace: !hasOperationalData,
    steps,
  }
}

export async function createTenantWorkspaceBootstrap(
  input: TenantBootstrapInput
): Promise<TenantBootstrapResult> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Tenant bootstrap requires DATABASE_URL to be configured")
  }

  const slug = normalizeSubdomainLabel(input.slug)
  if (!slug) {
    throw new Error("A valid tenant slug is required")
  }

  if (isReservedTenantSubdomainLabel(slug)) {
    throw new Error("That workspace subdomain is not available.")
  }

  const primarySiteHostname = buildTenantSiteHostname(slug)
  const primaryDashboardHostname = primarySiteHostname

  const tenant = await prisma.$transaction(async (tx) => {
    const existingTenant = await tx.tenant.findFirst({
      where: {
        OR: [
          {
            slug,
          },
          {
            name: {
              equals: input.name.trim(),
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        name: true,
        slug: true,
      },
    })

    if (existingTenant?.slug === slug) {
      throw new Error("That workspace subdomain is not available.")
    }

    if (existingTenant) {
      throw new Error("That cooperative name is already in use.")
    }

    const createdTenant = await tx.tenant.create({
      data: {
        slug,
        name: input.name.trim(),
        currentSize: input.currentSize,
        officeAddress: input.officeAddress?.trim() || null,
        startDate: input.startDate
          ? new Date(`${input.startDate}T00:00:00.000Z`)
          : null,
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
      ],
    })

    const owner = await tx.user.create({
      data: {
        tenantId: createdTenant.id,
        email: input.ownerEmail.trim().toLowerCase(),
        fullName: input.ownerFullName.trim(),
        passwordHash: input.ownerPasswordHash,
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

    if (input.ownerMemberNumber?.trim()) {
      await tx.member.create({
        data: {
          tenantId: createdTenant.id,
          userId: owner.id,
          memberNumber: input.ownerMemberNumber.trim(),
          fullName: input.ownerFullName.trim(),
          memberType: "individual",
          joinedAt: input.startDate
            ? new Date(`${input.startDate}T00:00:00.000Z`)
            : new Date(),
          status: "active",
        },
      })
    }

    await tx.tenantPolicy.create({
      data: {
        tenantId: createdTenant.id,
        reserveBufferAmount:
          input.reserveBufferAmount ?? defaultBootstrapPolicy.reserveBuffer,
        monthlyLevyAmount:
          input.monthlyLevyAmount ?? defaultBootstrapPolicy.monthlyLevyAmount,
        quickLoanTermMonths:
          input.quickLoanTermMonths ??
          defaultBootstrapPolicy.quickLoanTermMonths,
        normalLoanTermMonths:
          input.normalLoanTermMonths ??
          defaultBootstrapPolicy.normalLoanTermMonths,
        loanEligibilityMultiple:
          input.loanEligibilityMultiple ??
          defaultBootstrapPolicy.eligibilityMultiple,
        requiresDualLoanApproval:
          input.requiresDualLoanApproval ??
          defaultBootstrapPolicy.requiresDualLoanApproval,
        allowOfflineFinancialCapture:
          input.allowOfflineFinancialCapture ??
          defaultBootstrapPolicy.allowOfflineFinancialCapture,
      },
    })

    await ensureTenantLedgerAccounts(
      createdTenant.id,
      tx as unknown as PrismaClient
    )

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
