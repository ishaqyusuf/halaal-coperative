import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { hashPassword } from "@halaalvest/auth"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const createCaller = createCallerFactory(appRouter)
const tag = Array.from({ length: 4 }, () =>
  String.fromCharCode(65 + Math.floor(Math.random() * 26))
).join("")
const prefix = `S${tag}`
const password = "signin-pass-123"

let signal = 0
async function caller() {
  signal += 1
  return createCaller(
    await buildRequestContext(
      new Headers({
        host: "api.halaalvest.localhost",
        "x-forwarded-for": `10.77.${signal}.1`,
        "x-mobile-device-id": `sign-in-test-${tag}-${signal}`,
        "x-mobile-platform": "ios",
      })
    )
  )
}

runIntegration("mobile sign-in", () => {
  let tenantId = ""
  let memberUserId = ""
  let memberMembershipId = ""

  beforeAll(async () => {
    if (!prisma) return
    const tenant = await prisma.tenant.create({
      data: {
        cooperativeCodePrefix: prefix,
        cooperativeMobileAccessEnabled: true,
        name: `Sign In Cooperative ${tag}`,
        slug: `sign-in-${tag.toLowerCase()}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    const member = await prisma.user.create({
      data: {
        cooperativeAccessCode: `${prefix}-0001`,
        email: `member-${tag.toLowerCase()}@example.test`,
        fullName: "Sign In Member",
        passwordHash: hashPassword(password),
        tenantId,
      },
    })
    memberUserId = member.id
    const membership = await prisma.membership.create({
      data: { isDefault: true, role: "member", tenantId, userId: member.id },
    })
    memberMembershipId = membership.id
    const now = Date.now()
    await prisma.member.create({
      data: {
        cooperativeMobileAccessTerms: {
          create: {
            amount: 0,
            approvedAt: new Date(now - 86_400_000),
            currencyCode: "NGN",
            endsAt: new Date(now + 30 * 86_400_000),
            requestedAt: new Date(now - 86_400_000),
            startsAt: new Date(now - 86_400_000),
            status: "approved",
            tenantId,
            termMonths: 1,
            termsVersion: "sign-in-test",
          },
        },
        email: member.email,
        fullName: member.fullName,
        joinedAt: new Date(),
        memberNumber: `${prefix}-0001`,
        memberType: "individual",
        status: "active",
        tenantId,
        userId: member.id,
      },
    })
    // A user with no membership in any cooperative.
    await prisma.user.create({
      data: {
        cooperativeAccessCode: `${prefix}-0002`,
        email: `orphan-${tag.toLowerCase()}@example.test`,
        fullName: "Sign In Orphan",
        passwordHash: hashPassword(password),
        tenantId,
      },
    })
  })

  afterAll(async () => {
    if (!prisma || !tenantId) return
    await prisma.tenant.delete({ where: { id: tenantId } })
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag.toLowerCase()}@example.test` } },
    })
  })

  test("returns the profile and the app-access snapshot in one response", async () => {
    const response = await (
      await caller()
    ).auth.mobile.signIn({
      cooperativeAccessCode: `${prefix.toLowerCase()}-0001`,
      password,
    })

    expect(response.profile.user.id).toBe(memberUserId)
    expect(response.profile.activeMembershipId).toBe(memberMembershipId)
    expect(response.profile.role).toBe("member")
    expect(response.profile.member?.code).toBe(`${prefix}-0001`)
    expect(response.profile.availableRoles).toHaveLength(1)
    expect(response.accessSnapshot).toMatchObject({
      accessAllowed: true,
      membershipId: memberMembershipId,
      status: "active",
      tenantId,
      userBinding: memberUserId,
    })
    const session = await prisma!.mobileDeviceSession.findFirst({
      where: { revokedAt: null, tenantId, userId: memberUserId },
    })
    expect(session?.membershipId).toBe(memberMembershipId)
  })

  test("the cold-start profile read returns the app-access snapshot too", async () => {
    signal += 1
    const device = `sign-in-test-${tag}-${signal}`
    const base = {
      host: "api.halaalvest.localhost",
      "x-forwarded-for": `10.77.${signal}.1`,
      "x-mobile-device-id": device,
      "x-mobile-platform": "ios",
    }
    const signedIn = await createCaller(
      await buildRequestContext(new Headers(base))
    ).auth.mobile.signIn({
      cooperativeAccessCode: `${prefix}-0001`,
      password,
    })
    const me = await createCaller(
      await buildRequestContext(
        new Headers({
          ...base,
          authorization: `Bearer ${signedIn.profile.token}`,
          "x-trpc-source": "mobile",
        })
      )
    ).auth.mobile.me()

    expect(me.profile.user.id).toBe(memberUserId)
    expect(me.accessSnapshot).toMatchObject({
      accessAllowed: true,
      membershipId: memberMembershipId,
      status: "active",
      tenantId,
      userBinding: memberUserId,
    })
  })

  test("wrong passwords and unknown numbers fail identically", async () => {
    const wrongPassword = await (await caller()).auth.mobile
      .signIn({
        cooperativeAccessCode: `${prefix}-0001`,
        password: "not-the-password-1",
      })
      .catch((error: { code?: string; message?: string }) => error)
    const unknown = await (await caller()).auth.mobile
      .signIn({ cooperativeAccessCode: `${prefix}-9999`, password })
      .catch((error: { code?: string; message?: string }) => error)

    // No user enumeration: the same transport code and public message. The
    // app shows its own neutral copy for UNAUTHORIZED on sign-in.
    expect(wrongPassword).toMatchObject({ code: "UNAUTHORIZED" })
    expect(unknown).toMatchObject({
      code: (wrongPassword as { code?: string }).code,
      message: (wrongPassword as { message?: string }).message,
    })
  })

  test("an account without a membership is refused", async () => {
    const orphan = (await caller()).auth.mobile.signIn({
      cooperativeAccessCode: `${prefix}-0002`,
      password,
    })
    await expect(orphan).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This account is not active for the selected cooperative.",
    })
  })

  test("a cooperative shortcut's sign-in admits that cooperative's accounts", async () => {
    const response = await (
      await caller()
    ).auth.mobile.signIn({
      cooperativeAccessCode: `${prefix}-0001`,
      cooperativeId: tenantId,
      password,
    })
    expect(response.profile.user.id).toBe(memberUserId)
  })

  test("a cooperative shortcut's sign-in refuses another cooperative's account", async () => {
    // The membership-less account keeps -0001 under its rate limit.
    const other = (await caller()).auth.mobile.signIn({
      cooperativeAccessCode: `${prefix}-0002`,
      cooperativeId: "00000000-0000-4000-8000-000000000000",
      password,
    })
    await expect(other).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This account isn't part of the selected cooperative.",
    })
    // Without the password it stays the generic failure.
    const wrongPassword = (await caller()).auth.mobile.signIn({
      cooperativeAccessCode: `${prefix}-0002`,
      cooperativeId: "00000000-0000-4000-8000-000000000000",
      password: "not-the-password-1",
    })
    await expect(wrongPassword).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  test("the account rate limit still applies", async () => {
    const code = `${prefix}-0003`
    const attempts: unknown[] = []
    for (let attempt = 0; attempt < 7; attempt += 1) {
      attempts.push(
        await (await caller()).auth.mobile
          .signIn({ cooperativeAccessCode: code, password })
          .catch((error: unknown) => error)
      )
    }
    expect(attempts.at(-1)).toMatchObject({
      message: "Too many attempts. Wait a few minutes before trying again.",
    })
  })
})
