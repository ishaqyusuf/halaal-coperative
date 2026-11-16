import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { createPrismaClient } from "../prisma"
import { getCooperativeMobileAccessSnapshot } from "./cooperative-mobile-access"

/**
 * The app-access gate reads membership + latest term in one SQL query (T03).
 * These cases pin it to the rules of the earlier two-step Prisma read:
 * user/tenant checks, member-only terms, term status, and tenant isolation.
 */
const prisma = createPrismaClient()
const run = prisma ? describe : describe.skip
const tag = Array.from({ length: 5 }, () =>
  String.fromCharCode(97 + Math.floor(Math.random() * 26))
).join("")
const day = 86_400_000

type Actor = { tenantId: string; userId: string; membershipId: string }

run("cooperative mobile access gate (one query)", () => {
  const tenantIds: string[] = []
  const actors: Record<string, Actor> = {}
  let otherTenantId = ""
  let n = 0

  async function tenant(
    label: string,
    data: { enabled?: boolean; status?: "active" | "suspended"; purge?: boolean }
  ) {
    const created = await prisma!.tenant.create({
      data: {
        cooperativeMobileAccessEnabled: data.enabled ?? true,
        name: `Gate ${label} ${tag}`,
        qaPurgeStartedAt: data.purge ? new Date() : null,
        slug: `gate-${label}-${tag}`,
        status: data.status ?? "active",
      },
    })
    tenantIds.push(created.id)
    return created.id
  }

  async function actor(
    key: string,
    tenantId: string,
    options: {
      role?: "member" | "tenant_admin"
      memberStatus?: "active" | "inactive"
      deleted?: boolean
      terms?: {
        status: "pending" | "approved" | "rejected" | "revoked"
        startsAt?: Date | null
        endsAt?: Date | null
        requestedAt: Date
      }[]
    } = {}
  ) {
    n += 1
    const user = await prisma!.user.create({
      data: {
        deletedAt: options.deleted ? new Date() : null,
        email: `gate-${n}-${tag}@example.test`,
        fullName: `Gate ${key}`,
        tenantId,
      },
    })
    const membership = await prisma!.membership.create({
      data: { isDefault: true, role: options.role ?? "member", tenantId, userId: user.id },
    })
    const member = await prisma!.member.create({
      data: {
        email: user.email,
        fullName: user.fullName,
        joinedAt: new Date(),
        memberNumber: `G-${n}`,
        memberType: "individual",
        status: options.memberStatus ?? "active",
        tenantId,
        userId: user.id,
      },
    })
    for (const term of options.terms ?? []) {
      await prisma!.cooperativeMobileAccessTerm.create({
        data: {
          amount: 1000,
          approvedAt: term.status === "approved" ? term.requestedAt : null,
          currencyCode: "NGN",
          endsAt: term.endsAt ?? null,
          memberId: member.id,
          requestedAt: term.requestedAt,
          startsAt: term.startsAt ?? null,
          status: term.status,
          tenantId,
          termMonths: 12,
          termsVersion: "gate-test",
        },
      })
    }
    actors[key] = { membershipId: membership.id, tenantId, userId: user.id }
  }

  beforeAll(async () => {
    const now = Date.now()
    const active = await tenant("on", {})
    const off = await tenant("off", { enabled: false })
    const suspended = await tenant("suspended", { status: "suspended" })
    const purging = await tenant("purging", { purge: true })
    otherTenantId = await tenant("other", {})

    const current = {
      status: "approved" as const,
      requestedAt: new Date(now - day),
      startsAt: new Date(now - day),
      endsAt: new Date(now + 30 * day),
    }
    await actor("active", active, { terms: [current] })
    await actor("expired", active, {
      terms: [{ ...current, startsAt: new Date(now - 400 * day), endsAt: new Date(now - day) }],
    })
    await actor("pending", active, { terms: [{ status: "pending", requestedAt: new Date(now - day) }] })
    await actor("revoked", active, {
      terms: [{ ...current, status: "revoked" }],
    })
    await actor("rejected", active, { terms: [{ status: "rejected", requestedAt: new Date(now - day) }] })
    await actor("none", active)
    // The latest term wins: an older approved term does not outlive a newer revoke.
    await actor("latestRevoked", active, {
      terms: [
        { ...current, requestedAt: new Date(now - 10 * day) },
        { ...current, status: "revoked", requestedAt: new Date(now - day) },
      ],
    })
    await actor("inactiveMember", active, { memberStatus: "inactive", terms: [current] })
    await actor("deletedUser", active, { deleted: true, terms: [current] })
    await actor("adminOn", active, { role: "tenant_admin" })
    await actor("adminOff", off, { role: "tenant_admin" })
    await actor("memberOff", off, { terms: [current] })
    await actor("suspendedTenant", suspended, { terms: [current] })
    await actor("purgingTenant", purging, { terms: [current] })
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${tag}@example.test` } } })
  })

  async function snapshot(key: string, override: Partial<Actor> = {}) {
    return getCooperativeMobileAccessSnapshot({ ...actors[key]!, ...override })
  }

  test("a member with a current approved term is allowed until the term ends", async () => {
    const result = await snapshot("active")
    expect(result.accessAllowed).toBe(true)
    expect(result.status).toBe("active")
    expect(result.accessEndsAt).toBeInstanceOf(Date)
    expect(result.userBinding).toBe(actors.active!.userId)
  })

  test("expired, pending, revoked, rejected and missing terms are refused", async () => {
    expect(await snapshot("expired")).toMatchObject({ accessAllowed: false, status: "expired", accessEndsAt: null })
    expect(await snapshot("pending")).toMatchObject({ accessAllowed: false, status: "pending" })
    expect(await snapshot("revoked")).toMatchObject({ accessAllowed: false, status: "revoked" })
    expect(await snapshot("rejected")).toMatchObject({ accessAllowed: false, status: "rejected" })
    expect(await snapshot("none")).toMatchObject({ accessAllowed: false, status: "not_requested" })
    expect(await snapshot("latestRevoked")).toMatchObject({ accessAllowed: false, status: "revoked" })
  })

  test("only an active member record carries the term", async () => {
    expect(await snapshot("inactiveMember")).toMatchObject({ accessAllowed: false, status: "not_requested" })
  })

  test("a deleted user, suspended tenant or purging QA tenant is refused", async () => {
    for (const key of ["deletedUser", "suspendedTenant", "purgingTenant"]) {
      expect(await snapshot(key)).toMatchObject({ accessAllowed: false, status: "not_requested" })
    }
  })

  test("staff follow the cooperative switch; member terms do not depend on it", async () => {
    expect(await snapshot("adminOn")).toMatchObject({ accessAllowed: true, status: "active", accessEndsAt: null })
    expect(await snapshot("adminOff")).toMatchObject({ accessAllowed: false, status: "not_requested" })
    // Unchanged rule: a member's own current term decides, as before T03.
    expect(await snapshot("memberOff")).toMatchObject({ accessAllowed: true, status: "active" })
  })

  test("tenant isolation: a membership is never read across tenants or users", async () => {
    // Right membership, wrong tenant.
    expect(await snapshot("active", { tenantId: otherTenantId })).toMatchObject({ accessAllowed: false })
    // Another user's membership id with my user id.
    expect(
      await snapshot("active", { membershipId: actors.adminOn!.membershipId })
    ).toMatchObject({ accessAllowed: false })
    // My membership id with another member's user id (their term is current).
    expect(
      await snapshot("pending", { userId: actors.active!.userId })
    ).toMatchObject({ accessAllowed: false })
  })
})
