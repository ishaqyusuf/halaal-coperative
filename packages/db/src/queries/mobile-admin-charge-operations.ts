import {
  Prisma,
  type ChargeDefinition,
  type PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  applyCharge,
  reverseChargeApplication,
  settleChargeApplication,
  waiveChargeApplication,
  type ChargeCollectionMode,
} from "./charges"
import { systemBillingChargeCodes } from "./cooperative-mobile-billing-constants"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"

export const mobileAdminChargeLanes = [
  "applications",
  "levies",
  "rules",
] as const

export type MobileAdminChargeLane = (typeof mobileAdminChargeLanes)[number]

export type MobileAdminChargeCapabilities = {
  correct: boolean
  manage: boolean
  view: boolean
}

export type MobileAdminChargeFilters = {
  collectionMode?: ChargeCollectionMode | null
  fromDate?: Date | null
  memberId?: string | null
  purpose?: string | null
  status?: string | null
  toDate?: Date | null
  workflow?: string | null
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

function fingerprint(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, Array.isArray(item) ? [...item] : item])
    )
  )
}

function assertExpectedState(actual: string, expected: string) {
  if (actual !== expected) {
    throw ExpectedQueryError.conflict(
      "This charge changed since it was loaded. Refresh before continuing."
    )
  }
}

function monthBounds(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  }
}

export function calculateMobileAdminChargeAmount(input: {
  basisAmount?: number | null
  chargeValueType: "fixed_amount" | "percentage"
  rate: number
}) {
  return input.chargeValueType === "percentage"
    ? Number((((input.basisAmount ?? 0) * input.rate) / 100).toFixed(2))
    : Number(input.rate.toFixed(2))
}

export function getMobileAdminChargeDuplicateStrategy(input: {
  chargeFrequency: string
  isMonthlyLevy: boolean
}) {
  if (input.isMonthlyLevy) return "member_definition_period" as const
  if (input.chargeFrequency === "one_time")
    return "member_definition_forever" as const
  return "none" as const
}

function periodLabel(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

function workflowTarget(application: any) {
  if (application.procurementRequest)
    return {
      id: application.procurementRequest.id,
      label: application.procurementRequest.itemName,
      state: application.procurementRequest.status,
      type: "procurement_request",
    }
  if (application.projectFinancingRequest)
    return {
      id: application.projectFinancingRequest.id,
      label: application.projectFinancingRequest.businessName,
      state: application.projectFinancingRequest.status,
      type: "project_financing_request",
    }
  if (application.foodPurchaseApplication)
    return {
      id: application.foodPurchaseApplication.id,
      label: "Food purchase application",
      state: application.foodPurchaseApplication.status,
      type: "food_purchase_application",
    }
  if (application.loanRequest)
    return {
      id: application.loanRequest.id,
      label: "Financing request",
      state: application.loanRequest.status,
      type: "loan_request",
    }
  if (application.loan)
    return {
      id: application.loan.id,
      label: "Financing account",
      state: application.loan.status,
      type: "loan",
    }
  if (application.contributionId)
    return {
      id: application.contributionId,
      label: "Contribution",
      state: "posted",
      type: "commitment_collection",
    }
  return null
}

function applicationRow(application: any) {
  const workflow =
    application.chargeApplicability?.workflow ??
    (application.procurementRequestId
      ? "procurement_request"
      : application.projectFinancingRequestId
        ? "project_financing_request"
        : application.foodPurchaseApplicationId
          ? "food_purchase_application"
          : application.loanRequestId
            ? "loan_request"
            : application.loanId
              ? "loan"
              : application.contributionId
                ? "commitment_collection"
                : "manual")
  return {
    amount: Number(application.amount),
    assessedAt: application.assessedAt,
    collectionMode: application.collectionMode,
    definitionCode: application.chargeDefinition.code,
    definitionName: application.chargeDefinition.name,
    id: application.id,
    isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
    memberId: application.member.id,
    memberName: application.member.fullName,
    memberNumber: application.member.memberNumber,
    periodLabel: periodLabel(application.assessedAt),
    purpose: application.chargeDefinition.purpose,
    status: application.status,
    trigger: application.chargeApplicability?.trigger ?? "manual",
    workflow,
  }
}

const applicationInclude = {
  chargeApplicability: true,
  chargeDefinition: true,
  foodPurchaseApplication: { select: { id: true, status: true } },
  loan: { select: { id: true, status: true } },
  loanRequest: { select: { id: true, status: true } },
  member: { select: { fullName: true, id: true, memberNumber: true } },
  procurementRequest: { select: { id: true, itemName: true, status: true } },
  projectFinancingRequest: {
    select: { businessName: true, id: true, status: true },
  },
} as const

async function workspaceStats(tenantId: string, prisma: PrismaClient) {
  const from = new Date()
  from.setUTCDate(1)
  from.setUTCHours(0, 0, 0, 0)
  const outstanding = await prisma.chargeApplication.aggregate({
    _sum: { amount: true },
    where: { status: "pending", tenantId },
  })
  const postedThisMonth = await prisma.chargeApplication.aggregate({
    _sum: { amount: true },
    where: { assessedAt: { gte: from }, status: "posted", tenantId },
  })
  const corrections = await prisma.chargeApplication.count({
    where: {
      status: { in: ["reversed", "waived"] },
      updatedAt: { gte: from },
      tenantId,
    },
  })
  return {
    corrections,
    outstanding: Number(outstanding._sum.amount ?? 0),
    postedThisMonth: Number(postedThisMonth._sum.amount ?? 0),
  }
}

export async function getMobileAdminChargeSummary(
  input: { capabilities: MobileAdminChargeCapabilities; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const generatedAt = new Date()
  const { from } = monthBounds(
    generatedAt.getUTCFullYear(),
    generatedAt.getUTCMonth() + 1
  )
  const [summary] = await prisma.$queryRaw<
    {
      corrections: bigint
      outstanding: Prisma.Decimal | null
      posted: Prisma.Decimal | null
      currencyCode: string
    }[]
  >`
    SELECT t.currency_code AS "currencyCode",
      sum(a.amount) FILTER (WHERE a.status = 'pending') AS outstanding,
      sum(a.amount) FILTER (WHERE a.status = 'posted' AND a.assessed_at >= ${from}) AS posted,
      count(*) FILTER (WHERE a.status IN ('waived', 'reversed') AND a.updated_at >= ${from}) AS corrections
    FROM tenants t
    LEFT JOIN charge_applications a ON a.tenant_id = t.id
      AND (a.status = 'pending' OR a.assessed_at >= ${from} OR a.updated_at >= ${from})
      AND EXISTS (
        SELECT 1 FROM charge_definitions d
        WHERE d.id = a.charge_definition_id AND d.code NOT IN (${Prisma.join(systemBillingChargeCodes)})
      )
    WHERE t.id = ${input.tenantId}::uuid
    GROUP BY t.currency_code
  `
  return {
    capabilities: input.capabilities,
    currencyCode: summary?.currencyCode ?? "NGN",
    generatedAt,
    stats: {
      corrections: Number(summary?.corrections ?? 0),
      outstanding: Number(summary?.outstanding ?? 0),
      postedThisMonth: Number(summary?.posted ?? 0),
    },
  }
}

type ChargePageInput = {
  cursor?: string | null
  filters?: MobileAdminChargeFilters
  lane: MobileAdminChargeLane
  search?: string
  tenantId: string
}

const chargePageSize = 30

export async function getMobileAdminChargeWorkspace(
  input: ChargePageInput & { capabilities: MobileAdminChargeCapabilities },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const tenant = await prisma.tenant.findUnique({
    select: { currencyCode: true },
    where: { id: input.tenantId },
  })
  const stats = await workspaceStats(input.tenantId, prisma)
  return {
    ...(await readChargePage(input, prisma, false)),
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    generatedAt: new Date(),
    stats,
  }
}

export function getMobileAdminChargePage(
  input: ChargePageInput,
  prismaOverride?: PrismaClient
) {
  return readChargePage(input, getPrisma(prismaOverride), true)
}

async function readChargePage(
  input: ChargePageInput,
  prisma: PrismaClient,
  compact: boolean
) {
  const cursor = input.cursor ? { id: input.cursor } : undefined
  const skip = cursor ? 1 : 0
  const now = new Date()
  if (input.lane === "rules") {
    const definitions = await prisma.chargeDefinition.findMany({
      include: {
        applicability: {
          orderBy: [{ workflow: "asc" }, { trigger: "asc" }],
        },
        versions: {
          orderBy: [
            { effectiveFrom: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          ...(compact
            ? { take: 1, where: { effectiveFrom: { lte: now } } }
            : {}),
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
      ...(compact ? { cursor, skip, take: chargePageSize + 1 } : {}),
      where: {
        tenantId: input.tenantId,
        code: { notIn: systemBillingChargeCodes },
        ...(input.search
          ? {
              OR: [
                { code: { contains: input.search, mode: "insensitive" } },
                { name: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(input.filters?.purpose
          ? { purpose: input.filters.purpose as never }
          : {}),
        ...(compact && input.filters?.workflow
          ? {
              applicability: {
                some: {
                  workflow: input.filters.workflow as never,
                  isActive: true,
                },
              },
            }
          : {}),
      },
    })
    const page = compact ? definitions.slice(0, chargePageSize) : definitions
    return {
      lane: input.lane,
      data: page.map((definition) => ({
        applicability: definition.applicability.map((item) => ({
          collectionMode: item.collectionMode,
          id: item.id,
          isActive: item.isActive,
          isRequired: item.isRequired,
          trigger: item.trigger,
          workflow: item.workflow,
        })),
        chargeFrequency: definition.chargeFrequency,
        chargeValueType: definition.chargeValueType,
        code: definition.code,
        id: definition.id,
        isActive: definition.isActive,
        isMonthlyLevy: definition.isMonthlyLevy,
        name: definition.name,
        purpose: definition.purpose,
        versions: definition.versions.map((version) => ({
          amount: Number(version.amount),
          chargeValueType: version.chargeValueType,
          effectiveFrom: version.effectiveFrom,
          id: version.id,
        })),
      })),
      nextCursor:
        compact && definitions.length > chargePageSize
          ? (page.at(-1)?.id ?? null)
          : null,
    }
  }

  const filters = input.filters ?? {}
  const rows = await prisma.chargeApplication.findMany({
    cursor,
    include: compact
      ? {
          chargeApplicability: { select: { trigger: true, workflow: true } },
          chargeDefinition: {
            select: {
              code: true,
              isMonthlyLevy: true,
              name: true,
              purpose: true,
            },
          },
          member: applicationInclude.member,
        }
      : applicationInclude,
    orderBy: [{ assessedAt: "desc" }, { id: "desc" }],
    skip,
    take: chargePageSize + 1,
    where: {
      tenantId: input.tenantId,
      chargeDefinition: {
        ...(compact ? { code: { notIn: systemBillingChargeCodes } } : {}),
        ...(compact || input.lane === "levies"
          ? { isMonthlyLevy: input.lane === "levies" }
          : {}),
        ...(filters.purpose ? { purpose: filters.purpose as never } : {}),
      },
      ...(filters.memberId ? { memberId: filters.memberId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.collectionMode
        ? { collectionMode: filters.collectionMode }
        : {}),
      ...(filters.workflow
        ? { chargeApplicability: { workflow: filters.workflow as never } }
        : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            assessedAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lt: filters.toDate } : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { notes: { contains: input.search, mode: "insensitive" } },
              {
                member: {
                  fullName: { contains: input.search, mode: "insensitive" },
                },
              },
              {
                member: {
                  memberNumber: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                chargeDefinition: {
                  name: { contains: input.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
  })
  const page = rows.slice(0, chargePageSize)
  return {
    lane: input.lane,
    data: page.map(applicationRow),
    nextCursor: rows.length > chargePageSize ? (page.at(-1)?.id ?? null) : null,
  }
}

export async function getMobileAdminChargeApplication(
  input: { applicationId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const application = await prisma.chargeApplication.findFirst({
    include: {
      ...applicationInclude,
      chargeDefinition: {
        include: {
          versions: { orderBy: { effectiveFrom: "desc" } },
        },
      },
      ledgerTransaction: {
        include: {
          entries: { include: { ledgerAccount: true } },
        },
      },
    },
    where: { id: input.applicationId, tenantId: input.tenantId },
  })
  if (!application)
    throw ExpectedQueryError.notFound("Charge application not found.")

  const version = application.chargeDefinition.versions.find(
    (item) => item.effectiveFrom <= application.assessedAt
  )
  const rate = Number(version?.amount ?? application.amount)
  const amount = Number(application.amount)
  const amountBasis =
    version?.chargeValueType === "percentage" && rate > 0
      ? Number(((amount * 100) / rate).toFixed(2))
      : null
  const audit = await prisma.auditLog.findMany({
    orderBy: { occurredAt: "desc" },
    select: {
      action: true,
      actorUserId: true,
      id: true,
      metadata: true,
      occurredAt: true,
    },
    where: {
      entityId: application.id,
      entityType: "ChargeApplication",
      tenantId: input.tenantId,
    },
  })

  return {
    ...applicationRow(application),
    amountBasis,
    audit,
    definition: {
      chargeFrequency: application.chargeDefinition.chargeFrequency,
      chargeValueType:
        version?.chargeValueType ??
        application.chargeDefinition.chargeValueType,
      code: application.chargeDefinition.code,
      effectiveAmount: rate,
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      name: application.chargeDefinition.name,
      purpose: application.chargeDefinition.purpose,
      versionEffectiveFrom: version?.effectiveFrom ?? null,
      versionId: version?.id ?? null,
    },
    ledger: application.ledgerTransaction
      ? {
          entries: application.ledgerTransaction.entries.map((entry) => ({
            accountCode: entry.ledgerAccount.code,
            accountName: entry.ledgerAccount.name,
            amount: Number(entry.amount),
            direction: entry.direction,
          })),
          id: application.ledgerTransaction.id,
          postedAt: application.ledgerTransaction.postedAt,
          reference: application.ledgerTransaction.reference,
        }
      : null,
    notes: application.notes,
    target: workflowTarget(application),
    workspaceState: application.status,
  }
}

type ChargePickerInput = {
  cursor?: string | null
  search?: string
  tenantId: string
}

async function findChargeMembers(
  input: ChargePickerInput,
  prisma: PrismaClient,
  take: number
) {
  return prisma.member.findMany({
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: { fullName: true, id: true, memberNumber: true, status: true },
    skip: input.cursor ? 1 : 0,
    take,
    where: {
      status: { not: "exited" },
      tenantId: input.tenantId,
      ...(input.search
        ? {
            OR: [
              { fullName: { contains: input.search, mode: "insensitive" } },
              { memberNumber: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  })
}

export async function getMobileAdminChargeMembers(
  input: ChargePickerInput,
  prismaOverride?: PrismaClient
) {
  const rows = await findChargeMembers(
    input,
    getPrisma(prismaOverride),
    chargePageSize + 1
  )
  const data = rows.slice(0, chargePageSize)
  return {
    data,
    nextCursor: rows.length > chargePageSize ? (data.at(-1)?.id ?? null) : null,
  }
}

async function findChargeDefinitions(
  input: ChargePickerInput & { assessedAt?: Date },
  prisma: PrismaClient
) {
  const date = (input.assessedAt ?? new Date()).toISOString().slice(0, 10)
  const search =
    input.assessedAt && input.search
      ? Prisma.sql`AND (d.name ILIKE ${`%${input.search}%`} OR d.code ILIKE ${`%${input.search}%`})`
      : Prisma.empty
  const cursor =
    input.assessedAt && input.cursor
      ? Prisma.sql`AND (d.name, d.id) > (
        SELECT name, id FROM charge_definitions
        WHERE id = ${input.cursor}::uuid AND tenant_id = ${input.tenantId}::uuid
      )`
      : Prisma.empty

  // Resolve the effective value type before paging: a standalone charge can
  // have fixed and percentage versions at different points in its history.
  return prisma.$queryRaw<
    Array<
      Pick<
        ChargeDefinition,
        | "chargeFrequency"
        | "chargeValueType"
        | "code"
        | "id"
        | "isMonthlyLevy"
        | "name"
        | "purpose"
      > & { collectionMode: ChargeCollectionMode; rate: number }
    >
  >`
    SELECT d.charge_frequency AS "chargeFrequency",
      COALESCE(v.charge_value_type, d.charge_value_type) AS "chargeValueType",
      d.code,
      COALESCE(a.collection_mode, 'deduct_from_savings') AS "collectionMode",
      d.id, d.is_monthly_levy AS "isMonthlyLevy", d.name, d.purpose,
      COALESCE(v.amount, d.amount)::double precision AS rate
    FROM charge_definitions d
    LEFT JOIN LATERAL (
      SELECT id, charge_value_type, amount
      FROM charge_definition_versions
      WHERE charge_definition_id = d.id AND tenant_id = d.tenant_id
        AND effective_from <= ${date}::date
      ORDER BY effective_from DESC, created_at DESC, id DESC
      LIMIT 1
    ) v ON true
    LEFT JOIN LATERAL (
      SELECT trigger, collection_mode
      FROM charge_applicability
      WHERE charge_definition_id = d.id AND tenant_id = d.tenant_id
        AND is_active AND trigger IN ('manual', 'monthly_collection')
      ORDER BY CASE WHEN trigger = 'manual' THEN 0 ELSE 1 END, created_at, id
      LIMIT 1
    ) a ON true
    WHERE d.tenant_id = ${input.tenantId}::uuid AND d.is_active
      AND d.code NOT IN (${Prisma.join(systemBillingChargeCodes)})
      AND (
        d.is_monthly_levy OR a.trigger = 'manual'
        OR (
          NOT d.applies_to_members AND NOT d.applies_to_loan_requests AND NOT d.applies_to_loans
          AND v.charge_value_type = 'fixed_amount'
          AND NOT EXISTS (
            SELECT 1 FROM charge_applicability
            WHERE charge_definition_id = d.id AND tenant_id = d.tenant_id AND is_active
          )
        )
      )
      ${input.assessedAt ? Prisma.sql`AND v.id IS NOT NULL` : Prisma.empty}
      ${search}
      ${cursor}
    ORDER BY d.name, d.id
    ${input.assessedAt ? Prisma.sql`LIMIT ${chargePageSize + 1}` : Prisma.empty}
  `
}

export async function getMobileAdminChargeRulesForApply(
  input: ChargePickerInput & { assessedAt: Date },
  prismaOverride?: PrismaClient
) {
  const rows = await findChargeDefinitions(input, getPrisma(prismaOverride))
  const data = rows.slice(0, chargePageSize)
  return {
    data,
    nextCursor: rows.length > chargePageSize ? (data.at(-1)?.id ?? null) : null,
  }
}

export async function getMobileAdminChargeFormOptions(
  input: { search?: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [members, definitions] = await Promise.all([
    findChargeMembers(input, prisma, 40),
    findChargeDefinitions({ tenantId: input.tenantId }, prisma),
  ])
  return { definitions, members }
}

type CommandBase = {
  actorUserId: string
  commandId: string
  expectedState: string
  tenantId: string
}

export function applyMobileAdminCharge(
  input: CommandBase & {
    assessedAt: Date
    basisAmount?: number | null
    chargeDefinitionId: string
    expectedAmount: number
    memberId: string
    notes?: string | null
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      assessedAt: input.assessedAt.toISOString(),
      basisAmount: input.basisAmount ?? null,
      chargeDefinitionId: input.chargeDefinitionId,
      expectedAmount: input.expectedAmount,
      memberId: input.memberId,
      notes: input.notes ?? null,
    }),
    commandType: "charge_application.apply",
    entityId: input.memberId,
    execute: async (prisma) => {
      const member = await prisma.member.findFirst({
        select: { id: true },
        where: {
          id: input.memberId,
          status: { not: "exited" },
          tenantId: input.tenantId,
        },
      })
      const definition = await prisma.chargeDefinition.findFirst({
        include: {
          applicability: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            where: { isActive: true, tenantId: input.tenantId },
          },
          versions: {
            orderBy: [
              { effectiveFrom: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            take: 1,
            where: {
              effectiveFrom: { lte: input.assessedAt },
              tenantId: input.tenantId,
            },
          },
        },
        where: {
          code: { notIn: systemBillingChargeCodes },
          id: input.chargeDefinitionId,
          isActive: true,
          tenantId: input.tenantId,
        },
      })
      if (!member) throw ExpectedQueryError.notFound("Member not found.")
      if (!definition)
        throw ExpectedQueryError.notFound("Charge definition not found.")
      const applicability =
        definition.applicability.find((item) => item.trigger === "manual") ??
        (definition.isMonthlyLevy
          ? definition.applicability.find(
              (item) => item.trigger === "monthly_collection"
            )
          : null)
      const version = definition.versions[0]
      if (!version)
        throw ExpectedQueryError.precondition(
          "No effective charge version exists for this date."
        )
      const standaloneFixed =
        version.chargeValueType === "fixed_amount" &&
        !definition.appliesToMembers &&
        !definition.appliesToLoanRequests &&
        !definition.appliesToLoans &&
        definition.applicability.length === 0
      if (!applicability && !definition.isMonthlyLevy && !standaloneFixed) {
        throw ExpectedQueryError.precondition(
          "This charge is only applied by its linked workflow."
        )
      }
      const rate = Number(version.amount)
      const amount = calculateMobileAdminChargeAmount({
        basisAmount: input.basisAmount,
        chargeValueType: version.chargeValueType,
        rate,
      })
      if (amount <= 0) {
        throw ExpectedQueryError.validation(
          "Enter a positive amount basis for this percentage charge."
        )
      }
      if (Math.abs(amount - input.expectedAmount) > 0.005) {
        throw ExpectedQueryError.conflict(
          "The charge amount changed. Review the latest server calculation."
        )
      }

      let duplicate: { id: string; status: string } | null = null
      const duplicateStrategy = getMobileAdminChargeDuplicateStrategy({
        chargeFrequency: definition.chargeFrequency,
        isMonthlyLevy: definition.isMonthlyLevy,
      })
      if (duplicateStrategy === "member_definition_period") {
        const bounds = monthBounds(
          input.assessedAt.getUTCFullYear(),
          input.assessedAt.getUTCMonth() + 1
        )
        duplicate = await prisma.chargeApplication.findFirst({
          select: { id: true, status: true },
          where: {
            assessedAt: { gte: bounds.from, lt: bounds.to },
            chargeDefinitionId: definition.id,
            memberId: input.memberId,
            status: { in: ["pending", "posted"] },
            tenantId: input.tenantId,
          },
        })
      } else if (duplicateStrategy === "member_definition_forever") {
        duplicate = await prisma.chargeApplication.findFirst({
          select: { id: true, status: true },
          where: {
            chargeDefinitionId: definition.id,
            memberId: input.memberId,
            status: { in: ["pending", "posted"] },
            tenantId: input.tenantId,
          },
        })
      }
      const actualState = duplicate
        ? `${duplicate.status}:${duplicate.id}`
        : "available"
      assertExpectedState(actualState, input.expectedState)
      if (duplicate) {
        throw ExpectedQueryError.conflict(
          definition.isMonthlyLevy
            ? "This monthly levy is already applied for the selected period."
            : "This one-time charge is already applied to the member."
        )
      }

      const application = await applyCharge(
        {
          actorUserId: input.actorUserId,
          amount,
          assessedAt: input.assessedAt,
          chargeApplicabilityId: applicability?.id ?? null,
          chargeDefinitionId: definition.id,
          collectionMode:
            applicability?.collectionMode ?? "deduct_from_savings",
          memberId: input.memberId,
          notes: input.notes?.trim() || undefined,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: application.id, state: application.status }
    },
  })
}

export function settleMobileAdminCharge(
  input: CommandBase & {
    applicationId: string
    notes?: string | null
    paidAt: Date
    reference: string
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      applicationId: input.applicationId,
      notes: input.notes ?? null,
      paidAt: input.paidAt.toISOString(),
      reference: input.reference,
    }),
    commandType: "charge_application.settle",
    entityId: input.applicationId,
    execute: async (prisma) => {
      const application = await prisma.chargeApplication.findFirst({
        select: { status: true },
        where: { id: input.applicationId, tenantId: input.tenantId },
      })
      if (!application)
        throw ExpectedQueryError.notFound("Charge application not found.")
      assertExpectedState(application.status, input.expectedState)
      const updated = await settleChargeApplication(
        {
          actorUserId: input.actorUserId,
          chargeApplicationId: input.applicationId,
          notes: input.notes,
          paidAt: input.paidAt,
          reference: input.reference,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: updated.id, state: updated.status }
    },
  })
}

function correctMobileAdminCharge(
  action: "reverse" | "waive",
  input: CommandBase & { applicationId: string; reason: string }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      action,
      applicationId: input.applicationId,
      reason: input.reason,
    }),
    commandType: `charge_application.${action}`,
    entityId: input.applicationId,
    execute: async (prisma) => {
      const application = await prisma.chargeApplication.findFirst({
        select: { status: true },
        where: { id: input.applicationId, tenantId: input.tenantId },
      })
      if (!application)
        throw ExpectedQueryError.notFound("Charge application not found.")
      assertExpectedState(application.status, input.expectedState)
      const updated = await (action === "waive"
        ? waiveChargeApplication(
            {
              actorUserId: input.actorUserId,
              chargeApplicationId: input.applicationId,
              reason: input.reason,
              tenantId: input.tenantId,
            },
            prisma
          )
        : reverseChargeApplication(
            {
              actorUserId: input.actorUserId,
              chargeApplicationId: input.applicationId,
              reason: input.reason,
              tenantId: input.tenantId,
            },
            prisma
          ))
      return { id: updated.id, state: updated.status }
    },
  })
}

export function waiveMobileAdminCharge(
  input: CommandBase & { applicationId: string; reason: string }
) {
  return correctMobileAdminCharge("waive", input)
}

export function reverseMobileAdminCharge(
  input: CommandBase & { applicationId: string; reason: string }
) {
  return correctMobileAdminCharge("reverse", input)
}
