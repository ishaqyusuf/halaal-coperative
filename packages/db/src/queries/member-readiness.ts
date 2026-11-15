import type {
  KycStatus,
  MemberStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"
import { getExpectedMemberBackfillMonthKeys } from "./migration"
import type { TenantMigrationSetupMode } from "./tenant-finance"

export type MemberOperationalReadinessIssue =
  | "member_inactive"
  | "kyc_unverified"
  | "migration_incomplete"

export type MemberMigrationReadinessState =
  | "not_required"
  | "not_started"
  | "draft"
  | "applied"

export type MemberOperationalReadiness = {
  isReady: boolean
  issues: MemberOperationalReadinessIssue[]
  migration: {
    appliedBatchId: string | null
    appliedMonthCount: number
    appliedOpeningBalanceId: string | null
    draftBatchId: string | null
    mode: TenantMigrationSetupMode
    required: boolean
    state: MemberMigrationReadinessState
  }
  status: "verified" | "action_required"
}

type MemberReadinessInput = {
  appliedBackfillBatchId?: string | null
  appliedBackfillMonthCount?: number
  appliedBackfillMonthKeys?: string[]
  appliedOpeningBalanceId?: string | null
  draftBackfillBatchId?: string | null
  joinedAt: Date
  kycStatus: KycStatus
  memberStatus: MemberStatus
  migrationSetupMode: TenantMigrationSetupMode
  tenantStartDate?: Date | null
}

function monthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

export function isMemberMigrationFinalized(
  readiness: MemberOperationalReadiness
) {
  return (
    readiness.migration.state === "applied" ||
    readiness.migration.state === "not_required"
  )
}

export function resolveMemberOperationalReadiness(
  input: MemberReadinessInput,
  now = new Date()
): MemberOperationalReadiness {
  const appliedMonthKeys = new Set(input.appliedBackfillMonthKeys ?? [])
  const appliedMonthCount =
    input.appliedBackfillMonthCount ?? appliedMonthKeys.size
  const expectedMonthKeys = getExpectedMemberBackfillMonthKeys({
    asOf: now,
    joinedAt: input.joinedAt,
    tenantStartDate: input.tenantStartDate,
  })
  const migrationRequired =
    input.migrationSetupMode === "brought_forward" ||
    expectedMonthKeys.length > 0
  const hasCompleteHistoricalBackfill =
    Boolean(input.appliedBackfillBatchId) ||
    (expectedMonthKeys.length > 0 &&
      expectedMonthKeys.every((key) => appliedMonthKeys.has(key)))
  const migrationApplied =
    input.migrationSetupMode === "brought_forward"
      ? Boolean(input.appliedOpeningBalanceId)
      : hasCompleteHistoricalBackfill
  const hasMigrationDraft =
    Boolean(input.draftBackfillBatchId) || appliedMonthCount > 0
  const migrationState: MemberMigrationReadinessState = !migrationRequired
    ? "not_required"
    : migrationApplied
      ? "applied"
      : hasMigrationDraft
        ? "draft"
        : "not_started"
  const issues: MemberOperationalReadinessIssue[] = []

  if (input.memberStatus !== "active") {
    issues.push("member_inactive")
  }

  if (input.kycStatus !== "verified") {
    issues.push("kyc_unverified")
  }

  if (migrationRequired && migrationState !== "applied") {
    issues.push("migration_incomplete")
  }

  return {
    isReady: issues.length === 0,
    issues,
    migration: {
      appliedBatchId: input.appliedBackfillBatchId ?? null,
      appliedMonthCount,
      appliedOpeningBalanceId: input.appliedOpeningBalanceId ?? null,
      draftBatchId: input.draftBackfillBatchId ?? null,
      mode: input.migrationSetupMode,
      required: migrationRequired,
      state: migrationState,
    },
    status: issues.length === 0 ? "verified" : "action_required",
  }
}

/**
 * Ids of the tenant's members whose migration is finalized, decided in SQL
 * with the same rules as `resolveMemberOperationalReadiness` +
 * `isMemberMigrationFinalized`, so registry counts and migration-filtered
 * pages never load every member row into memory.
 */
export async function listMigrationFinalizedMemberIds(
  tenantId: string,
  prismaOverride?: PrismaClient,
  asOf = new Date(),
  options: { memberId?: string } = {}
): Promise<string[]> {
  const memberId = options.memberId ?? null
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const currentMonth = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1)
  ).toISOString()
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH settings AS (
      SELECT t.start_date::timestamp AS tenant_start,
             p.migration_setup_mode::text AS policy_mode,
             ${currentMonth}::timestamp AS current_month
      FROM tenants t
      LEFT JOIN tenant_policies p ON p.tenant_id = t.id
      WHERE t.id = ${tenantId}::uuid
    ),
    scoped AS (
      SELECT m.id,
             s.policy_mode,
             s.current_month,
             date_trunc(
               'month',
               GREATEST(m.joined_at AT TIME ZONE 'UTC', s.tenant_start)
             ) AS start_month,
             EXISTS (
               SELECT 1 FROM backfill_batches b
               WHERE b.tenant_id = m.tenant_id
                 AND b.member_id = m.id
                 AND b.status = 'applied'
             ) AS has_applied_batch,
             EXISTS (
               SELECT 1 FROM member_opening_balances o
               WHERE o.tenant_id = m.tenant_id
                 AND o.member_id = m.id
                 AND o.status = 'applied'
             ) AS has_applied_opening_balance
      FROM members m
      CROSS JOIN settings s
      WHERE m.tenant_id = ${tenantId}::uuid
        AND (${memberId}::uuid IS NULL OR m.id = ${memberId}::uuid)
    ),
    measured AS (
      SELECT scoped.*,
             (EXTRACT(YEAR FROM current_month) - EXTRACT(YEAR FROM start_month)) * 12
               + (EXTRACT(MONTH FROM current_month) - EXTRACT(MONTH FROM start_month))
               AS expected_months,
             (
               SELECT count(DISTINCT date_trunc('month', a.month::timestamp))
               FROM applied_backfill_months a
               WHERE a.tenant_id = ${tenantId}::uuid
                 AND a.member_id = scoped.id
                 AND a.month::timestamp >= start_month
                 AND a.month::timestamp < current_month
             ) AS covered_months
      FROM scoped
    )
    SELECT id::text AS id
    FROM measured
    WHERE CASE
      WHEN policy_mode = 'brought_forward'
        OR (policy_mode IS NULL AND has_applied_opening_balance)
        THEN has_applied_opening_balance
      ELSE expected_months <= 0
        OR has_applied_batch
        OR covered_months >= expected_months
    END
  `

  return rows.map((row) => row.id)
}

/**
 * Whether one member may use member services: the `isReady` flag of
 * `getMemberOperationalReadiness` without its issue list. Status and KYC come
 * from the member row the caller already has; migration completeness is one
 * SQL statement (`listMigrationFinalizedMemberIds`, same rules), skipped when
 * status or KYC already says no. The full read takes 6 statements.
 */
export async function isMemberOperationallyReady(
  input: {
    member: { id: string; kycStatus: KycStatus; status: MemberStatus }
    tenantId: string
  },
  prismaOverride?: PrismaClient,
  asOf = new Date()
): Promise<boolean> {
  if (input.member.status !== "active" || input.member.kycStatus !== "verified")
    return false

  const finalized = await listMigrationFinalizedMemberIds(
    input.tenantId,
    prismaOverride,
    asOf,
    { memberId: input.member.id }
  )

  return finalized.includes(input.member.id)
}

export async function getMembersOperationalReadiness(
  input: {
    memberIds: string[]
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<Map<string, MemberOperationalReadiness>> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (input.memberIds.length === 0) {
    return new Map<string, MemberOperationalReadiness>()
  }

  const [tenant, policy, members, batches, months, openingBalances] =
    await Promise.all([
      typeof prisma.tenant?.findUnique === "function"
        ? prisma.tenant.findUnique({
            select: {
              startDate: true,
            },
            where: { id: input.tenantId },
          })
        : Promise.resolve({
            startDate: null,
          }),
      typeof prisma.tenantPolicy?.findUnique === "function"
        ? prisma.tenantPolicy.findUnique({
            select: { migrationSetupMode: true },
            where: { tenantId: input.tenantId },
          })
        : Promise.resolve(null),
      prisma.member.findMany({
        select: {
          id: true,
          joinedAt: true,
          kycStatus: true,
          status: true,
        },
        where: {
          id: { in: input.memberIds },
          tenantId: input.tenantId,
        },
      }),
      typeof prisma.backfillBatch?.findMany === "function"
        ? prisma.backfillBatch.findMany({
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              memberId: true,
              status: true,
            },
            where: {
              memberId: { in: input.memberIds },
              tenantId: input.tenantId,
            },
          })
        : Promise.resolve([]),
      typeof prisma.appliedBackfillMonth?.findMany === "function"
        ? prisma.appliedBackfillMonth.findMany({
            select: {
              memberId: true,
              month: true,
            },
            where: {
              memberId: { in: input.memberIds },
              tenantId: input.tenantId,
            },
          })
        : Promise.resolve([]),
      typeof prisma.memberOpeningBalance?.findMany === "function"
        ? prisma.memberOpeningBalance.findMany({
            select: {
              id: true,
              memberId: true,
            },
            where: {
              memberId: { in: input.memberIds },
              status: "applied",
              tenantId: input.tenantId,
            },
          })
        : Promise.resolve([]),
    ])

  const setupMode: TenantMigrationSetupMode =
    policy?.migrationSetupMode === "brought_forward"
      ? "brought_forward"
      : "historical_backfill"

  return new Map<string, MemberOperationalReadiness>(
    members.map(
      (member: {
        id: string
        joinedAt: Date
        kycStatus: KycStatus
        status: MemberStatus
      }) => {
        const memberBatches = batches.filter(
          (batch: { memberId: string }) => batch.memberId === member.id
        )
        const appliedBatch = memberBatches.find(
          (batch: { status: string }) => batch.status === "applied"
        )
        const draftBatch = memberBatches.find(
          (batch: { status: string }) => batch.status !== "applied"
        )
        const memberMonths = months.filter(
          (month: { memberId: string }) => month.memberId === member.id
        )
        const appliedMonthKeys = memberMonths
          .filter((month: { month?: Date }) => month.month instanceof Date)
          .map((month: { month: Date }) => monthKey(month.month))
        const appliedOpeningBalance = openingBalances.find(
          (openingBalance: { memberId: string }) =>
            openingBalance.memberId === member.id
        )

        const effectiveSetupMode: TenantMigrationSetupMode =
          !policy?.migrationSetupMode && appliedOpeningBalance
            ? "brought_forward"
            : setupMode

        return [
          member.id,
          resolveMemberOperationalReadiness({
            appliedBackfillBatchId: appliedBatch?.id,
            appliedBackfillMonthCount: memberMonths.length,
            appliedBackfillMonthKeys: appliedMonthKeys,
            appliedOpeningBalanceId: appliedOpeningBalance?.id,
            draftBackfillBatchId: draftBatch?.id,
            joinedAt: member.joinedAt ?? new Date(),
            kycStatus: member.kycStatus ?? "not_started",
            memberStatus: member.status ?? "active",
            migrationSetupMode: effectiveSetupMode,
            tenantStartDate: tenant?.startDate,
          }),
        ] as const
      }
    )
  )
}

export async function getMemberOperationalReadiness(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const readinessByMemberId = await getMembersOperationalReadiness(
    {
      memberIds: [input.memberId],
      tenantId: input.tenantId,
    },
    prismaOverride
  )

  return readinessByMemberId.get(input.memberId) ?? null
}

export async function assertMemberOperationalReadiness(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const readiness = await getMemberOperationalReadiness(input, prismaOverride)

  if (!readiness) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage: "Member profile needs linking before continuing.",
    })
  }

  if (!readiness.isReady) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Member verification is required before financial or operational actions can continue.",
    })
  }

  return readiness
}
