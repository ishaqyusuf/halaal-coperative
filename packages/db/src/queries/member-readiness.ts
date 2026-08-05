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
  const migrationRequired =
    input.migrationSetupMode === "brought_forward" ||
    monthKey(input.joinedAt) < monthKey(now)
  const appliedMonthKeys = new Set(input.appliedBackfillMonthKeys ?? [])
  const appliedMonthCount =
    input.appliedBackfillMonthCount ?? appliedMonthKeys.size
  const expectedMonthKeys = getExpectedMemberBackfillMonthKeys({
    asOf: now,
    joinedAt: input.joinedAt,
    tenantStartDate: input.tenantStartDate,
  })
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
