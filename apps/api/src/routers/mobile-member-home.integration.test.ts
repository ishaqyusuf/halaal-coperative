import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { hashPassword } from "@halaalvest/auth"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

// T04: mobile member home reads in a fixed number of queries (member row,
// then summary + service signals + unread badge in parallel) and keeps every
// read inside the member's own tenant.
const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const createCaller = createCallerFactory(appRouter)
const tag = Array.from({ length: 4 }, () =>
  String.fromCharCode(65 + Math.floor(Math.random() * 26))
).join("")
const password = "home-pass-123"
const DAY = 86_400_000

let signal = 0
function headers(token?: string) {
  signal += 1
  const value = new Headers({
    host: "api.halaalvest.localhost",
    "x-forwarded-for": `10.78.${signal % 250}.1`,
    "x-mobile-device-id": `member-home-test-${tag}`,
    "x-mobile-platform": "ios",
    "x-trpc-source": "mobile",
  })
  if (token) value.set("authorization", `Bearer ${token}`)
  return value
}

async function seedTenant(input: {
  prefix: string
  services: Partial<
    Record<
      "food_purchase" | "payment_receipts" | "procurement" | "support_cases",
      "disabled" | "office_only" | "member_self_service"
    >
  >
}) {
  const db = prisma!
  const now = Date.now()
  const tenant = await db.tenant.create({
    data: {
      cooperativeCodePrefix: input.prefix,
      cooperativeMobileAccessEnabled: true,
      name: `Home Cooperative ${input.prefix}`,
      slug: `home-${input.prefix.toLowerCase()}`,
      status: "active",
    },
  })
  const profile = await db.tenantOperationProfile.create({
    data: { tenantId: tenant.id },
  })
  for (const [serviceKey, accessMode] of Object.entries(input.services)) {
    await db.tenantServiceSetting.create({
      data: {
        accessMode: accessMode as never,
        operationProfileId: profile.id,
        serviceKey: serviceKey as never,
        tenantId: tenant.id,
      },
    })
  }
  const code = `${input.prefix}-0001`
  const user = await db.user.create({
    data: {
      cooperativeAccessCode: code,
      email: `home-${input.prefix.toLowerCase()}-${tag.toLowerCase()}@example.test`,
      fullName: `Home Member ${input.prefix}`,
      passwordHash: hashPassword(password),
      tenantId: tenant.id,
    },
  })
  await db.membership.create({
    data: { isDefault: true, role: "member", tenantId: tenant.id, userId: user.id },
  })
  const member = await db.member.create({
    data: {
      cooperativeMobileAccessTerms: {
        create: {
          amount: 0,
          approvedAt: new Date(now - DAY),
          currencyCode: "NGN",
          endsAt: new Date(now + 30 * DAY),
          requestedAt: new Date(now - DAY),
          startsAt: new Date(now - DAY),
          status: "approved",
          tenantId: tenant.id,
          termMonths: 1,
          termsVersion: "member-home-test",
        },
      },
      email: user.email,
      fullName: user.fullName,
      joinedAt: new Date(now - 200 * DAY),
      kycStatus: "verified",
      memberNumber: code,
      memberType: "individual",
      status: "active",
      tenantId: tenant.id,
      userId: user.id,
    },
  })
  return { code, member, tenant, user }
}

runIntegration("mobile member home", () => {
  let home: Awaited<ReturnType<typeof seedTenant>>
  let other: Awaited<ReturnType<typeof seedTenant>>
  let token = ""

  beforeAll(async () => {
    const db = prisma!
    home = await seedTenant({
      prefix: `H${tag}`.slice(0, 5),
      // Support turned off, but the member has a case: the tile stays.
      services: { procurement: "member_self_service", support_cases: "disabled" },
    })
    // Another cooperative that turns foodstuff on and has its own data.
    other = await seedTenant({
      prefix: `O${tag}`.slice(0, 5),
      services: { food_purchase: "member_self_service" },
    })
    const now = Date.now()
    const plan = await db.contributionPlan.create({
      data: {
        amount: 25_000,
        memberId: home.member.id,
        name: "Monthly savings",
        startsAt: new Date(now - 180 * DAY),
        tenantId: home.tenant.id,
      },
    })
    await db.contribution.createMany({
      data: [0, 1, 2].map((month) => ({
        amount: 25_000,
        channel: "transfer" as const,
        contributionPlanId: plan.id,
        memberId: home.member.id,
        postedAt: new Date(now - month * 30 * DAY),
        status: "posted" as const,
        tenantId: home.tenant.id,
      })),
    })
    await db.supportCase.create({
      data: {
        category: "account_update",
        description: "Please update my phone number.",
        memberId: home.member.id,
        subject: "Phone number",
        tenantId: home.tenant.id,
      },
    })
    // Notifications: two unread for this user, one read, one for someone
    // else, and one in the other cooperative that names this user's id.
    const delivery = (tenantId: string, metadata: Record<string, string>) =>
      db.auditLog.create({
        data: {
          action: "notification.push_sent",
          actorType: "system",
          entityType: "notification",
          metadata,
          occurredAt: new Date(),
          tenantId,
        },
      })
    await delivery(home.tenant.id, { recipientUserId: home.user.id })
    await delivery(home.tenant.id, { recipient: home.user.email })
    const read = await delivery(home.tenant.id, { recipientUserId: home.user.id })
    await db.auditLog.create({
      data: {
        action: "mobile.notification.read",
        actorType: "user",
        actorUserId: home.user.id,
        entityId: read.id,
        entityType: "notification",
        occurredAt: new Date(),
        tenantId: home.tenant.id,
      },
    })
    await delivery(home.tenant.id, { recipientUserId: other.user.id })
    await delivery(other.tenant.id, { recipientUserId: home.user.id })

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

  test("returns position, service tiles and the unread badge for the member's own cooperative", async () => {
    const result = await createCaller(
      await buildRequestContext(headers(token))
    ).mobile.member.home()

    expect(result.member?.memberNumber).toBe(home.code)
    expect(result.readiness.status).toBe("ready")
    const stat = (key: string) => result.stats.find((item) => item.key === key)
    expect(stat("commitment")?.value).toBe(25_000)
    expect(stat("savings")?.detail).toBe("3 contributions posted")
    expect(result.notifications.unread).toBe(2)

    const services = result.services.map((service) => service.key)
    expect(services).toContain("procurement")
    expect(services).toContain("support")
    // Receipts default to office-only with no records; foodstuff is only
    // turned on in the other cooperative.
    expect(services).not.toContain("receipts")
    expect(services).not.toContain("foodPurchase")
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
    const profilesBefore = await db.tenantServiceSetting.count({
      where: { tenantId: home.tenant.id },
    })
    try {
      const context = await buildRequestContext(headers(token))
      queries = 0
      await createCaller(context).mobile.member.home()
    } finally {
      globals.__halaalVestPrisma = previous
    }

    // App-access gate (1) + member (1) + summary, signals, unread (3).
    expect(queries).toBeGreaterThanOrEqual(4)
    expect(queries).toBeLessThanOrEqual(5)
    expect(
      await db.tenantServiceSetting.count({ where: { tenantId: home.tenant.id } })
    ).toBe(profilesBefore)
  })
})
