import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { hashPassword } from "@halaalvest/auth"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

// T05: the mobile admin overview reads only open queue rows (no operation
// profile), carries structured activity rows, keeps every read inside the
// admin's own cooperative and stays inside a fixed query budget.
const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const createCaller = createCallerFactory(appRouter)
const tag = Array.from({ length: 4 }, () =>
  String.fromCharCode(65 + Math.floor(Math.random() * 26))
).join("")
const password = "overview-pass-123"
const DAY = 86_400_000

let signal = 0
function headers(token?: string) {
  signal += 1
  const value = new Headers({
    host: "api.halaalvest.localhost",
    "x-forwarded-for": `10.79.${signal % 250}.1`,
    "x-mobile-device-id": `admin-overview-test-${tag}`,
    "x-mobile-platform": "ios",
    "x-trpc-source": "mobile",
  })
  if (token) value.set("authorization", `Bearer ${token}`)
  return value
}

async function seedTenant(prefix: string, memberName: string, amount: number) {
  const db = prisma!
  const now = Date.now()
  const tenant = await db.tenant.create({
    data: {
      cooperativeCodePrefix: prefix,
      cooperativeMobileAccessEnabled: true,
      name: `Overview Cooperative ${prefix}`,
      slug: `overview-${prefix.toLowerCase()}`,
      status: "active",
    },
  })
  const code = `${prefix}-0001`
  const user = await db.user.create({
    data: {
      cooperativeAccessCode: code,
      email: `overview-${prefix.toLowerCase()}-${tag.toLowerCase()}@example.test`,
      fullName: `Overview Admin ${prefix}`,
      passwordHash: hashPassword(password),
      tenantId: tenant.id,
    },
  })
  await db.membership.create({
    data: {
      isDefault: true,
      role: "tenant_admin",
      tenantId: tenant.id,
      userId: user.id,
    },
  })
  await db.member.create({
    data: {
      email: user.email,
      fullName: user.fullName,
      joinedAt: new Date(now - 300 * DAY),
      kycStatus: "verified",
      memberNumber: code,
      memberType: "individual",
      status: "active",
      tenantId: tenant.id,
      userId: user.id,
    },
  })
  // A member whose KYC is pending and who has one posted contribution.
  const member = await db.member.create({
    data: {
      fullName: memberName,
      joinedAt: new Date(now - 200 * DAY),
      kycStatus: "pending",
      memberNumber: `${prefix}-0002`,
      memberType: "individual",
      status: "active",
      tenantId: tenant.id,
    },
  })
  const plan = await db.contributionPlan.create({
    data: {
      amount,
      memberId: member.id,
      name: "Monthly savings",
      startsAt: new Date(now - 180 * DAY),
      tenantId: tenant.id,
    },
  })
  await db.contribution.create({
    data: {
      amount,
      channel: "transfer",
      contributionPlanId: plan.id,
      memberId: member.id,
      postedAt: new Date(now - DAY),
      status: "posted",
      tenantId: tenant.id,
    },
  })
  return { code, tenant, user }
}

runIntegration("mobile admin overview", () => {
  let home: Awaited<ReturnType<typeof seedTenant>>
  let other: Awaited<ReturnType<typeof seedTenant>>
  let token = ""

  beforeAll(async () => {
    home = await seedTenant(`V${tag}`.slice(0, 5), "Aisha Bello", 25_000)
    other = await seedTenant(`W${tag}`.slice(0, 5), "Other Cooperative Member", 99_000)
    const signedIn = await createCaller(
      await buildRequestContext(headers())
    ).auth.mobile.signIn({ cooperativeAccessCode: home.code, password })
    token = signedIn.profile.token
  })

  afterAll(async () => {
    if (!prisma) return
    for (const seeded of [home, other]) {
      if (!seeded) continue
      await prisma.tenant.delete({ where: { id: seeded.tenant.id } })
      await prisma.user.deleteMany({ where: { id: seeded.user.id } })
    }
  })

  test("returns open queue rows, compliance and structured activity for the admin's own cooperative", async () => {
    const overview = await createCaller(
      await buildRequestContext(headers(token))
    ).mobile.admin.overview()

    // Only rows with a count: the operation profile is not read.
    expect(overview.actionQueue.every((item) => item.count > 0)).toBe(true)
    expect(overview.actionQueue).toContainEqual(
      expect.objectContaining({ key: "kyc-documents", severity: "warning" })
    )
    expect(
      overview.complianceWatch.find((item) => item.key === "kyc-incomplete")
        ?.count
    ).toBe(1)

    expect(overview.recentActivity).toEqual([
      expect.objectContaining({
        amount: 25_000,
        kind: "contribution",
        label: "Contribution posted",
        memberName: "Aisha Bello",
        status: null,
      }),
    ])
    expect(JSON.stringify(overview)).not.toContain("Other Cooperative Member")

    const risk = overview.stats.find((stat) => stat.key === "portfolio-risk")
    expect(risk?.detail).toBe("₦0 overdue")
  })

  test("reads in a fixed query budget and never writes operation-profile defaults", async () => {
    const db = prisma!
    let queries = 0
    const counted = db.$extends({
      query: {
        async $allOperations({ args, query }) {
          queries += 1
          return query(args)
        },
      },
    })
    const globals = globalThis as { __halaalVestPrisma?: unknown }
    const previous = globals.__halaalVestPrisma
    globals.__halaalVestPrisma = counted
    try {
      const context = await buildRequestContext(headers(token))
      queries = 0
      await createCaller(context).mobile.admin.overview()
    } finally {
      globals.__halaalVestPrisma = previous
    }

    // Before T05: 17 (gate + 16). Now gate + 13, without the operation
    // profile's three reads; no monthly record adds the commitment reads.
    expect(queries).toBeLessThanOrEqual(14)
    expect(
      await db.tenantOperationProfile.count({ where: { tenantId: home.tenant.id } })
    ).toBe(0)
  })
})
