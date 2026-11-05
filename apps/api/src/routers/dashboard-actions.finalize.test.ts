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
const slug = `go-live-action-${crypto.randomUUID().slice(0, 8)}`
const createCaller = createCallerFactory(appRouter)

type Admin = {
  membershipId: string
  tenantId: string
  userId: string
}

runIntegration("finalizeInitialMigrationAction (go live)", () => {
  const tenantIds: string[] = []

  async function createAdminTenant(input: {
    label: string
    withChargeSchedule: boolean
  }): Promise<Admin> {
    if (!prisma) throw new Error("Database integration test not configured.")

    const tenant = await prisma.tenant.create({
      data: {
        name: `Go Live ${input.label} Cooperative`,
        slug: `${slug}-${input.label}`,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantIds.push(tenant.id)

    const user = await prisma.user.create({
      data: {
        email: `${slug}-${input.label}@example.test`,
        fullName: `Go Live ${input.label} Admin`,
        tenantId: tenant.id,
      },
    })
    const membership = await prisma.membership.create({
      data: {
        isDefault: true,
        role: "tenant_admin",
        tenantId: tenant.id,
        userId: user.id,
      },
    })

    await prisma.tenantPolicy.create({
      data: {
        migrationSetupConfirmedAt: new Date(),
        migrationSetupMode: "brought_forward",
        tenantId: tenant.id,
      },
    })
    // No historical business profits: satisfies the profit pool and season
    // setup keys without creating profit entries.
    await prisma.auditLog.create({
      data: {
        action: "migration.business_profit_pools.reviewed",
        actorType: "user",
        actorUserId: user.id,
        entityId: tenant.id,
        entityType: "Tenant",
        occurredAt: new Date(),
        tenantId: tenant.id,
      },
    })

    if (input.withChargeSchedule) {
      const charge = await prisma.chargeDefinition.create({
        data: {
          amount: 500,
          code: "MONTHLY-LEVY",
          kind: "fixed",
          name: "Monthly levy",
          tenantId: tenant.id,
        },
      })
      await prisma.chargeDefinitionVersion.create({
        data: {
          amount: 500,
          chargeDefinitionId: charge.id,
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          tenantId: tenant.id,
        },
      })
    }

    return { membershipId: membership.id, tenantId: tenant.id, userId: user.id }
  }

  async function callerFor(admin: Admin) {
    const token = await createSignedSessionToken({
      membershipId: admin.membershipId,
      scope: platformSessionScope,
      tenantId: admin.tenantId,
      userId: admin.userId,
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )
    return createCaller(context)
  }

  async function readFinalizationState(tenantId: string) {
    if (!prisma) throw new Error("Database integration test not configured.")

    const [tenant, audits] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({
        select: {
          initialMigrationStatus: true,
          migrationFinalizedAt: true,
          migrationFinalizedByUserId: true,
        },
        where: { id: tenantId },
      }),
      prisma.auditLog.findMany({
        select: { actorUserId: true, metadata: true },
        where: { action: "migration.initial.finalized", tenantId },
      }),
    ])

    return { audits, tenant }
  }

  let ready: Admin
  let missingSetup: Admin

  beforeAll(async () => {
    ;[ready, missingSetup] = await Promise.all([
      createAdminTenant({ label: "ready", withChargeSchedule: true }),
      createAdminTenant({ label: "missing", withChargeSchedule: false }),
    ])
  })

  afterAll(async () => {
    if (!prisma) return
    if (tenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    }
    await prisma.$disconnect()
  })

  test.each([
    ["missing", []],
    ["false", [["confirmed", "false"]]],
    ["empty", [["confirmed", ""]]],
    ["the old typed phrase", [["confirmation", "FINALIZE MIGRATION"]]],
  ] as Array<[string, Array<[string, string]>]>)(
    "rejects a %s confirmation without writing anything",
    async (_label, fields) => {
      const caller = await callerFor(ready)

      await expect(
        caller.dashboardActions.finalizeInitialMigrationAction({ fields })
      ).rejects.toThrow("Tick the confirmation to go live.")

      const state = await readFinalizationState(ready.tenantId)
      expect(state.tenant.initialMigrationStatus).not.toBe("live_operations")
      expect(state.tenant.migrationFinalizedAt).toBeNull()
      expect(state.audits).toHaveLength(0)
    }
  )

  test("keeps the setup precondition when the box is ticked", async () => {
    const caller = await callerFor(missingSetup)

    await expect(
      caller.dashboardActions.finalizeInitialMigrationAction({
        fields: [["confirmed", "on"]],
      })
    ).rejects.toThrow("charge_schedules")

    const state = await readFinalizationState(missingSetup.tenantId)
    expect(state.tenant.initialMigrationStatus).not.toBe("live_operations")
    expect(state.tenant.migrationFinalizedAt).toBeNull()
    expect(state.audits).toHaveLength(0)
  })

  test("goes live and records the checkbox confirmation in the audit", async () => {
    const caller = await callerFor(ready)

    const result = await caller.dashboardActions.finalizeInitialMigrationAction(
      { fields: [["confirmed", "on"]] }
    )

    expect(result.revalidatePaths).toEqual(
      expect.arrayContaining(["/settings/finance", "/getting-started", "/"])
    )

    const state = await readFinalizationState(ready.tenantId)
    expect(state.tenant).toMatchObject({
      initialMigrationStatus: "live_operations",
      migrationFinalizedByUserId: ready.userId,
    })
    expect(state.tenant.migrationFinalizedAt).toBeInstanceOf(Date)
    expect(state.audits).toHaveLength(1)
    expect(state.audits[0]).toMatchObject({
      actorUserId: ready.userId,
      metadata: {
        confirmation: "checkbox",
        nextStatus: "live_operations",
      },
    })
  })
})
