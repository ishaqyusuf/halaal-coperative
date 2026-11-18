import {
  getPublishedLegalBundle,
  validateLegalAcknowledgement,
  type LegalAcknowledgement,
} from "../legal-publication"
import { recordLegalAcceptanceInTransaction } from "./legal-acceptance"
import {
  buildTenantSiteHostname,
  composeCooperativeAccessCode,
  cooperativeMemberNumberPrefix,
  isReservedTenantSubdomainLabel,
  isValidCooperativeCodePrefix,
  normalizeCooperativeCodePrefix,
  normalizeSubdomainLabel,
} from "@halaalvest/utils"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { insertTenantLedgerAccounts } from "./ledger"
import { listSeedMemberships, listSeedUsers } from "./auth"
import {
  defaultTenantServiceAccessModes,
  tenantServiceKeys,
} from "./operation-profile"
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

export type TenantBootstrapInput = {
  legalAcknowledgement?: LegalAcknowledgement
  cooperativeCodePrefix?: string | null
  name: string
  slug: string
  ownerFullName: string
  ownerEmail: string
  ownerPasswordHash?: string
  memberNumberPrefix?: string | null
  ownerMemberNumber?: string
  currentSize?: number
  officeAddress?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
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
  qaSourceDomain?: string | null
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
  // A reserve is a deliberate cooperative policy; new cooperatives start at 0
  // so it never silently absorbs all financing capacity (ADR-20261113).
  reserveBuffer: 0,
} as const

const tenantBootstrapTransactionTimeoutMs = 20_000

function toTenantRecord(input: {
  id: string
  slug: string
  name: string
  cooperativeCodePrefix?: string | null
  currentSize?: number | null
  officeAddress?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  startDate?: Date | string | null
  region: string | null
  currencyCode: string
  timezone: string
  status: TenantRecord["status"]
  dataClassification: TenantRecord["dataClassification"]
  qaPurgeStartedAt?: Date | null
}) {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    cooperativeCodePrefix: input.cooperativeCodePrefix ?? null,
    currentSize: input.currentSize ?? null,
    officeAddress: input.officeAddress ?? null,
    city: input.city ?? null,
    state: input.state ?? input.region ?? null,
    country: input.country ?? null,
    startDate:
      input.startDate instanceof Date
        ? input.startDate.toISOString().slice(0, 10)
        : (input.startDate ?? null),
    region: input.region,
    currencyCode: input.currencyCode,
    timezone: input.timezone,
    status: input.status,
    dataClassification: input.dataClassification,
    qaPurgeStartedAt: input.qaPurgeStartedAt?.toISOString() ?? null,
    memberCount: 0,
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
      label: "Cooperative profile",
      description:
        "Cooperative name, slug, location, and workspace identity are saved.",
      complete: input.hasTenantProfile,
    },
    {
      key: "site_domain",
      label: "Public site hostname",
      description:
        "The cooperative public website has a primary hostname for routing.",
      complete: input.hasPrimarySiteDomain,
    },
    {
      key: "workspace_access",
      label: "Workspace access",
      description:
        "The cooperative hostname also serves the authenticated workspace.",
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
        "At least one active cooperative charge definition is ready for member finance workflows.",
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
      domains.find((domain) => domain.kind === "site" && domain.isPrimary) ??
      null
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

  const [tenant] = await prisma.$queryRaw<
    {
      hasWorkspaceOwner: boolean
      hasPolicyDefaults: boolean
      hasChargeSetup: boolean
      hasLedgerBootstrap: boolean
      primarySiteHostname: string | null
    }[]
  >`
    SELECT
      (SELECT hostname FROM tenant_domains
       WHERE tenant_id = tenant.id AND kind = 'site' AND is_primary
       LIMIT 1) AS "primarySiteHostname",
      (EXISTS (SELECT 1 FROM users WHERE tenant_id = tenant.id AND deleted_at IS NULL)
       AND EXISTS (SELECT 1 FROM memberships
                   WHERE tenant_id = tenant.id AND role = 'tenant_admin' AND is_default))
        AS "hasWorkspaceOwner",
      EXISTS (SELECT 1 FROM tenant_policies WHERE tenant_id = tenant.id) AS "hasPolicyDefaults",
      EXISTS (SELECT 1 FROM charge_definitions WHERE tenant_id = tenant.id AND is_active)
        AS "hasChargeSetup",
      EXISTS (SELECT 1 FROM ledger_accounts WHERE tenant_id = tenant.id) AS "hasLedgerBootstrap"
    FROM tenants AS tenant
    WHERE tenant.id = ${tenantId}::uuid
  `

  return buildTenantOnboardingSnapshot({
    hasTenantProfile: Boolean(tenant),
    hasPrimarySiteDomain: tenant?.primarySiteHostname != null,
    hasWorkspaceAccess: tenant?.primarySiteHostname != null,
    hasWorkspaceOwner: tenant?.hasWorkspaceOwner ?? false,
    hasPolicyDefaults: tenant?.hasPolicyDefaults ?? false,
    hasChargeSetup: tenant?.hasChargeSetup ?? false,
    hasLedgerBootstrap: tenant?.hasLedgerBootstrap ?? false,
    primarySiteHostname: tenant?.primarySiteHostname,
  })
}

export async function createTenantWorkspaceBootstrap(
  input: TenantBootstrapInput
): Promise<TenantBootstrapResult> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Cooperative bootstrap requires HALAALVEST_DATABASE_URL to be configured"
    )
  }

  const slug = normalizeSubdomainLabel(input.slug)
  if (!slug) {
    throw ExpectedQueryError.validation("A valid cooperative slug is required")
  }

  if (isReservedTenantSubdomainLabel(slug)) {
    throw ExpectedQueryError.conflict(
      "That workspace subdomain is not available."
    )
  }

  const cooperativeCodePrefix = normalizeCooperativeCodePrefix(
    input.cooperativeCodePrefix
  )
  if (
    input.cooperativeCodePrefix != null &&
    !isValidCooperativeCodePrefix(cooperativeCodePrefix)
  ) {
    throw ExpectedQueryError.validation(
      "Use a cooperative prefix of 3 to 5 letters."
    )
  }

  const primarySiteHostname = buildTenantSiteHostname(slug)
  const primaryDashboardHostname = primarySiteHostname

  const requiresLegalAcceptance =
    getPublishedLegalBundle().acceptanceRequired ||
    input.legalAcknowledgement !== undefined
  if (requiresLegalAcceptance)
    validateLegalAcknowledgement(input.legalAcknowledgement)

  const { ownerUserId, tenant } = await prisma.$transaction(
    async (tx) => {
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
            ...(cooperativeCodePrefix ? [{ cooperativeCodePrefix }] : []),
          ],
        },
        select: {
          cooperativeCodePrefix: true,
          name: true,
          slug: true,
        },
      })

      if (existingTenant?.slug === slug) {
        throw ExpectedQueryError.conflict(
          "That workspace subdomain is not available."
        )
      }

      if (
        cooperativeCodePrefix &&
        existingTenant?.cooperativeCodePrefix === cooperativeCodePrefix
      ) {
        throw ExpectedQueryError.conflict(
          "That cooperative prefix is already in use."
        )
      }

      if (existingTenant) {
        throw ExpectedQueryError.conflict(
          "That cooperative name is already in use."
        )
      }

      const createdTenant = await tx.tenant.create({
        data: {
          slug,
          name: input.name.trim(),
          cooperativeCodePrefix: cooperativeCodePrefix || null,
          currentSize: input.currentSize,
          officeAddress: input.officeAddress?.trim() || null,
          city: input.city?.trim() || null,
          state: input.state?.trim() || input.region?.trim() || null,
          country: input.country?.trim() || null,
          memberNumberPrefix:
            input.memberNumberPrefix?.trim() ||
            (cooperativeCodePrefix
              ? cooperativeMemberNumberPrefix(cooperativeCodePrefix)
              : null),
          startDate: input.startDate
            ? new Date(`${input.startDate}T00:00:00.000Z`)
            : null,
          region: input.state?.trim() || input.region?.trim() || null,
          currencyCode: input.currencyCode?.trim().toUpperCase() || "NGN",
          timezone: input.timezone?.trim() || "Africa/Lagos",
          status: "pending",
          dataClassification: input.qaSourceDomain ? "qa" : "live",
          qaMarkedAt: input.qaSourceDomain ? new Date() : null,
          qaSourceDomain: input.qaSourceDomain ?? null,
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
          cooperativeAccessCode:
            cooperativeCodePrefix && input.ownerMemberNumber?.trim()
              ? composeCooperativeAccessCode(
                  cooperativeCodePrefix,
                  input.ownerMemberNumber
                )
              : null,
        },
        select: { id: true },
      })

      await tx.membership.create({
        data: {
          tenantId: createdTenant.id,
          userId: owner.id,
          role: "tenant_admin",
          isDefault: true,
        },
        select: { id: true },
      })

      if (requiresLegalAcceptance) {
        await recordLegalAcceptanceInTransaction(tx, {
          tenantId: createdTenant.id,
          userId: owner.id,
          acknowledgement: input.legalAcknowledgement!,
          surface: "web_onboarding",
        })
      }

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
          select: { id: true },
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
        select: { id: true },
      })

      const operationProfile = await tx.tenantOperationProfile.create({
        data: { tenantId: createdTenant.id },
        select: { id: true },
      })
      await tx.tenantServiceSetting.createMany({
        data: tenantServiceKeys.map((serviceKey) => ({
          accessMode: defaultTenantServiceAccessModes[serviceKey],
          operationProfileId: operationProfile.id,
          serviceKey,
          tenantId: createdTenant.id,
        })),
      })
      await insertTenantLedgerAccounts(createdTenant.id, tx)

      return {
        ownerUserId: owner.id,
        tenant: createdTenant,
      }
    },
    {
      timeout: tenantBootstrapTransactionTimeoutMs,
    }
  )

  return {
    tenant: toTenantRecord(tenant),
    ownerUserId,
    primarySiteHostname,
    primaryDashboardHostname,
    // These rows were created in the transaction. Charges are configured later.
    onboarding: buildTenantOnboardingSnapshot({
      hasTenantProfile: true,
      hasPrimarySiteDomain: true,
      hasWorkspaceAccess: true,
      hasWorkspaceOwner: true,
      hasPolicyDefaults: true,
      hasChargeSetup: false,
      hasLedgerBootstrap: true,
      primarySiteHostname,
      primaryDashboardHostname,
    }),
  }
}
