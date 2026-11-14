import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `ws-settings-${crypto.randomUUID().slice(0, 8)}`
const createCaller = createCallerFactory(appRouter)

type Role =
  | "finance_officer"
  | "member"
  | "operations_officer"
  | "super_admin"
  | "tenant_admin"
type Person = { membershipId: string; tenantId: string; userId: string }
type Fields = Array<[string, string]>

runIntegration("workspace settings actions", () => {
  let tenantId = ""
  let admin: Person
  let superAdmin: Person
  let operations: Person
  let finance: Person
  let member: Person

  async function addPerson(role: Role, label: string = role): Promise<Person> {
    if (!prisma) throw new Error("Database integration test not configured.")

    const user = await prisma.user.create({
      data: {
        email: `${slug}-${label}@example.test`,
        fullName: `Settings ${label}`,
        tenantId,
      },
    })
    const membership = await prisma.membership.create({
      data: { isDefault: true, role, tenantId, userId: user.id },
    })

    return { membershipId: membership.id, tenantId, userId: user.id }
  }

  async function run(person: Person, action: string, fields: Fields) {
    const token = await createSignedSessionToken({
      membershipId: person.membershipId,
      scope: platformSessionScope,
      tenantId: person.tenantId,
      userId: person.userId,
    })
    const caller = createCaller(
      await buildRequestContext(
        new Headers({
          authorization: `Bearer ${token}`,
          host: "api.halaalvest.localhost",
        })
      )
    )
    const handler = (
      caller.dashboardActions as unknown as Record<
        string,
        (input: { fields: Fields }) => Promise<unknown>
      >
    )[action]

    if (!handler) throw new Error(`Missing action ${action}`)

    return handler({ fields })
  }

  beforeAll(async () => {
    if (!prisma) return

    const tenant = await prisma.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date(),
        name: "Workspace Settings Cooperative",
        slug,
        status: "active",
      },
    })
    tenantId = tenant.id
    admin = await addPerson("tenant_admin")
    superAdmin = await addPerson("super_admin")
    operations = await addPerson("operations_officer")
    finance = await addPerson("finance_officer")
    member = await addPerson("member")
  })

  afterAll(async () => {
    if (!prisma) return
    if (tenantId) {
      await prisma.auditLog.deleteMany({ where: { tenantId } })
      await prisma.tenant.deleteMany({ where: { id: tenantId } })
    }
    await prisma.$disconnect()
  })

  const adminOnlyActions: Array<[string, Fields]> = [
    [
      "updateCooperativeProfileAction",
      [
        ["name", "Renamed by a non-admin"],
        ["timezone", "Africa/Lagos"],
      ],
    ],
    ["updateTenantTrustProfileAction", [["incidentContactName", "Someone"]]],
    [
      "updateTenantOperationProfileAction",
      [["support_casesAccessMode", "disabled"]],
    ],
    [
      "provisionTenantUserRoleAction",
      [
        ["email", `${slug}-new@example.test`],
        ["fullName", "New Person"],
        ["role", "tenant_admin"],
      ],
    ],
    [
      "removeTenantStaffRoleAction",
      [
        ["membershipId", "00000000-0000-0000-0000-000000000000"],
        ["role", "finance_officer"],
      ],
    ],
    ["createTenantDomainAction", [["hostname", `${slug}.example.test`]]],
    [
      "setTenantDomainPrimaryAction",
      [["domainId", "00000000-0000-0000-0000-000000000000"]],
    ],
    [
      "runTenantDomainVerificationCheckAction",
      [["domainId", "00000000-0000-0000-0000-000000000000"]],
    ],
  ]

  test.each(adminOnlyActions)(
    "a member and an operations officer can't run %s",
    async (action, fields) => {
      await expect(run(member, action, fields)).rejects.toThrow(
        "You do not have access"
      )
      await expect(run(operations, action, fields)).rejects.toThrow(
        "You do not have access"
      )
    }
  )

  test("the profile name is unchanged after the refused saves", async () => {
    const tenant = await prisma!.tenant.findUniqueOrThrow({
      select: { name: true },
      where: { id: tenantId },
    })

    expect(tenant.name).toBe("Workspace Settings Cooperative")
  })

  test("a cooperative admin can't hand out super admin", async () => {
    await expect(
      run(admin, "provisionTenantUserRoleAction", [
        ["email", `${slug}-escalate@example.test`],
        ["fullName", "Escalate"],
        ["role", "super_admin"],
      ])
    ).rejects.toThrow("Choose a role from the list.")
    expect(
      await prisma!.user.count({
        where: { email: `${slug}-escalate@example.test`, tenantId },
      })
    ).toBe(0)
  })

  test("an admin can't remove their own admin role", async () => {
    await expect(
      run(admin, "removeTenantStaffRoleAction", [
        ["membershipId", admin.membershipId],
        ["role", "tenant_admin"],
      ])
    ).rejects.toThrow("You can't remove your own admin role")
  })

  test("the only cooperative admin can't be removed", async () => {
    await expect(
      run(superAdmin, "removeTenantStaffRoleAction", [
        ["membershipId", admin.membershipId],
        ["role", "tenant_admin"],
      ])
    ).rejects.toThrow("only admin")
    expect(
      await prisma!.membership.count({ where: { id: admin.membershipId } })
    ).toBe(1)
  })

  test("a cooperative admin can't remove a super admin", async () => {
    await expect(
      run(admin, "removeTenantStaffRoleAction", [
        ["membershipId", superAdmin.membershipId],
        ["role", "super_admin"],
      ])
    ).rejects.toThrow("Choose a role from the list.")
  })

  test("member logins are not removed from the roles page", async () => {
    await expect(
      run(admin, "removeTenantStaffRoleAction", [
        ["membershipId", member.membershipId],
        ["role", "member"],
      ])
    ).rejects.toThrow("managed from the member's record")
  })

  test("the role named in the confirm must match", async () => {
    await expect(
      run(admin, "removeTenantStaffRoleAction", [
        ["membershipId", finance.membershipId],
        ["role", "operations_officer"],
      ])
    ).rejects.toThrow("This role changed")
    expect(
      await prisma!.membership.count({ where: { id: finance.membershipId } })
    ).toBe(1)
  })

  test("an admin removes a staff role and it is recorded", async () => {
    await run(admin, "removeTenantStaffRoleAction", [
      ["membershipId", finance.membershipId],
      ["role", "finance_officer"],
    ])

    expect(
      await prisma!.membership.count({ where: { id: finance.membershipId } })
    ).toBe(0)
    expect(
      await prisma!.auditLog.count({
        where: {
          action: "membership.removed",
          entityId: finance.membershipId,
          tenantId,
        },
      })
    ).toBe(1)
  })

  test("an unchecked custom address can't become the main address", async () => {
    await run(admin, "createTenantDomainAction", [
      ["hostname", `coop.${slug}.example.test`],
    ])
    const domain = await prisma!.tenantDomain.findFirstOrThrow({
      select: { id: true },
      where: { hostname: `coop.${slug}.example.test`, tenantId },
    })

    await expect(
      run(admin, "setTenantDomainPrimaryAction", [["domainId", domain.id]])
    ).rejects.toThrow("must be verified")
  })
})
