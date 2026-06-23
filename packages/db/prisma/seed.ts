import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { buildTenantSiteHostname } from "@halaalvest/utils"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for seeding")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
})

async function main() {
  console.log("Seeding database...")

  // Tenants
  const amanah = await prisma.tenant.upsert({
    where: { slug: "amanah" },
    update: {},
    create: {
      slug: "amanah",
      name: "Amanah Staff Thrift Cooperative",
      region: "Lagos",
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      status: "active",
      isDirectDeductionEnabled: true,
    },
  })

  const barakah = await prisma.tenant.upsert({
    where: { slug: "barakah" },
    update: {},
    create: {
      slug: "barakah",
      name: "Barakah Multipurpose Cooperative",
      region: "Abuja",
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
      monthlyLevyAmount: 300,
      requiresDualLoanApproval: false,
    },
  })

  console.log("  Tenant policies created")

  // Tenant Domains
  const domainData = [
    { tenantId: amanah.id, hostname: buildTenantSiteHostname("amanah"), kind: "site" as const, isPrimary: true },
    { tenantId: barakah.id, hostname: buildTenantSiteHostname("barakah"), kind: "site" as const, isPrimary: true },
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
    where: { tenantId_email: { tenantId: amanah.id, email: "owner@halaalvest.local" } },
    update: {},
    create: {
      tenantId: amanah.id,
      email: "owner@halaalvest.local",
      fullName: "Platform Owner",
      isPlatformOwner: true,
    },
  })

  const amanahAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: amanah.id, email: "admin@amanah.local" } },
    update: {},
    create: {
      tenantId: amanah.id,
      email: "admin@amanah.local",
      fullName: "Amanah Admin",
      isPlatformOwner: false,
    },
  })

  const barakahFinance = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: barakah.id, email: "finance@barakah.local" } },
    update: {},
    create: {
      tenantId: barakah.id,
      email: "finance@barakah.local",
      fullName: "Barakah Finance",
      isPlatformOwner: false,
    },
  })

  console.log(`  Users: ${platformOwner.id}, ${amanahAdmin.id}, ${barakahFinance.id}`)

  // Memberships
  await prisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: amanah.id, userId: platformOwner.id, role: "super_admin" } },
    update: {},
    create: {
      tenantId: amanah.id,
      userId: platformOwner.id,
      role: "super_admin",
      isDefault: true,
    },
  })

  await prisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: amanah.id, userId: amanahAdmin.id, role: "tenant_admin" } },
    update: {},
    create: {
      tenantId: amanah.id,
      userId: amanahAdmin.id,
      role: "tenant_admin",
      isDefault: true,
    },
  })

  await prisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: barakah.id, userId: barakahFinance.id, role: "finance_officer" } },
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
    { code: "1000", name: "Member Savings", accountType: "liability" as const, isSystem: true },
    { code: "1100", name: "Loan Receivable", accountType: "asset" as const, isSystem: true },
    { code: "2000", name: "Cash / Bank", accountType: "asset" as const, isSystem: true },
    { code: "3000", name: "Charge Income", accountType: "income" as const, isSystem: true },
    { code: "3100", name: "Levy Income", accountType: "income" as const, isSystem: true },
    { code: "3200", name: "Member Share Capital", accountType: "equity" as const, isSystem: true },
    { code: "4000", name: "Cooperative Equity", accountType: "equity" as const, isSystem: true },
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
