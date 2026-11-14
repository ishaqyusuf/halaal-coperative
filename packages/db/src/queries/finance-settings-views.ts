import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { mobileAccessChargeCode } from "./cooperative-mobile-billing-constants"
import { excludeBroughtForwardLoanProductWhere } from "./loan-product-rules"
import { getTenantFinanceSetupLock } from "./migration"
import {
  defaultTenantBusinessProfitPolicy,
  defaultTenantSharePolicy,
  getTenantBusinessProfitPolicy,
  getTenantSharePolicy,
} from "./tenant-finance"

export type FinanceSettingsLoanProduct = {
  isActive: boolean
  loanType: "normal" | "quick"
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

export type FinanceSettingsOverview = Awaited<
  ReturnType<typeof getFinanceSettingsOverview>
>

function utcToday() {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

/**
 * Everything the Finance setup overview shows, one small read per area
 * (about 9 statements). It replaces the full finance setup, financing
 * workspace, migration state and per-member review (~42 statements).
 */
export async function getFinanceSettingsOverview(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return {
      businessPolicy: defaultTenantBusinessProfitPolicy,
      charges: { on: 0, total: 0 },
      currentCycleStatus: null as string | null,
      currentMonthlyShare: null as {
        amount: number
        valueType: "fixed_amount" | "percentage"
      } | null,
      lock: await getTenantFinanceSetupLock(tenantId),
      loanProducts: [] as FinanceSettingsLoanProduct[],
      sharePolicy: defaultTenantSharePolicy,
      startDate: null as string | null,
    }
  }

  const today = utcToday()
  const [
    tenant,
    sharePolicy,
    businessPolicy,
    latestShare,
    chargeCounts,
    loanProducts,
    currentCycle,
    lock,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      select: { startDate: true },
      where: { id: tenantId },
    }),
    getTenantSharePolicy(tenantId, prisma),
    getTenantBusinessProfitPolicy(tenantId, prisma),
    prisma.tenantShareStructureVersion.findFirst({
      orderBy: { effectiveFrom: "desc" },
      select: { amount: true, valueType: true },
      where: { effectiveFrom: { lte: today }, tenantId },
    }),
    prisma.chargeDefinition.groupBy({
      _count: { _all: true },
      by: ["isActive"],
      where: { code: { not: mobileAccessChargeCode }, tenantId },
    }),
    prisma.loanProduct.findMany({
      orderBy: [{ loanType: "asc" }, { isActive: "desc" }, { name: "asc" }],
      select: {
        isActive: true,
        loanType: true,
        maxSavingsMultiple: true,
        name: true,
        termMonths: true,
      },
      where: { ...excludeBroughtForwardLoanProductWhere, tenantId },
    }),
    prisma.financingCycle.findFirst({
      select: { status: true },
      where: {
        periodEnd: { gte: today },
        periodStart: { lte: today },
        tenantId,
      },
    }),
    getTenantFinanceSetupLock(tenantId, prisma),
  ])
  const charges = (
    chargeCounts as Array<{ _count: { _all: number }; isActive: boolean }>
  ).reduce(
    (sum, row) => ({
      on: sum.on + (row.isActive ? row._count._all : 0),
      total: sum.total + row._count._all,
    }),
    { on: 0, total: 0 }
  )
  // One product per loan type: the active one first, as on the Loan page.
  const productByType = new Map<string, FinanceSettingsLoanProduct>()

  for (const product of loanProducts as FinanceSettingsLoanProduct[]) {
    if (!productByType.has(product.loanType)) {
      productByType.set(product.loanType, {
        ...product,
        maxSavingsMultiple: Number(product.maxSavingsMultiple),
      })
    }
  }

  return {
    businessPolicy,
    charges,
    currentCycleStatus: (currentCycle?.status as string | undefined) ?? null,
    currentMonthlyShare: latestShare
      ? {
          amount: Number(latestShare.amount),
          valueType: (latestShare.valueType ?? "fixed_amount") as
            | "fixed_amount"
            | "percentage",
        }
      : null,
    lock,
    loanProducts: (["quick", "normal"] as const)
      .map((type) => productByType.get(type))
      .filter((product): product is FinanceSettingsLoanProduct =>
        Boolean(product)
      ),
    sharePolicy,
    startDate: tenant?.startDate
      ? (tenant.startDate as Date).toISOString().slice(0, 10)
      : null,
  }
}

/** The dated share amounts and share model for the Shares settings page. */
export async function getFinanceShareSettings(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return {
      lock: await getTenantFinanceSetupLock(tenantId),
      sharePolicy: defaultTenantSharePolicy,
      shareVersions: [] as FinanceShareVersionRow[],
      startDate: null as string | null,
    }
  }

  const [tenant, sharePolicy, versions, lock] = await Promise.all([
    prisma.tenant.findUnique({
      select: { startDate: true },
      where: { id: tenantId },
    }),
    getTenantSharePolicy(tenantId, prisma),
    prisma.tenantShareStructureVersion.findMany({
      orderBy: { effectiveFrom: "asc" },
      select: {
        amount: true,
        basis: true,
        effectiveFrom: true,
        id: true,
        notes: true,
        valueType: true,
      },
      where: { tenantId },
    }),
    getTenantFinanceSetupLock(tenantId, prisma),
  ])

  return {
    lock,
    sharePolicy,
    shareVersions: (versions as any[]).map(
      (version): FinanceShareVersionRow => ({
        amount: Number(version.amount),
        basis: version.basis ?? "after_charge_deductions",
        effectiveFrom: (version.effectiveFrom as Date)
          .toISOString()
          .slice(0, 10),
        id: version.id,
        notes: version.notes ?? null,
        valueType: version.valueType ?? "fixed_amount",
      })
    ),
    startDate: tenant?.startDate
      ? (tenant.startDate as Date).toISOString().slice(0, 10)
      : null,
  }
}

export type FinanceShareVersionRow = {
  amount: number
  basis: "after_charge_deductions"
  effectiveFrom: string
  id: string
  notes: string | null
  valueType: "fixed_amount" | "percentage"
}

/** Charge types with every dated amount, for the Charges settings page. */
export async function getFinanceChargeSettings(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return {
      charges: [] as any[],
      lock: await getTenantFinanceSetupLock(tenantId),
      startDate: null as string | null,
    }
  }

  const [tenant, charges, lock] = await Promise.all([
    prisma.tenant.findUnique({
      select: { startDate: true },
      where: { id: tenantId },
    }),
    prisma.chargeDefinition.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        appliesToLoanRequests: true,
        appliesToLoans: true,
        appliesToMembers: true,
        chargeFrequency: true,
        chargeValueType: true,
        code: true,
        id: true,
        isActive: true,
        kind: true,
        name: true,
        purpose: true,
        versions: {
          orderBy: { effectiveFrom: "asc" },
          select: {
            amount: true,
            chargeValueType: true,
            effectiveFrom: true,
            id: true,
            kind: true,
            notes: true,
          },
        },
      },
      where: { code: { not: mobileAccessChargeCode }, tenantId },
    }),
    getTenantFinanceSetupLock(tenantId, prisma),
  ])

  return {
    charges,
    lock,
    startDate: tenant?.startDate
      ? (tenant.startDate as Date).toISOString().slice(0, 10)
      : null,
  }
}
