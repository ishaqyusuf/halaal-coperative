import type {
  FinancingCycleStatus,
  LoanType,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  getTenantFinancingPolicySnapshot,
  openMonthlyFinancingCycle,
  previewMonthlyFinancingCycle,
  type FinancingPolicySnapshot,
} from "./financing-cycles"
import {
  DEFAULT_LOAN_PRODUCT_NAMES,
  isBroughtForwardLoanProduct,
} from "./loan-product-rules"

/**
 * Go-live financing readiness (ADR-20261113-go-live-financing-readiness).
 * Going live creates the default Quick and Normal products when a type has
 * none, and opens this month's cycle when the admin asks and there is
 * capacity to snapshot.
 */

const LOAN_TYPES = ["quick", "normal"] as const satisfies readonly LoanType[]

export type GoLiveLoanProductPlan = {
  /** A product of this type already exists (active or not). */
  exists: boolean
  isActive: boolean
  loanType: LoanType
  maxSavingsMultiple: number
  name: string
  termMonths: number
  /** Go-live will create this product. */
  willCreate: boolean
}

export type GoLiveFinancingReadiness = {
  cycle: {
    /** Go-live may open the cycle: none exists yet and capacity is above 0. */
    canOpenAtGoLive: boolean
    periodEnd: string
    periodStart: string
    projectedCommitmentAmount: number
    reserveBufferAmount: number
    status: FinancingCycleStatus | null
    totalCapacityAmount: number
  }
  products: Record<"normal" | "quick", GoLiveLoanProductPlan>
}

export type GoLiveFinancingProvisioning = {
  createdProducts: Array<{ id: string; loanType: LoanType; name: string }>
  cycle:
    | { opened: true; financingCycleId: string }
    | {
        opened: false
        reason:
          | "already_exists"
          | "error"
          | "no_capacity"
          | "not_requested"
          | "unsupported"
        message?: string
      }
}

type ExistingProductRow = {
  isActive: boolean
  loanType: LoanType
  maxSavingsMultiple: unknown
  name: string
  termMonths: number
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

/**
 * Which default product each loan type gets. The brought-forward opening
 * product never counts, and an inactive product counts as a deliberate
 * choice, so go-live creates a product only for a type with none at all.
 */
export function planGoLiveLoanProducts(
  existingProducts: ExistingProductRow[],
  policy: Pick<
    FinancingPolicySnapshot,
    "loanEligibilityMultiple" | "normalLoanTermMonths" | "quickLoanTermMonths"
  >
): Record<"normal" | "quick", GoLiveLoanProductPlan> {
  const products = existingProducts.filter(
    (product) => !isBroughtForwardLoanProduct(product)
  )
  const usedNames = new Set(existingProducts.map((product) => product.name))

  const plan = (loanType: "normal" | "quick"): GoLiveLoanProductPlan => {
    const ofType = products.filter((product) => product.loanType === loanType)
    const current =
      ofType.find((product) => product.isActive) ?? ofType[0] ?? null

    if (current) {
      return {
        exists: true,
        isActive: current.isActive,
        loanType,
        maxSavingsMultiple: Number(current.maxSavingsMultiple),
        name: current.name,
        termMonths: current.termMonths,
        willCreate: false,
      }
    }

    const name = DEFAULT_LOAN_PRODUCT_NAMES[loanType]

    return {
      exists: false,
      isActive: true,
      loanType,
      maxSavingsMultiple: policy.loanEligibilityMultiple,
      name,
      termMonths:
        loanType === "quick"
          ? policy.quickLoanTermMonths
          : policy.normalLoanTermMonths,
      // A same-named product of the other type would break the unique name.
      willCreate: !usedNames.has(name),
    }
  }

  return { normal: plan("normal"), quick: plan("quick") }
}

async function listTenantLoanProducts(tenantId: string, prisma: PrismaClient) {
  return prisma.loanProduct.findMany({
    select: {
      isActive: true,
      loanType: true,
      maxSavingsMultiple: true,
      name: true,
      termMonths: true,
    },
    where: { tenantId },
  })
}

/** What going live will do for financing, shown on the Go live checklist. */
export async function getGoLiveFinancingReadiness(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<GoLiveFinancingReadiness> {
  const prisma = getPrisma(prismaOverride)
  const [products, policy, preview] = await Promise.all([
    listTenantLoanProducts(tenantId, prisma),
    getTenantFinancingPolicySnapshot(tenantId, prisma),
    previewMonthlyFinancingCycle({ tenantId }, prisma),
  ])

  return {
    cycle: {
      canOpenAtGoLive:
        !preview.existingCycle && preview.totalCapacityAmount > 0,
      periodEnd: toIsoDate(preview.periodEnd),
      periodStart: toIsoDate(preview.periodStart),
      projectedCommitmentAmount: preview.projectedCommitmentAmount,
      reserveBufferAmount: preview.reserveBufferAmount,
      status: preview.existingCycle?.status ?? null,
      totalCapacityAmount: preview.totalCapacityAmount,
    },
    products: planGoLiveLoanProducts(products, policy),
  }
}

/** Creates the default Quick/Normal products a type is missing. Audited. */
export async function ensureDefaultLoanProducts(
  input: { actorUserId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [products, policy] = await Promise.all([
    listTenantLoanProducts(input.tenantId, prisma),
    getTenantFinancingPolicySnapshot(input.tenantId, prisma),
  ])
  const plan = planGoLiveLoanProducts(products, policy)
  const created: GoLiveFinancingProvisioning["createdProducts"] = []

  for (const loanType of LOAN_TYPES) {
    const product = plan[loanType]
    if (!product.willCreate) continue

    const row = await prisma.$transaction(async (tx) => {
      const createdRow = await tx.loanProduct.create({
        data: {
          isActive: true,
          loanType,
          maxSavingsMultiple: product.maxSavingsMultiple,
          name: product.name,
          tenantId: input.tenantId,
          termMonths: product.termMonths,
        },
      })

      await tx.auditLog.create({
        data: {
          action: "loan_product.provisioned_at_go_live",
          actorType: "user",
          actorUserId: input.actorUserId,
          entityId: createdRow.id,
          entityType: "LoanProduct",
          metadata: {
            loanType,
            maxSavingsMultiple: product.maxSavingsMultiple,
            name: product.name,
            termMonths: product.termMonths,
          },
          occurredAt: new Date(),
          tenantId: input.tenantId,
        },
      })

      return createdRow
    })

    created.push({ id: row.id, loanType, name: row.name })
  }

  return created
}

/**
 * Financing set-up that runs when a cooperative goes live. Never throws for
 * an expected problem: the result says what happened so the go-live audit
 * can record it, and `/loans` and Finance settings show the fix.
 */
export async function provisionGoLiveFinancing(
  input: {
    actorUserId: string
    openFinancingCycle: boolean
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<GoLiveFinancingProvisioning> {
  const prisma = getPrisma(prismaOverride) as any
  const supportsProducts =
    typeof prisma.loanProduct?.findMany === "function" &&
    typeof prisma.loanProduct?.create === "function"
  const supportsCycles =
    typeof prisma.financingCycle?.findUnique === "function" &&
    typeof prisma.contributionPlan?.aggregate === "function"

  const createdProducts = supportsProducts
    ? await ensureDefaultLoanProducts(input, prisma)
    : []

  if (!input.openFinancingCycle) {
    return {
      createdProducts,
      cycle: { opened: false, reason: "not_requested" },
    }
  }

  if (!supportsCycles) {
    return { createdProducts, cycle: { opened: false, reason: "unsupported" } }
  }

  const preview = await previewMonthlyFinancingCycle(
    { tenantId: input.tenantId },
    prisma
  )

  if (preview.existingCycle) {
    return {
      createdProducts,
      cycle: { opened: false, reason: "already_exists" },
    }
  }

  // Opening snapshots capacity for the whole month (ADR-029); never freeze ₦0.
  if (preview.totalCapacityAmount <= 0) {
    return { createdProducts, cycle: { opened: false, reason: "no_capacity" } }
  }

  try {
    const cycle = await openMonthlyFinancingCycle(
      {
        actorUserId: input.actorUserId,
        statusNote: "Opened at go-live.",
        tenantId: input.tenantId,
      },
      prisma
    )

    return {
      createdProducts,
      cycle: { financingCycleId: cycle.id, opened: true },
    }
  } catch (error) {
    if (!(error instanceof ExpectedQueryError)) throw error

    return {
      createdProducts,
      cycle: { message: error.message, opened: false, reason: "error" },
    }
  }
}

export type GoLiveOwnerMember = {
  fullName: string
  id: string
  kycStatus: "not_started" | "pending" | "rejected" | "verified"
}

/**
 * The signed-in admin's own member record ("Your own record" in One Path),
 * matched by user id and then by email, as step 10 does. Go live requires
 * its KYC to be verified so the owner can borrow and guarantee on day one.
 */
export async function getGoLiveOwnerMember(
  input: { email?: string | null; tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<GoLiveOwnerMember | null> {
  const prisma = getPrisma(prismaOverride)
  const select = { fullName: true, id: true, kycStatus: true } as const
  const byUser = await prisma.member.findFirst({
    select,
    where: { tenantId: input.tenantId, userId: input.userId },
  })

  if (byUser || !input.email) return byUser

  return prisma.member.findFirst({
    orderBy: { createdAt: "asc" },
    select,
    where: { tenantId: input.tenantId, user: { email: input.email } },
  })
}
