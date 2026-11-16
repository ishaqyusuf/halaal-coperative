import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { contributionsRouter } from "./contributions.route"
import { filtersRouter } from "./filters.route"
import { membersRouter } from "./members.route"
import { paymentReceiptsRouter } from "./payment-receipts.route"
import { repaymentsRouter } from "./repayments.route"
import { shareApplicationsRouter } from "./share-applications.route"

// Role-restricted sidebar pages (/members, /contributions, /repayments,
// /shares): every procedure they prefetch or open must allow exactly the
// roles lib/navigation/registry.ts gives the page, before any database work.
// (/member-signup-links has no tRPC reads; its server loader and its four
// dashboard actions check memberManagementRoles.)
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

const staff: CooperativeRole[] = [
  "tenant_admin",
  "finance_officer",
  "operations_officer",
]
const memberManagers: CooperativeRole[] = ["tenant_admin", "operations_officer"]
const finance: CooperativeRole[] = ["tenant_admin", "finance_officer"]

type Call = {
  allowed: CooperativeRole[]
  input: unknown
  procedure: string
  router: keyof Routers
}

const calls: Call[] = [
  // /members (operations roles); the picker serves every staff page.
  { router: "members", procedure: "list", input: {}, allowed: memberManagers },
  {
    router: "members",
    procedure: "get",
    input: { memberId: id },
    allowed: memberManagers,
  },
  {
    router: "members",
    procedure: "updateStatus",
    input: { memberId: id, status: "active" },
    allowed: memberManagers,
  },
  { router: "members", procedure: "options", input: {}, allowed: staff },
  // Other staff pickers on new-request, receipt and contribution forms: every
  // staff role, admins included.
  {
    router: "contributions",
    procedure: "memberPlanOptions",
    input: { memberId: id },
    allowed: staff,
  },
  {
    router: "paymentReceipts",
    procedure: "memberOptions",
    input: { memberId: id },
    allowed: staff,
  },
  // /contributions (all staff)
  { router: "contributions", procedure: "ledger", input: {}, allowed: staff },
  {
    router: "contributions",
    procedure: "memberHistory",
    input: { memberId: id },
    allowed: staff,
  },
  { router: "filters", procedure: "contributions", input: {}, allowed: staff },
  // /repayments (finance roles)
  { router: "repayments", procedure: "history", input: {}, allowed: finance },
  { router: "repayments", procedure: "schedule", input: {}, allowed: finance },
  { router: "filters", procedure: "repayments", input: {}, allowed: finance },
  // /shares (finance roles and members; members see only their own)
  {
    router: "shares",
    procedure: "list",
    input: {},
    allowed: [...finance, "member"],
  },
  {
    router: "shares",
    procedure: "get",
    input: { memberShareApplicationId: id },
    allowed: [...finance, "member"],
  },
]

type Routers = Awaited<ReturnType<typeof callersFor>>

async function callersFor(role: CooperativeRole) {
  // The seeded Amanah admin, signed in, with the active role swapped: the
  // role checks read only ctx.auth.activeMembership.role.
  const token = await createSignedSessionToken({
    membershipId: "membership-amanah-admin",
    scope: platformSessionScope,
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
  })
  const ctx = await buildRequestContext(
    new Headers({
      authorization: `Bearer ${token}`,
      host: "api.halaalvest.localhost",
    })
  )
  const membership = ctx.auth.activeMembership
  if (!membership) throw new Error("Seeded admin has no active membership.")
  const withRole = {
    ...ctx,
    auth: { ...ctx.auth, activeMembership: { ...membership, role } },
  }
  const routers = {
    contributions: createCallerFactory(contributionsRouter)(withRole),
    filters: createCallerFactory(filtersRouter)(withRole),
    members: createCallerFactory(membersRouter)(withRole),
    paymentReceipts: createCallerFactory(paymentReceiptsRouter)(withRole),
    repayments: createCallerFactory(repaymentsRouter)(withRole),
    shares: createCallerFactory(shareApplicationsRouter)(withRole),
  }
  return routers as unknown as Record<
    keyof typeof routers,
    Record<string, (input: unknown) => Promise<unknown>>
  >
}

async function outcome(call: Promise<unknown>) {
  return call.then(
    () => "ok",
    (error: { code?: string }) => error.code ?? "ERROR"
  )
}

describe("staff page procedures follow the navigation registry", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })

  for (const role of [...staff, "member", "super_admin"] as CooperativeRole[]) {
    test(`${role}`, async () => {
      const api = await callersFor(role)
      for (const { allowed, input, procedure, router } of calls) {
        const code = await outcome(api[router][procedure]!(input))
        const label = `${role} → ${router}.${procedure}`
        // A platform admin can open every staff page.
        if (allowed.includes(role) || role === "super_admin") {
          expect(code, label).not.toBe("FORBIDDEN")
          expect(code, label).not.toBe("UNAUTHORIZED")
        } else {
          expect(code, label).toBe("FORBIDDEN")
        }
      }
    })
  }
})
