import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  applyCharge,
  reverseChargeApplication,
  settleChargeApplication,
  waiveChargeApplication,
  type ChargeCollectionMode,
} from "./charges"
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
  const target = workflowTarget(application)
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
    workflow:
      application.chargeApplicability?.workflow ?? target?.type ?? "manual",
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

export async function getMobileAdminChargeWorkspace(
  input: {
    capabilities: MobileAdminChargeCapabilities
    cursor?: string | null
    filters?: MobileAdminChargeFilters
    lane: MobileAdminChargeLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const tenant = await prisma.tenant.findUnique({
    select: { currencyCode: true },
    where: { id: input.tenantId },
  })
  const stats = await workspaceStats(input.tenantId, prisma)
  const shared = {
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    generatedAt: new Date(),
    lane: input.lane,
    stats,
  }

  if (input.lane === "rules") {
    const definitions = await prisma.chargeDefinition.findMany({
      include: {
        applicability: {
          orderBy: [{ workflow: "asc" }, { trigger: "asc" }],
        },
        versions: { orderBy: { effectiveFrom: "desc" } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      where: {
        tenantId: input.tenantId,
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
      },
    })
    return {
      ...shared,
      data: definitions.map((definition) => ({
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
      nextCursor: null,
    }
  }

  const filters = input.filters ?? {}
  const rows = await prisma.chargeApplication.findMany({
    cursor: input.cursor ? { id: input.cursor } : undefined,
    include: applicationInclude,
    orderBy: [{ assessedAt: "desc" }, { id: "desc" }],
    skip: input.cursor ? 1 : 0,
    take: 31,
    where: {
      tenantId: input.tenantId,
      ...(input.lane === "levies"
        ? { chargeDefinition: { isMonthlyLevy: true } }
        : {}),
      ...(filters.memberId ? { memberId: filters.memberId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.collectionMode
        ? { collectionMode: filters.collectionMode }
        : {}),
      ...(filters.purpose
        ? {
            chargeDefinition: {
              ...(input.lane === "levies" ? { isMonthlyLevy: true } : {}),
              purpose: filters.purpose as never,
            },
          }
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
  const page = rows.slice(0, 30)
  return {
    ...shared,
    data: page.map(applicationRow),
    nextCursor: rows.length > 30 ? (page.at(-1)?.id ?? null) : null,
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

export async function getMobileAdminChargeFormOptions(
  input: { search?: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const members = await prisma.member.findMany({
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: { fullName: true, id: true, memberNumber: true, status: true },
    take: 40,
    where: {
      status: { not: "exited" },
      tenantId: input.tenantId,
      ...(input.search
        ? {
            OR: [
              { fullName: { contains: input.search, mode: "insensitive" } },
              {
                memberNumber: {
                  contains: input.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
  })
  const definitions = await prisma.chargeDefinition.findMany({
    include: {
      applicability: {
        where: {
          isActive: true,
          OR: [{ trigger: "manual" }, { trigger: "monthly_collection" }],
        },
      },
      versions: {
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
        take: 1,
        where: { effectiveFrom: { lte: new Date() } },
      },
    },
    orderBy: { name: "asc" },
    where: { isActive: true, tenantId: input.tenantId },
  })
  return {
    definitions: definitions
      .filter(
        (definition) =>
          definition.isMonthlyLevy ||
          definition.applicability.some((item) => item.trigger === "manual")
      )
      .map((definition) => ({
        chargeFrequency: definition.chargeFrequency,
        chargeValueType:
          definition.versions[0]?.chargeValueType ?? definition.chargeValueType,
        code: definition.code,
        collectionMode:
          definition.applicability.find((item) => item.trigger === "manual")
            ?.collectionMode ??
          definition.applicability.find(
            (item) => item.trigger === "monthly_collection"
          )?.collectionMode ??
          "deduct_from_savings",
        id: definition.id,
        isMonthlyLevy: definition.isMonthlyLevy,
        name: definition.name,
        purpose: definition.purpose,
        rate: Number(definition.versions[0]?.amount ?? definition.amount),
      })),
    members,
  }
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
        where: { id: input.memberId, tenantId: input.tenantId },
      })
      const definition = await prisma.chargeDefinition.findFirst({
        include: {
          applicability: { where: { isActive: true } },
          versions: {
            orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
            take: 1,
            where: { effectiveFrom: { lte: input.assessedAt } },
          },
        },
        where: {
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
      if (!applicability && !definition.isMonthlyLevy) {
        throw ExpectedQueryError.precondition(
          "This charge is only applied by its linked workflow."
        )
      }
      const version = definition.versions[0]
      if (!version)
        throw ExpectedQueryError.precondition(
          "No effective charge version exists for this date."
        )
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
