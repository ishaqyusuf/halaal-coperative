import { describe, expect, test } from "bun:test"
import { getTenantFinancingSettingsWorkspace } from "./financing-cycles"
import {
  getGoLiveFinancingReadiness,
  planGoLiveLoanProducts,
  provisionGoLiveFinancing,
} from "./go-live-financing"
import { listLoanProducts, quoteLoanRequest } from "./loans"
import { BROUGHT_FORWARD_LOAN_PRODUCT_NAME } from "./loan-product-rules"

const policy = {
  loanEligibilityMultiple: 2,
  normalLoanTermMonths: 18,
  quickLoanTermMonths: 3,
}

type ProductRow = {
  code?: string | null
  id: string
  isActive: boolean
  loanType: "normal" | "quick"
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

type WhereClause = {
  NOT?: { name?: string }
  id?: string
  isActive?: boolean
  loanType?: string
  name?: string
  tenantId?: string
}

function matchesProduct(product: ProductRow, where: WhereClause = {}) {
  if (where.NOT?.name !== undefined && product.name === where.NOT.name) {
    return false
  }
  if (where.id !== undefined && product.id !== where.id) return false
  if (where.isActive !== undefined && product.isActive !== where.isActive) {
    return false
  }
  if (where.loanType !== undefined && product.loanType !== where.loanType) {
    return false
  }

  return true
}

function createFinancingPrismaStub(input: {
  existingCycle?: { id: string; status: "open" | "paused" | "closed" } | null
  products?: ProductRow[]
  projectedCommitmentAmount?: number
  reserveBufferAmount?: number
}) {
  const products = [...(input.products ?? [])]
  const productCreates: Array<{ data: Omit<ProductRow, "id"> }> = []
  const cycleCreates: unknown[] = []
  const auditActions: string[] = []
  const policyRow = {
    id: "policy-1",
    loanEligibilityMultiple: 2,
    normalLoanAllocationPercentage: 70,
    normalLoanTermMonths: 18,
    quickLoanAllocationPercentage: 30,
    quickLoanTermMonths: 3,
    reserveBufferAmount: input.reserveBufferAmount ?? 0,
  }

  const client = {
    auditLog: {
      create: async ({ data }: { data: { action: string } }) => {
        auditActions.push(data.action)

        return data
      },
    },
    contribution: {
      aggregate: async () => ({ _sum: { amount: 0 } }),
    },
    contributionPlan: {
      aggregate: async () => ({
        _sum: { amount: input.projectedCommitmentAmount ?? 0 },
      }),
    },
    financingCycle: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        cycleCreates.push(data)

        return { id: "cycle-1", ...data }
      },
      findUnique: async () => input.existingCycle ?? null,
    },
    loan: { findMany: async () => [] },
    loanProduct: {
      create: async ({ data }: { data: Omit<ProductRow, "id"> }) => {
        productCreates.push({ data })
        const row = { ...data, id: `product-${products.length + 1}` }
        products.push(row)

        return row
      },
      findFirst: async ({ where }: { where: WhereClause }) =>
        products.find((product) => matchesProduct(product, where)) ?? null,
      findMany: async ({ where }: { where?: WhereClause } = {}) =>
        products.filter((product) => matchesProduct(product, where)),
    },
    loanRequest: { findMany: async () => [] },
    tenantPolicy: {
      findUnique: async () => policyRow,
    },
  }

  return {
    ...client,
    $transaction: async (callback: (tx: typeof client) => unknown) =>
      callback(client),
    auditActions,
    cycleCreates,
    productCreates,
  }
}

const broughtForwardProduct: ProductRow = {
  id: "product-bf",
  isActive: true,
  loanType: "normal",
  maxSavingsMultiple: 2,
  name: BROUGHT_FORWARD_LOAN_PRODUCT_NAME,
  termMonths: 24,
}

describe("go-live loan product plan", () => {
  test("creates Quick and Normal from policy terms when none exist", () => {
    const plan = planGoLiveLoanProducts([], policy)

    expect(plan.quick).toMatchObject({
      exists: false,
      maxSavingsMultiple: 2,
      name: "Quick financing",
      termMonths: 3,
      willCreate: true,
    })
    expect(plan.normal).toMatchObject({
      name: "Normal financing",
      termMonths: 18,
      willCreate: true,
    })
  })

  test("ignores the brought-forward opening product", () => {
    const plan = planGoLiveLoanProducts([broughtForwardProduct], policy)

    expect(plan.normal.exists).toBe(false)
    expect(plan.normal.willCreate).toBe(true)
  })

  test("keeps an existing product, even one that was turned off", () => {
    const plan = planGoLiveLoanProducts(
      [
        {
          isActive: false,
          loanType: "quick",
          maxSavingsMultiple: 1.5,
          name: "Emergency",
          termMonths: 2,
        },
      ],
      policy
    )

    expect(plan.quick).toMatchObject({
      exists: true,
      isActive: false,
      name: "Emergency",
      willCreate: false,
    })
  })

  test("does not create a product whose default name is already used", () => {
    const plan = planGoLiveLoanProducts(
      [
        {
          isActive: true,
          loanType: "normal",
          maxSavingsMultiple: 2,
          name: "Quick financing",
          termMonths: 6,
        },
      ],
      policy
    )

    expect(plan.quick.willCreate).toBe(false)
    expect(plan.normal.exists).toBe(true)
  })
})

describe("go-live financing provisioning", () => {
  test("creates missing products and opens the cycle when asked and there is capacity", async () => {
    const prisma = createFinancingPrismaStub({
      products: [broughtForwardProduct],
      projectedCommitmentAmount: 120_000,
    })

    const result = await provisionGoLiveFinancing(
      { actorUserId: "user-1", openFinancingCycle: true, tenantId: "tenant-1" },
      prisma as never
    )

    expect(result.createdProducts.map((product) => product.name)).toEqual([
      "Quick financing",
      "Normal financing",
    ])
    expect(result.cycle).toEqual({ financingCycleId: "cycle-1", opened: true })
    expect(prisma.cycleCreates[0]).toMatchObject({
      status: "open",
      statusNote: "Opened at go-live.",
      totalCapacityAmount: 120_000,
    })
    expect(prisma.auditActions).toEqual([
      "loan_product.provisioned_at_go_live",
      "loan_product.provisioned_at_go_live",
      "financing_cycle.opened",
    ])
  })

  test("never opens a ₦0 cycle, which would freeze the month", async () => {
    const prisma = createFinancingPrismaStub({
      projectedCommitmentAmount: 100_000,
      reserveBufferAmount: 450_000,
    })

    const result = await provisionGoLiveFinancing(
      { actorUserId: "user-1", openFinancingCycle: true, tenantId: "tenant-1" },
      prisma as never
    )

    expect(result.cycle).toEqual({ opened: false, reason: "no_capacity" })
    expect(prisma.cycleCreates).toHaveLength(0)
    expect(result.createdProducts).toHaveLength(2)
  })

  test("leaves the cycle alone when not asked or when one exists", async () => {
    const notAsked = createFinancingPrismaStub({
      projectedCommitmentAmount: 50_000,
    })
    const existing = createFinancingPrismaStub({
      existingCycle: { id: "cycle-9", status: "paused" },
      projectedCommitmentAmount: 50_000,
    })

    expect(
      (
        await provisionGoLiveFinancing(
          {
            actorUserId: "user-1",
            openFinancingCycle: false,
            tenantId: "tenant-1",
          },
          notAsked as never
        )
      ).cycle
    ).toEqual({ opened: false, reason: "not_requested" })
    expect(
      (
        await provisionGoLiveFinancing(
          {
            actorUserId: "user-1",
            openFinancingCycle: true,
            tenantId: "tenant-1",
          },
          existing as never
        )
      ).cycle
    ).toEqual({ opened: false, reason: "already_exists" })
    expect(notAsked.cycleCreates).toHaveLength(0)
    expect(existing.cycleCreates).toHaveLength(0)
  })

  test("is idempotent for products", async () => {
    const prisma = createFinancingPrismaStub({})

    await provisionGoLiveFinancing(
      {
        actorUserId: "user-1",
        openFinancingCycle: false,
        tenantId: "tenant-1",
      },
      prisma as never
    )
    const second = await provisionGoLiveFinancing(
      {
        actorUserId: "user-1",
        openFinancingCycle: false,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(second.createdProducts).toHaveLength(0)
    expect(prisma.productCreates).toHaveLength(2)
  })

  test("readiness previews products and whether the cycle can open", async () => {
    const readiness = await getGoLiveFinancingReadiness(
      "tenant-1",
      createFinancingPrismaStub({
        products: [broughtForwardProduct],
        projectedCommitmentAmount: 0,
      }) as never
    )

    expect(readiness.products.normal.willCreate).toBe(true)
    expect(readiness.cycle).toMatchObject({
      canOpenAtGoLive: false,
      status: null,
      totalCapacityAmount: 0,
    })
    expect(readiness.cycle.periodStart).toMatch(/^\d{4}-\d{2}-01$/)
  })
})

describe("brought-forward opening product", () => {
  test("is never offered for new requests", async () => {
    const prisma = createFinancingPrismaStub({
      products: [
        broughtForwardProduct,
        {
          id: "product-quick",
          isActive: true,
          loanType: "quick",
          maxSavingsMultiple: 2,
          name: "Quick financing",
          termMonths: 3,
        },
      ],
    })

    const products = await listLoanProducts("tenant-1", prisma as never)

    expect(products.map((product) => product.name)).toEqual(["Quick financing"])
  })

  test("is rejected by request validation", async () => {
    const lookups: WhereClause[] = []
    const prisma = createFinancingPrismaStub({
      products: [broughtForwardProduct],
    }) as unknown as Record<string, any>
    prisma.member = { findFirst: async () => null }
    const findFirst = prisma.loanProduct.findFirst
    prisma.loanProduct.findFirst = async (args: { where: WhereClause }) => {
      lookups.push(args.where)

      return findFirst(args)
    }

    // Other quote reads are not stubbed; only the product lookup matters.
    await quoteLoanRequest(
      {
        loanProductId: broughtForwardProduct.id,
        memberId: "member-1",
        requestedAmount: 1000,
        requestedTermMonths: 3,
        tenantId: "tenant-1",
      } as never,
      prisma as never
    ).catch(() => null)

    expect(lookups[0]).toMatchObject({
      NOT: { name: BROUGHT_FORWARD_LOAN_PRODUCT_NAME },
      id: broughtForwardProduct.id,
      isActive: true,
    })
    expect(await findFirst({ where: lookups[0]! })).toBeNull()
  })

  test("never backs a Finance settings card; missing types show as not set up", async () => {
    const workspace = await getTenantFinancingSettingsWorkspace(
      { tenantId: "tenant-1" },
      createFinancingPrismaStub({
        products: [broughtForwardProduct],
      }) as never
    )

    expect(workspace.products.normal).toMatchObject({
      id: null,
      isActive: false,
      name: "Normal financing",
    })
    expect(workspace.products.quick).toMatchObject({
      id: null,
      isActive: false,
    })
  })
})
