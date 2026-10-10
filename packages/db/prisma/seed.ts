import { PrismaPg } from "@prisma/adapter-pg"
import { hashQaAcceleratorEvidence } from "@halaalvest/auth"
import { SUBSCRIPTION_PLAN_DEFINITIONS } from "@halaalvest/domain/subscriptions"
import { PrismaClient } from "../generated/prisma/client"
import { buildTenantSiteHostname } from "@halaalvest/utils"
import { normalizePostgresConnectionString } from "../src/postgres-connection"

const HALAALVEST_DATABASE_URL = process.env.HALAALVEST_DATABASE_URL
if (!HALAALVEST_DATABASE_URL) {
  throw new Error("HALAALVEST_DATABASE_URL is required for seeding")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizePostgresConnectionString(
      HALAALVEST_DATABASE_URL
    ),
  }),
})

async function seedQaAcceleratorFixtures() {
  const qaDomain = "safa.qa.test"
  const tenant = await prisma.tenant.upsert({
    where: { slug: "safa-qa" },
    update: {
      dataClassification: "qa",
      qaSourceDomain: qaDomain,
      status: "active",
    },
    create: {
      city: "Kaduna North",
      country: "Nigeria",
      currencyCode: "NGN",
      dataClassification: "qa",
      name: "Safa Multipurpose Cooperative",
      qaMarkedAt: new Date(),
      qaSourceDomain: qaDomain,
      region: "Kaduna",
      slug: "safa-qa",
      state: "Kaduna",
      status: "active",
      timezone: "Africa/Lagos",
    },
  })

  const standardDefinition = SUBSCRIPTION_PLAN_DEFINITIONS.standard
  const standardPlan = await prisma.subscriptionPlan.upsert({
    where: { code: "standard" },
    update: {},
    create: {
      activeMemberLimit: standardDefinition.activeMemberLimit,
      addonDefinitions: standardDefinition.addonDefinitions,
      availableAddonCodes: standardDefinition.availableAddonCodes,
      code: "standard",
      currencyCode: "NGN",
      description: standardDefinition.description,
      displayName: standardDefinition.displayName,
      entitlementDefinition: standardDefinition.entitlements,
      isPublic: true,
      monthlyPriceMax: standardDefinition.monthlyPrice.maximum,
      monthlyPriceMin: standardDefinition.monthlyPrice.minimum,
      passThroughCostDefinitions: standardDefinition.passThroughCostDefinitions,
      setupFeeMax: standardDefinition.setupFee.maximum,
      setupFeeMin: standardDefinition.setupFee.minimum,
      sortOrder: standardDefinition.sortOrder,
    },
  })
  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: { planId: standardPlan.id, status: "manual" },
    create: {
      planId: standardPlan.id,
      source: "manual",
      sourceState: { initializedBy: "qa_accelerator_seed" },
      status: "manual",
      tenantId: tenant.id,
    },
  })

  const identities = [
    {
      email: `admin@${qaDomain}`,
      fullName: "Safa Cooperative Admin",
      role: "tenant_admin" as const,
    },
    {
      email: `zainab@${qaDomain}`,
      fullName: "Zainab Musa",
      role: "member" as const,
    },
    {
      email: `finance@${qaDomain}`,
      fullName: "Hauwa Usman",
      role: "finance_officer" as const,
    },
  ]
  let qaAdminUserId: string | null = null
  for (const identity of identities) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { email: identity.email, tenantId: tenant.id } },
      update: { deletedAt: null, fullName: identity.fullName },
      create: {
        email: identity.email,
        fullName: identity.fullName,
        tenantId: tenant.id,
      },
    })
    if (identity.role === "tenant_admin") qaAdminUserId = user.id
    await prisma.membership.upsert({
      where: {
        tenantId_userId_role: {
          role: identity.role,
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: { isDefault: true },
      create: {
        isDefault: true,
        role: identity.role,
        tenantId: tenant.id,
        userId: user.id,
      },
    })
    if (identity.role === "member") {
      await prisma.member.upsert({
        where: { userId: user.id },
        update: {
          email: identity.email,
          fullName: identity.fullName,
          status: "active",
        },
        create: {
          email: identity.email,
          fullName: identity.fullName,
          joinedAt: new Date("2026-08-01T00:00:00.000Z"),
          memberNumber: "KAD-0042",
          memberType: "individual",
          status: "active",
          tenantId: tenant.id,
          userId: user.id,
        },
      })
    }
  }
  const configuredCredential =
    process.env.QA_ACCELERATOR_TESTER_CREDENTIAL?.trim()
  if (configuredCredential && qaAdminUserId) {
    const credentialDigest = hashQaAcceleratorEvidence(
      `qa-credential:${configuredCredential}`
    )
    await prisma.qaTesterCredential.upsert({
      where: { credentialDigest },
      update: {
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        failedAttemptCount: 0,
        lockedUntil: null,
        qaDomain,
        revokedAt: null,
        testerLabel: "Configured local QA tester",
      },
      create: {
        createdByUserId: qaAdminUserId,
        credentialDigest,
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        qaDomain,
        testerLabel: "Configured local QA tester",
      },
    })
  }
  console.log(`  QA accelerator workspace: ${tenant.id} (${qaDomain})`)
}

async function main() {
  console.log("Seeding database...")

  // Tenants
  const amanah = await prisma.tenant.upsert({
    where: { slug: "amanah" },
    update: {
      city: "Lagos Island",
      state: "Lagos",
      country: "Nigeria",
      region: "Lagos",
    },
    create: {
      slug: "amanah",
      name: "Amanah Staff Thrift Cooperative",
      city: "Lagos Island",
      state: "Lagos",
      country: "Nigeria",
      region: "Lagos",
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      status: "active",
      isDirectDeductionEnabled: true,
    },
  })

  const barakah = await prisma.tenant.upsert({
    where: { slug: "barakah" },
    update: {
      city: "Abuja",
      state: "FCT",
      country: "Nigeria",
      region: "FCT",
    },
    create: {
      slug: "barakah",
      name: "Barakah Multipurpose Cooperative",
      city: "Abuja",
      state: "FCT",
      country: "Nigeria",
      region: "FCT",
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      status: "active",
      isDirectDeductionEnabled: false,
    },
  })

  console.log(`  Tenants: ${amanah.id}, ${barakah.id}`)

  // Tenant Policies
  await prisma.tenantPolicy.upsert({
    where: { tenantId: amanah.id },
    update: {},
    create: {
      tenantId: amanah.id,
      loanEligibilityMultiple: 2.0,
      quickLoanTermMonths: 3,
      normalLoanTermMonths: 18,
      reserveBufferAmount: 450000,
      financingCapacityBasis: "projected_monthly_commitments",
      quickLoanAllocationPercentage: 30,
      normalLoanAllocationPercentage: 70,
      loanIntakeReservationMode: "submitted_request_amount",
      disbursementRequiresDeployableFunds: true,
      monthlyLevyAmount: 500,
      requiresDualLoanApproval: true,
    },
  })

  await prisma.tenantPolicy.upsert({
    where: { tenantId: barakah.id },
    update: {},
    create: {
      tenantId: barakah.id,
      loanEligibilityMultiple: 2.0,
      quickLoanTermMonths: 3,
      normalLoanTermMonths: 18,
      reserveBufferAmount: 200000,
      financingCapacityBasis: "projected_monthly_commitments",
      quickLoanAllocationPercentage: 30,
      normalLoanAllocationPercentage: 70,
      loanIntakeReservationMode: "submitted_request_amount",
      disbursementRequiresDeployableFunds: true,
      monthlyLevyAmount: 300,
      requiresDualLoanApproval: false,
    },
  })

  console.log("  Tenant policies created")

  // Tenant Domains
  const domainData = [
    {
      tenantId: amanah.id,
      hostname: buildTenantSiteHostname("amanah"),
      kind: "site" as const,
      isPrimary: true,
    },
    {
      tenantId: barakah.id,
      hostname: buildTenantSiteHostname("barakah"),
      kind: "site" as const,
      isPrimary: true,
    },
  ]

  for (const domain of domainData) {
    await prisma.tenantDomain.upsert({
      where: { hostname: domain.hostname },
      update: {},
      create: domain,
    })
  }

  console.log(`  Domains: ${domainData.length} created`)

  // Users
  const platformOwner = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: amanah.id, email: "owner@halaalvest.local" },
    },
    update: {},
    create: {
      tenantId: amanah.id,
      email: "owner@halaalvest.local",
      fullName: "Platform Owner",
      isPlatformOwner: true,
    },
  })

  const amanahAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: amanah.id, email: "admin@amanah.local" },
    },
    update: {},
    create: {
      tenantId: amanah.id,
      email: "admin@amanah.local",
      fullName: "Amanah Admin",
      isPlatformOwner: false,
    },
  })

  const barakahFinance = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: barakah.id, email: "finance@barakah.local" },
    },
    update: {},
    create: {
      tenantId: barakah.id,
      email: "finance@barakah.local",
      fullName: "Barakah Finance",
      isPlatformOwner: false,
    },
  })

  console.log(
    `  Users: ${platformOwner.id}, ${amanahAdmin.id}, ${barakahFinance.id}`
  )

  // Memberships
  await prisma.membership.upsert({
    where: {
      tenantId_userId_role: {
        tenantId: amanah.id,
        userId: platformOwner.id,
        role: "super_admin",
      },
    },
    update: {},
    create: {
      tenantId: amanah.id,
      userId: platformOwner.id,
      role: "super_admin",
      isDefault: true,
    },
  })

  await prisma.membership.upsert({
    where: {
      tenantId_userId_role: {
        tenantId: amanah.id,
        userId: amanahAdmin.id,
        role: "tenant_admin",
      },
    },
    update: {},
    create: {
      tenantId: amanah.id,
      userId: amanahAdmin.id,
      role: "tenant_admin",
      isDefault: true,
    },
  })

  await prisma.membership.upsert({
    where: {
      tenantId_userId_role: {
        tenantId: barakah.id,
        userId: barakahFinance.id,
        role: "finance_officer",
      },
    },
    update: {},
    create: {
      tenantId: barakah.id,
      userId: barakahFinance.id,
      role: "finance_officer",
      isDefault: true,
    },
  })

  console.log("  Memberships created")

  // Loan Products
  await prisma.loanProduct.upsert({
    where: { tenantId_name: { tenantId: amanah.id, name: "Quick Loan" } },
    update: {},
    create: {
      tenantId: amanah.id,
      name: "Quick Loan",
      loanType: "quick",
      termMonths: 3,
      maxSavingsMultiple: 1.0,
      isActive: true,
    },
  })

  await prisma.loanProduct.upsert({
    where: { tenantId_name: { tenantId: amanah.id, name: "Normal Loan" } },
    update: {},
    create: {
      tenantId: amanah.id,
      name: "Normal Loan",
      loanType: "normal",
      termMonths: 18,
      maxSavingsMultiple: 2.0,
      isActive: true,
    },
  })

  await prisma.loanProduct.upsert({
    where: { tenantId_name: { tenantId: barakah.id, name: "Quick Loan" } },
    update: {},
    create: {
      tenantId: barakah.id,
      name: "Quick Loan",
      loanType: "quick",
      termMonths: 3,
      maxSavingsMultiple: 1.0,
      isActive: true,
    },
  })

  await prisma.loanProduct.upsert({
    where: { tenantId_name: { tenantId: barakah.id, name: "Normal Loan" } },
    update: {},
    create: {
      tenantId: barakah.id,
      name: "Normal Loan",
      loanType: "normal",
      termMonths: 18,
      maxSavingsMultiple: 2.0,
      isActive: true,
    },
  })

  console.log("  Loan products created")

  // Ledger Accounts (Chart of Accounts per tenant)
  const chartOfAccounts = [
    {
      code: "1000",
      name: "Member Savings",
      accountType: "liability" as const,
      isSystem: true,
    },
    {
      code: "1100",
      name: "Loan Receivable",
      accountType: "asset" as const,
      isSystem: true,
    },
    {
      code: "2000",
      name: "Cash / Bank",
      accountType: "asset" as const,
      isSystem: true,
    },
    {
      code: "3000",
      name: "Charge Income",
      accountType: "income" as const,
      isSystem: true,
    },
    {
      code: "3100",
      name: "Levy Income",
      accountType: "income" as const,
      isSystem: true,
    },
    {
      code: "3200",
      name: "Member Share Capital",
      accountType: "equity" as const,
      isSystem: true,
    },
    {
      code: "4000",
      name: "Cooperative Equity",
      accountType: "equity" as const,
      isSystem: true,
    },
  ]

  for (const tenant of [amanah, barakah]) {
    for (const account of chartOfAccounts) {
      await prisma.ledgerAccount.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: account.code } },
        update: {},
        create: {
          tenantId: tenant.id,
          ...account,
        },
      })
    }
  }

  console.log("  Ledger accounts created")

  // Charge Definitions
  await prisma.chargeDefinition.upsert({
    where: { tenantId_code: { tenantId: amanah.id, code: "monthly-levy" } },
    update: {},
    create: {
      tenantId: amanah.id,
      name: "Monthly Levy",
      code: "monthly-levy",
      kind: "fixed",
      amount: 500,
      isMonthlyLevy: true,
      appliesToMembers: true,
      appliesToLoanRequests: false,
      appliesToLoans: false,
      isActive: true,
    },
  })

  await prisma.chargeDefinition.upsert({
    where: { tenantId_code: { tenantId: barakah.id, code: "monthly-levy" } },
    update: {},
    create: {
      tenantId: barakah.id,
      name: "Monthly Levy",
      code: "monthly-levy",
      kind: "fixed",
      amount: 300,
      isMonthlyLevy: true,
      appliesToMembers: true,
      appliesToLoanRequests: false,
      appliesToLoans: false,
      isActive: true,
    },
  })

  console.log("  Charge definitions created")

  await seedQaAcceleratorFixtures()

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
