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
    [
      "removeTenantPersonFromCooperativeAction",
      [["userId", "00000000-0000-0000-0000-000000000000"]],
    ],
    [
      "restoreTenantPersonAction",
      [["removalId", "00000000-0000-0000-0000-000000000000"]],
    ],
    ["createTenantDomainAction", [["hostname", `${slug}.example.test`]]],
    [
      "runTenantDomainVerificationCheckAction",
      [["domainId", "00000000-0000-0000-0000-000000000000"]],
    ],
    [
      "removeTenantCustomDomainAction",
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

  test("a person's last role can't be removed on its own", async () => {
    await expect(
      run(admin, "removeTenantStaffRoleAction", [
        ["membershipId", finance.membershipId],
        ["role", "finance_officer"],
      ])
    ).rejects.toThrow("Use Remove from cooperative instead.")
    expect(
      await prisma!.membership.count({ where: { id: finance.membershipId } })
    ).toBe(1)
  })

  test("an admin removes one of two staff roles and it is recorded", async () => {
    const extra = await prisma!.membership.create({
      data: {
        isDefault: false,
        role: "operations_officer",
        tenantId,
        userId: finance.userId,
      },
    })

    await run(admin, "removeTenantStaffRoleAction", [
      ["membershipId", extra.id],
      ["role", "operations_officer"],
    ])

    expect(await prisma!.membership.count({ where: { id: extra.id } })).toBe(0)
    expect(
      await prisma!.membership.count({ where: { id: finance.membershipId } })
    ).toBe(1)
    expect(
      await prisma!.auditLog.count({
        where: { action: "membership.removed", entityId: extra.id, tenantId },
      })
    ).toBe(1)
  })

  test("Remove from cooperative refuses yourself, the only admin, member logins and platform admins", async () => {
    await expect(
      run(admin, "removeTenantPersonFromCooperativeAction", [
        ["userId", admin.userId],
      ])
    ).rejects.toThrow("You can't remove yourself.")
    await expect(
      run(superAdmin, "removeTenantPersonFromCooperativeAction", [
        ["userId", admin.userId],
      ])
    ).rejects.toThrow("only admin")
    await expect(
      run(admin, "removeTenantPersonFromCooperativeAction", [
        ["userId", member.userId],
      ])
    ).rejects.toThrow("managed from the member's record")
    await expect(
      run(admin, "removeTenantPersonFromCooperativeAction", [
        ["userId", superAdmin.userId],
      ])
    ).rejects.toThrow("Only Halaalvest staff can remove a platform admin.")
    expect(await prisma!.membershipRemoval.count({ where: { tenantId } })).toBe(
      0
    )
  })

  test("Remove from cooperative keeps the account and other cooperatives, and Restore gives the role back", async () => {
    const otherTenant = await prisma!.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date(),
        name: "Other Cooperative",
        slug: `${slug}-other`,
        status: "active",
      },
    })
    // A role in another cooperative must survive the removal.
    const otherRole = await prisma!.membership.create({
      data: {
        isDefault: true,
        role: "finance_officer",
        tenantId: otherTenant.id,
        userId: finance.userId,
      },
    })

    try {
      await run(admin, "removeTenantPersonFromCooperativeAction", [
        ["userId", finance.userId],
      ])

      expect(
        await prisma!.membership.count({
          where: { tenantId, userId: finance.userId },
        })
      ).toBe(0)
      expect(await prisma!.user.count({ where: { id: finance.userId } })).toBe(
        1
      )
      expect(
        await prisma!.membership.count({ where: { id: otherRole.id } })
      ).toBe(1)
      const removal = await prisma!.membershipRemoval.findFirstOrThrow({
        where: { tenantId, userId: finance.userId, restoredAt: null },
      })
      expect(removal.roles).toEqual(["finance_officer"])
      expect(
        await prisma!.auditLog.count({
          where: { action: "membership.person_removed", entityId: removal.id },
        })
      ).toBe(1)

      // Their old session no longer opens this cooperative.
      await expect(
        run(finance, "removeTenantStaffRoleAction", [
          ["membershipId", operations.membershipId],
          ["role", "operations_officer"],
        ])
      ).rejects.toThrow()

      await run(admin, "restoreTenantPersonAction", [
        ["removalId", removal.id],
      ])

      const restored = await prisma!.membership.findMany({
        where: { tenantId, userId: finance.userId },
      })
      expect(restored.map((role) => role.role)).toEqual(["finance_officer"])
      expect(restored[0]?.isDefault).toBe(true)
      expect(
        (
          await prisma!.membershipRemoval.findUniqueOrThrow({
            where: { id: removal.id },
          })
        ).restoredAt
      ).not.toBeNull()
      expect(
        await prisma!.auditLog.count({
          where: { action: "membership.person_restored", entityId: removal.id },
        })
      ).toBe(1)
      await expect(
        run(admin, "restoreTenantPersonAction", [["removalId", removal.id]])
      ).rejects.toThrow("already restored")
      finance = { ...finance, membershipId: restored[0]!.id }
    } finally {
      await prisma!.tenant.deleteMany({ where: { id: otherTenant.id } })
    }
  })

  test("an admin removes custom addresses, never the Halaalvest one", async () => {
    const hostname = `spare.${slug}.example.test`
    await run(admin, "createTenantDomainAction", [["hostname", hostname]])
    const spare = await prisma!.tenantDomain.findFirstOrThrow({
      select: { id: true },
      where: { hostname, tenantId },
    })
    const site = await prisma!.tenantDomain.create({
      data: {
        hostname: `site.${slug}.example.test`,
        isPrimary: true,
        kind: "site",
        tenantId,
        verificationStatus: "verified",
      },
    })

    await expect(
      run(admin, "removeTenantCustomDomainAction", [["domainId", site.id]])
    ).rejects.toThrow("Your Halaalvest address can't be removed.")
    await run(admin, "removeTenantCustomDomainAction", [["domainId", spare.id]])

    expect(await prisma!.tenantDomain.count({ where: { id: spare.id } })).toBe(
      0
    )
    expect(
      await prisma!.auditLog.count({
        where: { action: "tenant_domain.removed", entityId: spare.id },
      })
    ).toBe(1)
  })
})
