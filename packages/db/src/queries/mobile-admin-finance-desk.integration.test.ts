import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import {
  getMobileAdminFinanceDesk,
  getMobileAdminFinanceSupportOverview,
} from "./mobile-admin-finance-support"
import { startOfUtcDay } from "./repayments"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

const capabilities = {
  approveMoneyImpactSupport: true,
  manageSupport: true,
  recordCollectionFollowUp: true,
  reviewFinancing: true,
  reviewFoodPurchase: true,
  reviewProcurement: true,
  reviewProjectFinancing: true,
  reviewReceipts: true,
  reviewShares: true,
}

integration("mobile admin finance desk", () => {
  let prisma: PrismaClient
  let tenantId: string
  let otherTenantId: string
  let otherReceiptId: string
  let reads = 0

  class DelayedAdapter extends PrismaPg {
    override async connect() {
      const adapter = await super.connect()
      const query = adapter.queryRaw.bind(adapter)
      adapter.queryRaw = async (args) => {
        reads += 1
        await Bun.sleep(5)
        return query(args)
      }
      return adapter
    }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new DelayedAdapter({ connectionString: localUrl! }),
    })
    const nonce = crypto.randomUUID()
    const makeTenant = (slug: string) =>
      prisma.tenant.create({
        data: { slug: `${slug}-${nonce}`, name: "Finance desk integration" },
      })
    tenantId = (await makeTenant("finance-desk")).id
    otherTenantId = (await makeTenant("other-finance-desk")).id
    const today = startOfUtcDay()
    const yesterday = new Date(today.getTime() - 86_400_000)
    const tomorrow = new Date(today.getTime() + 86_400_000)
    const makeMember = (id: string) =>
      prisma.member.create({
        data: {
          tenantId: id,
          memberNumber: "QHC-0042",
          fullName: "Aisha Bello",
          memberType: "individual",
          joinedAt: yesterday,
        },
      })
    const member = await makeMember(tenantId)
    const otherMember = await makeMember(otherTenantId)
    const memberId = member.id
    const owner = await prisma.user.create({
      data: {
        tenantId,
        email: `${nonce}@example.test`,
        fullName: "Finance Officer",
      },
    })
    const createdByUserId = owner.id
    const timestamp = new Date(Date.now() - 70_000)
    const receipt = {
      memberId,
      tenantId,
      paidAt: timestamp,
      submittedAt: timestamp,
      totalAmount: 50_000,
    }
    otherReceiptId = (
      await prisma.memberPaymentReceipt.create({
        data: {
          ...receipt,
          tenantId: otherTenantId,
          memberId: otherMember.id,
          paymentReference: "OUTSIDE",
        },
      })
    ).id
    const product = await prisma.loanProduct.create({
      data: {
        tenantId,
        name: "Qard hasan",
        loanType: "normal",
        maxSavingsMultiple: 2,
        termMonths: 6,
      },
    })
    const loanRequest = {
      tenantId,
      memberId,
      loanProductId: product.id,
      createdByUserId,
      requestedAmount: 300_000,
      estimatedMonthlyServicing: 50_000,
      eligibleAmountSnapshot: 300_000,
      availablePoolSnapshot: 500_000,
      requestedTermMonths: 6,
      requestedAt: timestamp,
    }
    const disbursedRequest = await prisma.loanRequest.create({
      data: { ...loanRequest, status: "approved" },
    })
    const approvedRequest = await prisma.loanRequest.create({
      data: { ...loanRequest, status: "approved" },
    })
    const loan = await prisma.loan.create({
      data: {
        tenantId,
        memberId,
        loanProductId: product.id,
        loanRequestId: disbursedRequest.id,
        principalAmount: 300_000,
        outstandingPrincipal: 250_000,
        termMonths: 6,
        estimatedMonthlyServicing: 50_000,
        disbursedAt: yesterday,
        status: "active",
      },
    })
    const cycle = await prisma.foodPurchaseCycle.create({
      data: {
        tenantId,
        releasedByUserId: createdByUserId,
        periodMonth: today,
        releasedAmount: 500_000,
        releasedAt: timestamp,
      },
    })
    const base = { tenantId, memberId, createdByUserId, requestedAt: timestamp }

    await Promise.all([
      prisma.memberPaymentReceipt.createMany({
        data: [
          ...Array.from({ length: 23 }, (_, index) => ({
            ...receipt,
            paymentReference: `HVC-${String(index).padStart(2, "0")}`,
            proofDocumentUrl:
              index === 22 ? null : "https://example.test/proof",
          })),
          { ...receipt, paymentReference: "ARCHIVED", status: "rejected" },
        ],
      }),
      prisma.loanRequest.create({ data: loanRequest }),
      prisma.loan.create({
        data: {
          tenantId,
          memberId,
          loanProductId: product.id,
          loanRequestId: approvedRequest.id,
          principalAmount: 300_000,
          outstandingPrincipal: 300_000,
          termMonths: 6,
          estimatedMonthlyServicing: 50_000,
        },
      }),
      prisma.procurementRequest.create({
        data: {
          ...base,
          itemName: "Freezer",
          vendorName: "Sahad Stores",
          requestedCost: 180_000,
          requestedRepaymentMonths: 6,
          estimatedMonthlyRepayment: 30_000,
        },
      }),
      prisma.foodPurchaseApplication.create({
        data: {
          tenantId,
          memberId,
          requestedAt: timestamp,
          cycleId: cycle.id,
          submittedByUserId: createdByUserId,
          requestedAmount: 35_000,
          itemDescription: "Rice",
        },
      }),
      prisma.projectFinancingRequest.create({
        data: {
          ...base,
          businessName: "Poultry expansion",
          requestedAmount: 800_000,
        },
      }),
      prisma.memberShareApplication.create({
        data: {
          tenantId,
          memberId,
          requestedUnits: 3,
          shareValueSnapshot: 30_000,
          unitAmountSnapshot: 10_000,
        },
      }),
      prisma.supportCase.create({
        data: {
          tenantId,
          memberId,
          category: "payment_issue",
          subject: "Contribution question",
          description: "Check a posting",
        },
      }),
      prisma.repaymentScheduleItem.createMany({
        data: [
          {
            tenantId,
            loanId: loan.id,
            installmentNumber: 1,
            principalDue: 5_000,
            totalDue: 5_000,
            dueAt: yesterday,
            status: "due",
          },
          {
            tenantId,
            loanId: loan.id,
            installmentNumber: 2,
            principalDue: 5_000,
            totalDue: 5_000,
            dueAt: today,
            status: "pending",
          },
          {
            tenantId,
            loanId: loan.id,
            installmentNumber: 3,
            principalDue: 5_000,
            totalDue: 5_000,
            dueAt: tomorrow,
          },
          {
            tenantId,
            loanId: loan.id,
            installmentNumber: 4,
            principalDue: 5_000,
            totalDue: 5_000,
            dueAt: yesterday,
            status: "paid",
          },
        ],
      }),
    ])
    const deductionSource = await prisma.deductionSource.create({
      data: { tenantId, name: "Test employer", type: "employer_payroll" },
    })
    const batch = await prisma.collectionSourceContributionBatch.create({
      data: {
        tenantId,
        deductionSourceId: deductionSource.id,
        createdByUserId,
        periodLabel: "2026-11",
        periodYear: 2026,
        periodMonth: 11,
      },
    })
    await prisma.collectionSourceContributionBatchRow.create({
      data: {
        tenantId,
        memberId,
        batchId: batch.id,
        status: "collected",
        paidAmount: 30_000,
      },
    })
    const charge = await prisma.chargeDefinition.create({
      data: {
        tenantId,
        code: "TEST",
        name: "Test charge",
        kind: "fixed",
        amount: 1_000,
      },
    })
    await prisma.chargeApplication.create({
      data: {
        tenantId,
        memberId,
        chargeDefinitionId: charge.id,
        assessedAt: today,
        amount: 1_000,
        status: "pending",
      },
    })
  })

  afterAll(async () => {
    if (!prisma) return
    try {
      if (tenantId) await prisma.loan.deleteMany({ where: { tenantId } })
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantId, otherTenantId].filter(Boolean) } },
      })
    } finally {
      await prisma.$disconnect()
    }
  })

  const input = () => ({
    capabilities,
    access: {
      charges: true,
      contributions: true,
      foodPurchase: true,
      shares: true,
    },
    limit: 15,
    tenantId,
  })

  test("counts complete lanes and desk work, pages time ties, and scopes searches and exact lookups", async () => {
    const first = await getMobileAdminFinanceDesk(
      { ...input(), summary: true },
      prisma
    )
    expect(first.items).toHaveLength(15)
    expect(first.summary?.total).toBe(31)
    expect(
      first.summary?.queueCounts.find(({ key }) => key === "receipts")?.count
    ).toBe(23)
    expect(first.summary?.blocked).toBe(2)
    expect(first.summary?.deskCounts).toMatchObject({
      financing: 2,
      contributions: 1,
      charges: 1,
      repayments: 1,
    })
    expect(first.items[0]).toMatchObject({
      displayState: "overdue",
      state: "due",
    })
    expect(first.items[1]).toMatchObject({
      displayState: "due",
      state: "pending",
    })

    const second = await getMobileAdminFinanceDesk(
      { ...input(), cursor: first.nextCursor! },
      prisma
    )
    const third = await getMobileAdminFinanceDesk(
      { ...input(), cursor: second.nextCursor! },
      prisma
    )
    const idSet = new Set(
      [...first.items, ...second.items, ...third.items].map(({ id }) => id)
    )
    expect(idSet.size).toBe(31)
    expect(third.nextCursor).toBeNull()

    const lateReceipt = await getMobileAdminFinanceDesk(
      { ...input(), queueKey: "receipts", search: "hvc-22" },
      prisma
    )
    expect(lateReceipt.items.map(({ subtitle }) => subtitle)).toEqual([
      "Reference HVC-22",
    ])
    expect(
      lateReceipt.items[0]?.allowedActions.some(({ key }) => key === "approve")
    ).toBe(true)
    expect(lateReceipt.items[0]?.blockers).toEqual([])
    expect(lateReceipt.items[0]?.details).toContainEqual({
      label: "Allocations",
      value: "Calculated on approval",
    })
    await expect(
      getMobileAdminFinanceDesk(
        { ...input(), entityId: otherReceiptId },
        prisma
      )
    ).resolves.toMatchObject({ items: [] })
    await expect(
      getMobileAdminFinanceDesk({ ...input(), search: "OUTSIDE" }, prisma)
    ).resolves.toMatchObject({ items: [] })

    const limited = await getMobileAdminFinanceDesk(
      {
        ...input(),
        summary: true,
        access: {
          charges: false,
          contributions: false,
          foodPurchase: false,
          shares: false,
        },
      },
      prisma
    )
    expect(limited.summary?.deskCounts).toMatchObject({
      charges: null,
      contributions: null,
      foodPurchase: null,
      shares: null,
    })
    expect(
      limited.summary?.queueCounts.some(({ key }) => key === "shares")
    ).toBe(false)
    await expect(
      getMobileAdminFinanceDesk(
        {
          ...input(),
          ...limitedAccess(),
          queueKey: "shares",
        },
        prisma
      )
    ).resolves.toMatchObject({ items: [] })
  })

  test("benchmarks the same local tenant with a 5ms added statement delay", async () => {
    const measure = async (read: () => Promise<unknown>) => {
      await read()
      const runs = []
      for (let i = 0; i < 7; i += 1) {
        reads = 0
        const start = performance.now()
        await read()
        runs.push({ reads, ms: Math.round(performance.now() - start) })
      }
      return {
        reads: runs[0]!.reads,
        medianMs: runs.map(({ ms }) => ms).sort((a, b) => a - b)[3],
      }
    }
    const legacyAll = await measure(() =>
      getMobileAdminFinanceSupportOverview(
        { capabilities, tenantId, limit: 20 },
        prisma
      )
    )
    const all = await measure(() =>
      getMobileAdminFinanceDesk({ ...input(), summary: true }, prisma)
    )
    const legacyLane = await measure(() =>
      getMobileAdminFinanceSupportOverview(
        {
          capabilities,
          tenantId,
          limit: 20,
          queueKey: "receipts",
          search: "HVC",
        },
        prisma
      )
    )
    const lane = await measure(() =>
      getMobileAdminFinanceDesk(
        { ...input(), queueKey: "receipts", search: "HVC" },
        prisma
      )
    )
    console.info(
      "T13 reads and median ms",
      JSON.stringify({ legacyAll, all, legacyLane, lane })
    )
    expect(all.reads).toBeLessThan(legacyAll.reads)
    expect(lane.reads).toBeLessThan(legacyLane.reads)
  })
})

function limitedAccess() {
  return {
    access: {
      charges: false,
      contributions: false,
      foodPurchase: false,
      shares: false,
    },
  }
}
