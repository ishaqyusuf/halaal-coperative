import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import {
  getMobileAdminMemberDirectoryPage,
  getMobileAdminMemberDirectorySummary,
  getMobileAdminMemberProfile,
} from "./mobile-admin-member-lifecycle"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

integration("mobile admin member lifecycle reads", () => {
  let prisma: PrismaClient
  let tenantId: string
  let otherTenantId: string
  let memberId: string
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
    const joinedAt = new Date("2024-01-08T00:00:00.000Z")
    const preview = async (slug: string) =>
      prisma.tenant.create({
        data: {
          slug: `${slug}-${nonce}`,
          name: "Mobile members integration",
          status: "active",
        },
      })
    tenantId = (await preview("members")).id
    otherTenantId = (await preview("other-members")).id
    const aisha = await prisma.member.create({
      data: {
        createdAt: new Date("2024-01-09T00:00:00.000Z"),
        email: "aisha@example.test",
        fullName: "Aisha Bello",
        joinedAt,
        kycStatus: "verified",
        memberNumber: "QHC-0042",
        memberType: "individual",
        phoneNumber: "0803 214 0042",
        status: "active",
        tenantId,
        totalSavingsSnapshot: 35000,
      },
    })
    memberId = aisha.id
    await Promise.all([
      prisma.member.createMany({
        data: [
          {
            createdAt: joinedAt,
            fullName: "Ibrahim Yusuf",
            joinedAt,
            kycStatus: "pending",
            memberNumber: "QHC-0041",
            memberType: "civil_servant",
            status: "active",
            tenantId,
          },
          {
            createdAt: joinedAt,
            fullName: "Aisha Other",
            joinedAt,
            kycStatus: "not_started",
            memberNumber: "QHC-0042",
            memberType: "individual",
            status: "pending",
            tenantId: otherTenantId,
          },
        ],
      }),
      prisma.memberDocument.create({
        data: {
          tenantId,
          memberId,
          documentType: "government_id",
          documentUrl: "https://example.test/identity",
          reviewStatus: "pending",
        },
      }),
      prisma.contributionPlan.create({
        data: {
          tenantId,
          memberId,
          name: "Monthly commitment",
          amount: 25_000,
          startsAt: joinedAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "member.kyc_updated",
          actorType: "system",
          entityId: memberId,
          entityType: "Member",
          occurredAt: joinedAt,
          tenantId,
          metadata: {
            governmentIdNumber: "private-id",
            kycReviewNotes: "Evidence reviewed",
            kycStatus: "verified",
          },
        },
      }),
      prisma.memberShareLedgerEntry.createMany({
        data: [
          {
            tenantId,
            memberId,
            amount: 50_000,
            effectiveDate: joinedAt,
            sourceType: "manual_adjustment",
          },
          {
            tenantId,
            memberId,
            amount: 20_000,
            effectiveDate: new Date("2099-01-01T00:00:00.000Z"),
            sourceType: "manual_adjustment",
          },
        ],
      }),
    ])
    const applicant = await prisma.user.create({
      data: {
        tenantId,
        fullName: "Nafisa Idris",
        email: "nafisa@example.test",
      },
    })
    await prisma.memberOnboardingRequest.create({
      data: {
        tenantId,
        userId: applicant.id,
        fullName: applicant.fullName,
        email: applicant.email,
        memberNumber: "QHC-0044",
        status: "pending_approval",
        emailVerifiedAt: joinedAt,
      },
    })
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantId, otherTenantId].filter(Boolean) } },
    })
    await prisma.$disconnect()
  })

  async function measure<T>(read: () => Promise<T>) {
    const times: number[] = []
    let result!: T
    let statements = 0
    for (let run = 0; run < 5; run++) {
      reads = 0
      const start = performance.now()
      result = await read()
      times.push(performance.now() - start)
      statements = reads
    }
    return {
      result,
      statements,
      median: times.sort((a, b) => a - b)[2]!.toFixed(1),
    }
  }

  test("returns bounded directory pages, tenant-wide counts, and scoped review results", async () => {
    const first = await measure(() =>
      Promise.all([
        getMobileAdminMemberDirectoryPage({ tenantId, pageSize: 1 }, prisma),
        getMobileAdminMemberDirectorySummary(tenantId, prisma),
      ])
    )
    const [page, summary] = first.result
    expect(page.members.map(({ fullName }) => fullName)).toEqual([
      "Aisha Bello",
    ])
    expect(summary.total).toBe(2)
    expect(summary.statusCounts).toMatchObject({ active: 2, pending: 0 })
    expect(summary.kycCounts).toMatchObject({ verified: 1, pending: 1 })
    expect(summary.reviewQueues.map(({ count }) => count)).toEqual([1, 2])
    expect(summary.onboardingRequests[0]?.memberNumber).toBe("QHC-0044")

    const next = await measure(() =>
      getMobileAdminMemberDirectoryPage(
        { tenantId, page: 2, pageSize: 1 },
        prisma
      )
    )
    expect(next.result.members.map(({ fullName }) => fullName)).toEqual([
      "Ibrahim Yusuf",
    ])
    expect(next.result.total).toBe(2)
    expect(next.statements).toBe(2)
    expect(first.statements).toBeLessThanOrEqual(7)
    console.log(
      `directory at +5ms/query: page + summary ${first.statements} reads, ${first.median}ms; next page ${next.statements} reads, ${next.median}ms`
    )

    const byPhone = await getMobileAdminMemberDirectoryPage(
      { tenantId, search: "+234 (803) 214-0042" },
      prisma
    )
    expect(byPhone.members.map(({ id }) => id)).toEqual([memberId])
    const unmatched = await getMobileAdminMemberDirectoryPage(
      { tenantId, search: "%" },
      prisma
    )
    expect(unmatched.total).toBe(0)
    const review = await getMobileAdminMemberDirectoryPage(
      { tenantId, needsReview: true },
      prisma
    )
    expect(review.members.map(({ fullName }) => fullName)).toEqual([
      "Aisha Bello",
      "Ibrahim Yusuf",
    ])
    const filtered = await getMobileAdminMemberDirectoryPage(
      { tenantId, kycStatus: "verified", status: "active" },
      prisma
    )
    expect(filtered.members.map(({ id }) => id)).toEqual([memberId])
  })

  test("limits the detail to one member’s profile, posted balances and audit events", async () => {
    const detail = await measure(() =>
      getMobileAdminMemberProfile({ tenantId, memberId }, prisma)
    )
    expect(detail.result.member?.activeMonthlyCommitment).toBe(25_000)
    expect(
      detail.result.stats.find(({ key }) => key === "share-capital")?.value
    ).toBe(50_000)
    expect(detail.result.sections[0]?.rows[0]).toMatchObject({
      label: "Government Id",
      status: "pending",
    })
    expect(detail.result.recentChanges).toEqual([
      {
        actor: null,
        id: expect.any(String),
        kind: "kyc",
        notes: "Evidence reviewed",
        occurredAt: "2024-01-08T00:00:00.000Z",
        value: "verified",
      },
    ])
    expect(detail.statements).toBeLessThanOrEqual(10)
    console.log(
      `profile at +5ms/query: ${detail.statements} reads, ${detail.median}ms`
    )
    const foreign = await getMobileAdminMemberProfile(
      { tenantId: otherTenantId, memberId },
      prisma
    )
    expect(foreign).toMatchObject({
      member: null,
      sections: [],
      stats: [],
      recentChanges: [],
    })
  })
})
