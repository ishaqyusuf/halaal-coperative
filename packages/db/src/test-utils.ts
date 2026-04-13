import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client.js"

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/amanah_cooperative_test"

let testPrisma: PrismaClient | null = null

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
    })
  }
  return testPrisma
}

export async function disconnectTestPrisma() {
  if (testPrisma) {
    await testPrisma.$disconnect()
    testPrisma = null
  }
}

const TRUNCATE_ORDER = [
  "audit_logs",
  "ledger_entries",
  "ledger_transactions",
  "ledger_accounts",
  "dividend_allocations",
  "dividend_periods",
  "offline_sync_events",
  "repayments",
  "repayment_schedule_items",
  "loans",
  "loan_approvals",
  "loan_requests",
  "loan_products",
  "charge_applications",
  "charge_definitions",
  "contributions",
  "contribution_plans",
  "deduction_sources",
  "members",
  "memberships",
  "users",
  "tenant_domains",
  "tenant_policies",
  "tenants",
] as const

export async function cleanDatabase() {
  const prisma = getTestPrisma()
  for (const table of TRUNCATE_ORDER) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}

export async function seedTestTenant() {
  const prisma = getTestPrisma()

  const tenant = await prisma.tenant.create({
    data: {
      slug: "test-coop",
      name: "Test Cooperative",
      region: "Lagos",
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      status: "active",
    },
  })

  const policy = await prisma.tenantPolicy.create({
    data: {
      tenantId: tenant.id,
      loanEligibilityMultiple: 2.0,
      quickLoanTermMonths: 3,
      normalLoanTermMonths: 18,
      reserveBufferAmount: 100000,
      monthlyLevyAmount: 500,
      requiresDualLoanApproval: false,
    },
  })

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@test-coop.local",
      fullName: "Test Admin",
      isPlatformOwner: false,
    },
  })

  const adminMembership = await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: "tenant_admin",
      isDefault: true,
    },
  })

  const financeUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "finance@test-coop.local",
      fullName: "Test Finance Officer",
      isPlatformOwner: false,
    },
  })

  const financeMembership = await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      userId: financeUser.id,
      role: "finance_officer",
      isDefault: true,
    },
  })

  // Ledger accounts
  const chartOfAccounts = [
    { code: "1000", name: "Member Savings", accountType: "liability" as const, isSystem: true },
    { code: "1100", name: "Loan Receivable", accountType: "asset" as const, isSystem: true },
    { code: "2000", name: "Cash / Bank", accountType: "asset" as const, isSystem: true },
    { code: "3000", name: "Charge Income", accountType: "income" as const, isSystem: true },
    { code: "3100", name: "Levy Income", accountType: "income" as const, isSystem: true },
    { code: "4000", name: "Cooperative Equity", accountType: "equity" as const, isSystem: true },
  ]

  const ledgerAccounts: Record<string, string> = {}
  for (const account of chartOfAccounts) {
    const created = await prisma.ledgerAccount.create({
      data: { tenantId: tenant.id, ...account },
    })
    ledgerAccounts[account.code] = created.id
  }

  // Loan products
  const quickLoan = await prisma.loanProduct.create({
    data: {
      tenantId: tenant.id,
      name: "Quick Loan",
      loanType: "quick",
      termMonths: 3,
      maxSavingsMultiple: 1.0,
      isActive: true,
    },
  })

  const normalLoan = await prisma.loanProduct.create({
    data: {
      tenantId: tenant.id,
      name: "Normal Loan",
      loanType: "normal",
      termMonths: 18,
      maxSavingsMultiple: 2.0,
      isActive: true,
    },
  })

  return {
    tenant,
    policy,
    adminUser,
    adminMembership,
    financeUser,
    financeMembership,
    ledgerAccounts,
    quickLoan,
    normalLoan,
  }
}
