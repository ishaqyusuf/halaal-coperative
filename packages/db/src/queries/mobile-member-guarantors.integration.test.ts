import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import {
  getMobileMemberGuarantorRequest,
  getMobileMemberGuarantorSnapshot,
  respondMobileMemberGuarantorRequestForSession,
} from "./mobile-member-guarantors"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

integration("mobile guarantor approval queries", () => {
  let prisma: PrismaClient
  let tenantId: string
  let userId: string
  let otherUserId: string
  let queuedIds: string[]
  let historyId: string
  let reads = 0

  class DelayedAdapter extends PrismaPg {
    override async connect() {
      const measure = (
        adapter: Pick<Awaited<ReturnType<PrismaPg["connect"]>>, "queryRaw">
      ) => {
        const raw = adapter.queryRaw.bind(adapter)
        adapter.queryRaw = async (args) => {
          if (/^\s*SELECT/i.test(args.sql)) reads += 1
          await Bun.sleep(5)
          return raw(args)
        }
      }
      const adapter = await super.connect()
      measure(adapter)
      const start = adapter.startTransaction.bind(adapter)
      adapter.startTransaction = async (level) => {
        const transaction = await start(level)
        measure(transaction)
        return transaction
      }
      return adapter
    }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new DelayedAdapter({
        connectionString: normalizePostgresConnectionString(localUrl!),
      }),
    })
    const nonce = crypto.randomUUID().slice(0, 8)
    const tenant = await prisma.tenant.create({
      data: {
        name: "Guarantor integration",
        slug: `guarantor-${nonce}`,
        initialMigrationStatus: "finalized",
      },
    })
    tenantId = tenant.id
    const linked = async (name: string, number: string) => {
      const user = await prisma.user.create({
        data: {
          email: `guarantor-${number}-${nonce}@example.test`,
          tenantId,
          fullName: name,
        },
      })
      const member = await prisma.member.create({
        data: {
          tenantId,
          userId: user.id,
          fullName: name,
          memberNumber: number,
          memberType: "individual",
          joinedAt: new Date(),
        },
      })
      return { member, user }
    }
    const guarantor = await linked("Aisha Bello", "QHC-0042")
    userId = guarantor.user.id
    const borrower = await linked("Musa Ibrahim", "QHC-0118")
    otherUserId = borrower.user.id
    const product = await prisma.loanProduct.create({
      data: {
        tenantId,
        name: "Home improvement financing",
        loanType: "normal",
        termMonths: 12,
        maxSavingsMultiple: 2,
      },
    })
    const requestedAt = new Date("2026-11-14T10:00:00Z")
    const approvals = await Promise.all(
      Array.from({ length: 16 }, async (_, index) => {
        const loan = await prisma.loanRequest.create({
          data: {
            tenantId,
            memberId: borrower.member.id,
            loanProductId: product.id,
            createdByUserId: otherUserId,
            requestedAt,
            requestedAmount: 600_000.5,
            requestedTermMonths: 12,
            estimatedMonthlyServicing: 54_000,
            eligibleAmountSnapshot: 700_000,
            availablePoolSnapshot: 1_000_000,
            status: "under_review",
          },
        })
        return prisma.loanGuarantorApproval.create({
          data: {
            tenantId,
            loanRequestId: loan.id,
            guarantorMemberId: guarantor.member.id,
            requestedByUserId: otherUserId,
            requestedAt,
            status: index === 15 ? "approved" : "pending",
            respondedAt: index === 15 ? requestedAt : null,
            respondedByUserId: index === 15 ? otherUserId : null,
          },
        })
      })
    )
    queuedIds = approvals.slice(0, 15).map(({ id }) => id)
    historyId = approvals[15]!.id
  })

  afterAll(async () => {
    if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } })
    await prisma?.$disconnect()
  })

  async function measure<T>(run: (index: number) => Promise<T>) {
    const times: number[] = []
    let result!: T
    let count = 0
    for (let index = 0; index < 15; index += 1) {
      reads = 0
      const start = performance.now()
      result = await run(index)
      times.push(performance.now() - start)
      count = Math.max(count, reads)
    }
    return {
      result,
      reads: count,
      median: times.sort((a, b) => a - b)[7]!.toFixed(1),
    }
  }

  test("bounds pages, preserves counts and ordering, and isolates detail and search", async () => {
    const input = { tenantId, userId }
    const legacy = await measure(() =>
      getMobileMemberGuarantorSnapshot(input, prisma)
    )
    const first = await measure(() =>
      getMobileMemberGuarantorSnapshot(
        { ...input, page: { pageSize: 5 } },
        prisma
      )
    )
    expect(first.result.summary).toEqual(legacy.result.summary)
    expect(first.result.approvals).toHaveLength(5)
    expect(first.reads).toBe(3)
    expect(first.reads).toBeLessThan(legacy.reads)
    console.log(
      `Guarantor list at +5ms/SQL read: ${legacy.reads} → ${first.reads} reads, ${legacy.median} → ${first.median} ms median`
    )

    const all = [...first.result.approvals]
    let cursor = first.result.nextCursor
    while (cursor) {
      const page = await getMobileMemberGuarantorSnapshot(
        { ...input, page: { pageSize: 5, cursor } },
        prisma
      )
      all.push(...page.approvals)
      cursor = page.nextCursor
    }
    expect(all.map((row) => row.id)).toEqual(
      [...queuedIds].sort().reverse().concat(historyId)
    )
    expect(
      await getMobileMemberGuarantorRequest(
        { ...input, guarantorApprovalId: historyId },
        prisma
      )
    ).toMatchObject({
      answeredByMember: false,
      loanRequest: { requestedAmount: 600_000.5 },
    })
    expect(
      await getMobileMemberGuarantorRequest(
        { ...input, userId: otherUserId, guarantorApprovalId: historyId },
        prisma
      )
    ).toBeNull()
    expect(
      (
        await getMobileMemberGuarantorSnapshot(
          { ...input, page: { search: "QHC-0118" } },
          prisma
        )
      ).approvals
    ).toHaveLength(16)
    expect(
      (
        await getMobileMemberGuarantorSnapshot(
          { ...input, page: { search: "%" } },
          prisma
        )
      ).approvals
    ).toEqual([])
  }, 15_000)

  test("returns the audited response directly and rejects repeat or foreign answers", async () => {
    const submit = (id: string, actor = userId) =>
      respondMobileMemberGuarantorRequestForSession(
        {
          tenantId,
          userId: actor,
          decisionConfirmed: true,
          guarantorApprovalId: id,
          notes: "I reviewed the terms.",
          status: "approved",
        },
        prisma
      )
    await expect(submit(queuedIds[0]!, otherUserId)).rejects.toThrow(
      "not found"
    )
    const measured = await measure((index) => submit(queuedIds[index]!))
    expect(measured.result).toMatchObject({
      answeredByMember: true,
      status: "approved",
      responseNotes: "I reviewed the terms.",
      loanRequest: { loanProductName: "Home improvement financing" },
    })
    expect(
      await prisma.auditLog.count({
        where: {
          tenantId,
          entityId: measured.result.id,
          action: "loan_guarantor_approval.approved",
        },
      })
    ).toBe(1)
    await expect(submit(measured.result.id)).rejects.toThrow("Only pending")
    console.log(
      `Guarantor respond at +5ms/SQL statement: ${measured.reads} reads, ${measured.median} ms median`
    )
  }, 15_000)
})
