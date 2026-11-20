import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  isPrismaMissingColumnError,
  isPrismaMissingTableError,
} from "../prisma-errors"
import {
  getTenantFinanceSetupLock,
  getTenantInitialMigrationState,
} from "./migration"

type ImportSetupRow = {
  has_business_profit_pools: boolean
  has_charge_schedules: boolean
  has_finance_start_date: boolean
  has_member_profiles: boolean
}

/** Imports needs setup and lock flags without calculating member/month coverage. */
export async function getTenantImportReadiness(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (typeof prisma?.$queryRaw === "function") {
    try {
      const [lock, [row]] = await Promise.all([
        getTenantFinanceSetupLock(tenantId, prisma),
        prisma.$queryRaw<ImportSetupRow[]>`
          SELECT
            t.start_date IS NOT NULL AS has_finance_start_date,
            EXISTS (
              SELECT 1 FROM charge_definition_versions c WHERE c.tenant_id = t.id
            ) AS has_charge_schedules,
            (
              tp.migration_setup_mode = 'brought_forward'
              OR bp.historical_profit_migration_mode = 'no_historical_business_profit'
              OR EXISTS (
                SELECT 1 FROM share_business_profit_entries p WHERE p.tenant_id = t.id
              )
              OR EXISTS (
                SELECT 1 FROM audit_logs a
                WHERE a.tenant_id = t.id AND a.entity_type = 'Tenant'
                  AND a.action = 'migration.business_profit_pools.reviewed'
              )
            ) IS TRUE AS has_business_profit_pools,
            EXISTS (
              SELECT 1 FROM members m WHERE m.tenant_id = t.id
            ) AS has_member_profiles
          FROM tenants t
          LEFT JOIN tenant_policies tp ON tp.tenant_id = t.id
          LEFT JOIN tenant_business_policies bp ON bp.tenant_id = t.id
          WHERE t.id = ${tenantId}::uuid
        `,
      ])

      return {
        canUseMigrationTools: lock.canUseMigrationTools,
        hasAppliedMemberBackfill: lock.hasAppliedMemberBackfill,
        hasBusinessProfitPools: row?.has_business_profit_pools ?? false,
        hasChargeSchedules: row?.has_charge_schedules ?? false,
        hasFinanceStartDate: row?.has_finance_start_date ?? false,
        hasMemberProfiles: row?.has_member_profiles ?? false,
      }
    } catch (error) {
      // The full reader tolerates older schemas without optional policy fields.
      if (
        !isPrismaMissingColumnError(error) &&
        !isPrismaMissingTableError(error)
      ) {
        throw error
      }
    }
  }

  const { counts, snapshot } = await getTenantInitialMigrationState(
    tenantId,
    prismaOverride
  )
  const missing = new Set(snapshot.missingStepKeys)
  return {
    canUseMigrationTools: snapshot.canUseMigrationTools,
    hasAppliedMemberBackfill:
      counts.appliedBackfillBatches > 0 ||
      counts.appliedBackfillMonths > 0 ||
      counts.appliedBackfillMembers > 0,
    hasBusinessProfitPools: !missing.has("business_profit_pools"),
    hasChargeSchedules: !missing.has("charge_schedules"),
    hasFinanceStartDate: !missing.has("finance_start_date"),
    hasMemberProfiles: !missing.has("member_profiles"),
  }
}
