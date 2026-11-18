import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import {
  createDashboardEvidenceUpload,
  finalizeDashboardEvidenceUpload,
} from "./dashboard-evidence-uploads"
import {
  createMobileMemberReceiptForSession,
  getMobileMemberReceiptDetail,
  getMobileMemberReceiptFormOptions,
  getMobileMemberReceiptSnapshot,
} from "./mobile-member-receipts"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

integration("mobile receipt ledger in local PostgreSQL", () => {
  let prisma: PrismaClient
  let tenantId: string
  let userId: string
  let otherUserId: string
  let memberId: string
  let reads = 0

  class CountingAdapter extends PrismaPg {
    override async connect() {
      const adapter = await super.connect()
      const query = adapter.queryRaw.bind(adapter)
      adapter.queryRaw = async (args) => {
        reads++
        return query(args)
      }
      return adapter
    }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new CountingAdapter({
        connectionString: normalizePostgresConnectionString(localUrl!),
      }),
    })
    const key = crypto.randomUUID().slice(0, 8)
    tenantId = (
      await prisma.tenant.create({
        data: {
          name: "Receipt ledger integration",
          slug: `receipt-ledger-${key}`,
          status: "active",
        },
      })
    ).id
    const profile = await prisma.tenantOperationProfile.create({
      data: { tenantId },
    })
    await prisma.tenantServiceSetting.create({
      data: {
        tenantId,
        operationProfileId: profile.id,
        serviceKey: "payment_receipts",
        accessMode: "member_self_service",
      },
    })
    const createMember = async (number: string) => {
      const user = await prisma.user.create({
        data: {
          email: `${number}-${key}@example.test`,
          fullName: `Member ${number}`,
          tenantId,
        },
      })
      return prisma.member.create({
        data: {
          email: user.email,
          fullName: user.fullName,
          joinedAt: new Date("2024-01-15"),
          memberNumber: number,
          memberType: "individual",
          tenantId,
          userId: user.id,
        },
      })
    }
    const owner = await createMember("RCP-0001")
    const other = await createMember("RCP-0002")
    memberId = owner.id
    userId = owner.userId!
    otherUserId = other.userId!
    const paidAt = new Date("2026-11-16T00:00:00Z")
    await prisma.memberPaymentReceipt.createMany({
      data: [
        ...Array.from({ length: 22 }, (_, i) => ({
          tenantId,
          memberId,
          paidAt,
          submittedAt: paidAt,
          totalAmount: i === 21 ? 25000 : 500,
          paymentReference: `TRF-${i}`,
          status: i === 21 ? ("approved" as const) : ("submitted" as const),
        })),
        {
          tenantId,
          memberId: other.id,
          paidAt,
          totalAmount: 25000,
          paymentReference: "TRF-OTHER",
        },
      ],
    })
  })

  afterAll(async () => {
    if (tenantId) {
      await prisma.$transaction([
        prisma.auditLog.deleteMany({ where: { tenantId } }),
        prisma.dashboardEvidenceUpload.deleteMany({ where: { tenantId } }),
        prisma.tenant.delete({ where: { id: tenantId } }),
      ])
    }
    await prisma?.$disconnect()
  })

  test("pages ties, searches beyond the first page and preserves member scope", async () => {
    reads = 0
    const input = { compact: true, tenantId, userId }
    const ledger = await getMobileMemberReceiptSnapshot(input, prisma)
    expect(reads).toBeLessThanOrEqual(6)
    expect(ledger.categories).toEqual([])
    expect(ledger.canCreateReceipt).toBe(true)
    expect(ledger.receipts).toHaveLength(20)
    expect(ledger.summary).toMatchObject({
      approvedReceipts: 1,
      pendingReviewReceipts: 21,
    })
    expect(ledger.nextCursor).toBeString()
    reads = 0
    const second = await getMobileMemberReceiptSnapshot(
      { ...input, cursor: ledger.nextCursor },
      prisma
    )
    expect(reads).toBeLessThanOrEqual(5)
    expect(second.receipts).toHaveLength(2)
    expect(
      new Set(
        [...ledger.receipts, ...second.receipts].map((receipt) => receipt.id)
      ).size
    ).toBe(22)
    const results = await getMobileMemberReceiptSnapshot(
      { ...input, search: "₦25,000" },
      prisma
    )
    expect(results.receipts.map((receipt) => receipt.paymentReference)).toEqual(
      ["TRF-21"]
    )
    expect(
      await getMobileMemberReceiptDetail(
        { tenantId, userId: otherUserId, receiptId: ledger.receipts[0]!.id },
        prisma
      )
    ).toBeNull()
    const form = await getMobileMemberReceiptFormOptions(input, prisma)
    expect(form).toMatchObject({ canCreateReceipt: true })
    expect(form.categories.map((category) => category.value)).toContain(
      "commitment"
    )
    const legacy = await getMobileMemberReceiptSnapshot(
      { tenantId, userId },
      prisma
    )
    expect(legacy.categories).not.toHaveLength(0)
  })

  test("links only an uploaded proof belonging to the submitting member", async () => {
    const id = crypto.randomUUID()
    const metadata = {
      id,
      tenantId,
      purpose: "payment_receipt_proof",
      contentType: "application/pdf",
    }
    const submission = {
      tenantId,
      userId,
      totalAmount: 25000,
      paidAt: new Date("2026-11-16T00:00:00Z"),
      allocations: [{ amount: 25000, category: "commitment" as const }],
      proofDocumentUrl: `/api/uploads/${id}`,
    }
    await expect(
      createMobileMemberReceiptForSession(submission, prisma)
    ).rejects.toThrow("was not found")
    await createDashboardEvidenceUpload(
      {
        ...metadata,
        uploaderUserId: userId,
        declaredSize: 42,
        originalName: "transfer.pdf",
      },
      prisma
    )
    await expect(
      createMobileMemberReceiptForSession(submission, prisma)
    ).rejects.toThrow("cannot be linked")
    await finalizeDashboardEvidenceUpload(
      {
        ...metadata,
        uploaderUserId: userId,
        storedSize: 42,
      },
      prisma
    )
    await expect(
      createMobileMemberReceiptForSession(
        { ...submission, userId: otherUserId },
        prisma
      )
    ).rejects.toThrow("cannot be linked")
    const created = await createMobileMemberReceiptForSession(
      submission,
      prisma
    )
    expect(created.proofDocumentUrl).toBe(submission.proofDocumentUrl)
    const upload = await prisma.dashboardEvidenceUpload.findUnique({
      where: { id },
    })
    expect(upload?.linkedEntityId).toBe(created.id)
  })
})
