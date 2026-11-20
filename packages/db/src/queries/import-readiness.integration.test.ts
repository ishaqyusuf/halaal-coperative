import { afterAll, describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getTenantImportReadiness } from "./import-readiness"
import { getTenantInitialMigrationState } from "./migration"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const rollback = new Error("rollback import readiness fixtures")

run("import readiness in PostgreSQL", () => {
  afterAll(async () => {
    await db?.$disconnect()
  })

  test("matches the migration checklist across setup, backfill and go-live", async () => {
    const date = new Date("2025-01-01T00:00:00.000Z")
    await expect(
      db!.$transaction(async (tx) => {
        const client = tx as PrismaClient
        const { id: tenantId } = await tx.tenant.create({
          data: { name: "Import readiness", slug: crypto.randomUUID() },
        })
        const { id: otherTenantId } = await tx.tenant.create({
          data: { name: "Other import readiness", slug: crypto.randomUUID() },
        })

        const read = async (id = tenantId) => {
          const readiness = await getTenantImportReadiness(id, client)
          const { counts, snapshot } = await getTenantInitialMigrationState(
            id,
            client
          )
          const missing = new Set(snapshot.missingStepKeys)

          expect(readiness).toEqual({
            canUseMigrationTools: snapshot.canUseMigrationTools,
            hasAppliedMemberBackfill:
              counts.appliedBackfillBatches > 0 ||
              counts.appliedBackfillMembers > 0 ||
              counts.appliedBackfillMonths > 0,
            hasBusinessProfitPools: !missing.has("business_profit_pools"),
            hasChargeSchedules: !missing.has("charge_schedules"),
            hasFinanceStartDate: !missing.has("finance_start_date"),
            hasMemberProfiles: !missing.has("member_profiles"),
          })

          return readiness
        }

        const empty = await read()
        expect(empty).toEqual({
          canUseMigrationTools: true,
          hasAppliedMemberBackfill: false,
          hasBusinessProfitPools: false,
          hasChargeSchedules: false,
          hasFinanceStartDate: false,
          hasMemberProfiles: false,
        })
        expect(await read(crypto.randomUUID())).toEqual(empty)

        const { id: memberId } = await tx.member.create({
          data: {
            fullName: "Test Member",
            joinedAt: date,
            memberNumber: "1",
            memberType: "individual",
            tenantId,
          },
        })
        await tx.tenant.update({
          data: { startDate: date },
          where: { id: tenantId },
        })
        const { id: chargeDefinitionId } = await tx.chargeDefinition.create({
          data: {
            amount: "99.01",
            code: "TEST",
            kind: "fixed",
            name: "Test charge",
            tenantId,
          },
        })
        await tx.chargeDefinitionVersion.create({
          data: {
            amount: "99.01",
            chargeDefinitionId,
            effectiveFrom: date,
            kind: "fixed",
            tenantId,
          },
        })
        const { id: markerId } = await tx.auditLog.create({
          data: {
            action: "migration.business_profit_pools.reviewed",
            actorType: "system",
            entityId: tenantId,
            entityType: "Tenant",
            occurredAt: date,
            tenantId,
          },
        })
        expect(await read()).toEqual({
          ...empty,
          hasBusinessProfitPools: true,
          hasChargeSchedules: true,
          hasFinanceStartDate: true,
          hasMemberProfiles: true,
        })
        await tx.auditLog.delete({ where: { id: markerId } })
        expect((await read()).hasBusinessProfitPools).toBe(false)

        await tx.tenantBusinessPolicy.create({
          data: {
            historicalProfitMigrationMode: "no_historical_business_profit",
            tenantId,
          },
        })
        expect((await read()).hasBusinessProfitPools).toBe(true)
        await tx.tenantBusinessPolicy.delete({ where: { tenantId } })

        const { id: shareBusinessId } = await tx.shareBusiness.create({
          data: {
            capitalAmount: 0,
            name: "Test business",
            profitAmount: 0,
            startDate: date,
            tenantId,
          },
        })
        const { id: profitEntryId } = await tx.shareBusinessProfitEntry.create({
          data: {
            allocatableProfitAmount: "99.01",
            profitAmount: "99.01",
            profitDate: date,
            shareBusinessId,
            tenantId,
          },
        })
        expect((await read()).hasBusinessProfitPools).toBe(true)
        await tx.shareBusinessProfitEntry.delete({
          where: { id: profitEntryId },
        })

        await tx.memberOpeningBalance.create({
          data: { memberId, openingDate: date, status: "applied", tenantId },
        })
        expect((await read()).hasAppliedMemberBackfill).toBe(false)
        await tx.tenantPolicy.create({
          data: { migrationSetupMode: "brought_forward", tenantId },
        })
        expect(await read()).toMatchObject({
          hasAppliedMemberBackfill: true,
          hasBusinessProfitPools: true,
        })

        await tx.tenantPolicy.update({
          data: { migrationSetupMode: "historical_backfill" },
          where: { tenantId },
        })
        const { id: batchId } = await tx.backfillBatch.create({
          data: { memberId, rangeEnd: date, rangeStart: date, tenantId },
        })
        expect((await read()).hasAppliedMemberBackfill).toBe(false)
        await tx.appliedBackfillMonth.create({
          data: { batchId, memberId, month: date, sourceKey: "test", tenantId },
        })
        expect((await read()).hasAppliedMemberBackfill).toBe(true)
        await tx.appliedBackfillMonth.deleteMany({ where: { batchId } })
        await tx.backfillBatch.update({
          data: { status: "applied" },
          where: { id: batchId },
        })
        expect((await read()).hasAppliedMemberBackfill).toBe(true)

        await tx.tenant.update({
          data: { initialMigrationStatus: "live_operations" },
          where: { id: tenantId },
        })
        expect((await read()).canUseMigrationTools).toBe(false)
        await tx.tenant.update({
          data: {
            migrationEmergencyUnlockUntil: new Date(Date.now() + 60_000),
          },
          where: { id: tenantId },
        })
        expect((await read()).canUseMigrationTools).toBe(true)

        expect(await read(otherTenantId)).toEqual(empty)
        throw rollback
      })
    ).rejects.toBe(rollback)
  })
})
