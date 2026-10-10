import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMemberByUserId } from "./members"
import {
  createMemberShareApplication,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplicationPage,
  type MemberShareApplicationRow,
  type MemberUnitSharePosition,
  type TenantSharePolicySettings,
} from "./tenant-finance"

type MobileShareMetric = {
  detail: string
  format: "currency" | "percent" | "count"
  key: string
  label: string
  value: number
}

type MobileShareSectionRow = {
  detail: string
  format: "currency" | "percent" | "count" | null
  key: string
  label: string
  status: string | null
  value: number | null
}

type MobileMemberShareApplication = {
  approvedUnits: number | null
  createdAt: string
  id: string
  notes: string | null
  requestedUnits: number
  reviewedAt: string | null
  reviewNotes: string | null
  shareValueSnapshot: number
  status: "pending" | "approved" | "rejected" | "cancelled"
  unitAmountSnapshot: number
}

type MobileMemberSharePolicy = Pick<
  TenantSharePolicySettings,
  | "configurationMode"
  | "compulsoryShareUnits"
  | "maximumShareUnits"
  | "unitAmount"
>

type MobileMemberSharePosition = MemberUnitSharePosition & {
  remainingOptionalUnits: number
}

export type MobileMemberShareSection = {
  emptyState: string
  generatedAt: string
  key: "shares"
  rows: MobileShareSectionRow[]
  stats: MobileShareMetric[]
  subtitle: string
  title: string
}

export type MobileMemberSharesSnapshot = {
  applicationNextCursor: string | null
  applicationTotal: number
  applications: MobileMemberShareApplication[]
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  policy: MobileMemberSharePolicy | null
  position: MobileMemberSharePosition | null
  section: MobileMemberShareSection
  state:
    | "available"
    | "database_unavailable"
    | "member_profile_missing"
    | "unit_model_inactive"
}

export type MobileMemberShareApplicationsPage = {
  data: MobileMemberShareApplication[]
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
  total: number
}

type MobileMemberShareSectionInput = {
  applications: {
    createdAt: Date
    id: string
    requestedUnits: number
    shareValueSnapshot: number
    status: string
  }[]
  generatedAt?: Date
  ledgerEntries: {
    amount: number
    effectiveDate: Date
    id: string
    notes: string | null
    sourceType: string
  }[]
  publishedDividendAllocations: {
    allocationAmount: number
    id: string
    periodEnd: Date
    periodName: string
    publishedAt: Date | null
  }[]
  publishedDividendCount?: number
  publishedDividendTotal?: number
  shareBalance: number
  unitPosition: MemberUnitSharePosition | null
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

function humanizeStatus(value: string | null | undefined) {
  if (!value) return null

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function emptyMobileMemberShareSection(
  detail: string
): MobileMemberShareSection {
  return {
    emptyState: "No share capital, applications, or dividend allocations yet.",
    generatedAt: new Date().toISOString(),
    key: "shares",
    rows: [
      {
        detail,
        format: null,
        key: "member-profile",
        label: "Member profile needs linking",
        status: "Needs setup",
        value: null,
      },
    ],
    stats: [
      {
        detail: "No share balance available",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: 0,
      },
      {
        detail: "No pending applications",
        format: "count",
        key: "pending-shares",
        label: "Pending requests",
        value: 0,
      },
      {
        detail: "No published dividends",
        format: "currency",
        key: "dividends",
        label: "Dividends",
        value: 0,
      },
    ],
    subtitle: "Review share holdings, optional share requests, and dividends.",
    title: "Shares",
  }
}

function emptyMobileMemberSharesSnapshot(
  state: MobileMemberSharesSnapshot["state"],
  detail: string
): MobileMemberSharesSnapshot {
  return {
    applicationNextCursor: null,
    applicationTotal: 0,
    applications: [],
    generatedAt: new Date().toISOString(),
    member: null,
    policy: null,
    position: null,
    section: emptyMobileMemberShareSection(detail),
    state,
  }
}

function toMobileShareApplication(
  row: MemberShareApplicationRow
): MobileMemberShareApplication {
  return {
    approvedUnits: row.approvedUnits,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    notes: row.notes,
    requestedUnits: row.requestedUnits,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewNotes: row.reviewNotes,
    shareValueSnapshot: row.shareValueSnapshot,
    status: row.status,
    unitAmountSnapshot: row.unitAmountSnapshot,
  }
}

function toMobileSharePolicy(
  policy: TenantSharePolicySettings
): MobileMemberSharePolicy {
  return {
    compulsoryShareUnits: policy.compulsoryShareUnits,
    configurationMode: policy.configurationMode,
    maximumShareUnits: policy.maximumShareUnits,
    unitAmount: policy.unitAmount,
  }
}

export function toMobileMemberSharePosition(
  position: MemberUnitSharePosition
): MobileMemberSharePosition {
  return {
    ...position,
    remainingOptionalUnits: Math.max(
      0,
      position.maximumUnits - position.totalPendingUnits
    ),
  }
}

export function buildMobileMemberShareSection(
  input: MobileMemberShareSectionInput
): MobileMemberShareSection {
  const pendingApplicationCount = input.applications.filter(
    (application) => application.status === "pending"
  ).length
  const rows: MobileShareSectionRow[] = []

  if (input.unitPosition) {
    rows.push({
      detail: `${input.unitPosition.compulsoryUnits} compulsory + ${input.unitPosition.approvedOptionalUnits} optional units`,
      format: "count",
      key: "approved-share-units",
      label: "Approved share units",
      status: "Unit model",
      value: input.unitPosition.totalApprovedUnits,
    })

    if (input.unitPosition.pendingOptionalUnits > 0) {
      rows.push({
        detail: "Awaiting share review",
        format: "count",
        key: "pending-share-units",
        label: "Pending optional units",
        status: "Pending",
        value: input.unitPosition.pendingOptionalUnits,
      })
    }
  } else if (input.shareBalance > 0) {
    rows.push({
      detail: "Ledger balance as of today",
      format: "currency",
      key: "share-capital-balance",
      label: "Share capital balance",
      status: "Current",
      value: input.shareBalance,
    })
  }

  for (const application of input.applications.slice(0, 3)) {
    rows.push({
      detail: `${application.requestedUnits} requested unit(s) - Requested ${formatDateLabel(application.createdAt)}`,
      format: "currency",
      key: `share-application-${application.id}`,
      label: "Optional share request",
      status: humanizeStatus(application.status),
      value: application.shareValueSnapshot,
    })
  }

  for (const entry of input.ledgerEntries.slice(0, 3)) {
    rows.push({
      detail: `${humanizeStatus(entry.sourceType)} - Effective ${formatDateLabel(entry.effectiveDate)}`,
      format: "currency",
      key: `share-ledger-${entry.id}`,
      label: entry.notes ?? "Share ledger movement",
      status: "Posted",
      value: entry.amount,
    })
  }

  for (const allocation of input.publishedDividendAllocations.slice(0, 3)) {
    rows.push({
      detail: [
        `Period ended ${formatDateLabel(allocation.periodEnd)}`,
        allocation.publishedAt
          ? `Published ${formatDateLabel(allocation.publishedAt)}`
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `dividend-${allocation.id}`,
      label: allocation.periodName,
      status: "Published dividend",
      value: allocation.allocationAmount,
    })
  }

  const publishedDividendCount =
    input.publishedDividendCount ?? input.publishedDividendAllocations.length
  const publishedDividendTotal =
    input.publishedDividendTotal ??
    input.publishedDividendAllocations.reduce(
      (total, allocation) => total + allocation.allocationAmount,
      0
    )

  return {
    emptyState: "No share capital, applications, or dividend allocations yet.",
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    key: "shares",
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail:
                "Approved holdings and published dividend evidence will appear here.",
              format: null,
              key: "shares-empty",
              label: "No share activity",
              status: null,
              value: null,
            },
          ],
    stats: [
      {
        detail: input.unitPosition
          ? `${input.unitPosition.totalApprovedUnits} approved unit(s)`
          : "Ledger balance as of today",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: input.unitPosition?.totalApprovedValue ?? input.shareBalance,
      },
      {
        detail: "Awaiting review",
        format: "count",
        key: "pending-shares",
        label: "Pending requests",
        value: pendingApplicationCount,
      },
      {
        detail:
          publishedDividendCount > 0
            ? `${publishedDividendCount} published allocation(s)`
            : "No published dividends",
        format: "currency",
        key: "dividends",
        label: "Dividends",
        value: publishedDividendTotal,
      },
    ],
    subtitle: "Review share holdings, optional share requests, and dividends.",
    title: "Shares",
  }
}

export async function getMobileMemberSharesSnapshot(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileMemberSharesSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return emptyMobileMemberSharesSnapshot(
      "database_unavailable",
      "Share self-service needs the database runtime."
    )
  }

  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    return emptyMobileMemberSharesSnapshot(
      "member_profile_missing",
      "No linked member profile was found for this mobile session."
    )
  }

  const policy = await getTenantSharePolicy(input.tenantId, prisma)
  const now = new Date()
  const publishedDividendWhere = {
    dividendPeriod: { status: "published" as const },
    memberId: member.id,
    tenantId: input.tenantId,
  }
  const [
    applicationPage,
    ledgerEntries,
    ledgerBalance,
    unitPosition,
    dividendAllocations,
    dividendAggregate,
  ] = await Promise.all([
    listMemberShareApplicationPage(
      { memberId: member.id, pageSize: 20, tenantId: input.tenantId },
      prisma
    ),
    prisma.memberShareLedgerEntry.findMany({
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
      take: 3,
      where: {
        effectiveDate: { lte: now },
        memberId: member.id,
        tenantId: input.tenantId,
      },
    }),
    prisma.memberShareLedgerEntry.aggregate({
      _sum: { amount: true },
      where: {
        effectiveDate: { lte: now },
        memberId: member.id,
        tenantId: input.tenantId,
      },
    }),
    policy.configurationMode === "unit_based"
      ? getMemberUnitSharePosition(
          { memberId: member.id, tenantId: input.tenantId },
          prisma
        )
      : Promise.resolve(null),
    prisma.dividendAllocation.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        allocationAmount: true,
        dividendPeriod: {
          select: {
            name: true,
            periodEnd: true,
            publishedAt: true,
          },
        },
        id: true,
      },
      take: 3,
      where: publishedDividendWhere,
    }),
    prisma.dividendAllocation.aggregate({
      _count: { _all: true },
      _sum: { allocationAmount: true },
      where: publishedDividendWhere,
    }),
  ])

  const section = buildMobileMemberShareSection({
    applications: applicationPage.data,
    ledgerEntries: ledgerEntries.map((entry) => ({
      amount: Number(entry.amount),
      effectiveDate: entry.effectiveDate,
      id: entry.id,
      notes: entry.notes,
      sourceType: entry.sourceType,
    })),
    publishedDividendAllocations: dividendAllocations.map((allocation) => ({
      allocationAmount: Number(allocation.allocationAmount),
      id: allocation.id,
      periodEnd: allocation.dividendPeriod.periodEnd,
      periodName: allocation.dividendPeriod.name,
      publishedAt: allocation.dividendPeriod.publishedAt,
    })),
    publishedDividendCount: dividendAggregate._count._all,
    publishedDividendTotal: Number(
      dividendAggregate._sum.allocationAmount ?? 0
    ),
    shareBalance: Number(ledgerBalance._sum.amount ?? 0),
    unitPosition,
  })

  return {
    applicationNextCursor: applicationPage.meta.cursor ?? null,
    applicationTotal: applicationPage.meta.total,
    applications: applicationPage.data.map(toMobileShareApplication),
    generatedAt: section.generatedAt,
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    policy: toMobileSharePolicy(policy),
    position: unitPosition ? toMobileMemberSharePosition(unitPosition) : null,
    section,
    state:
      policy.configurationMode === "unit_based"
        ? "available"
        : "unit_model_inactive",
  }
}

export async function getMobileMemberShareApplicationsPage(
  input: {
    cursor?: string | null
    pageSize?: number
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileMemberShareApplicationsPage> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return {
      data: [],
      nextCursor: null,
      state: "database_unavailable",
      total: 0,
    }
  }

  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    return {
      data: [],
      nextCursor: null,
      state: "member_profile_missing",
      total: 0,
    }
  }

  const page = await listMemberShareApplicationPage(
    {
      cursor: input.cursor,
      memberId: member.id,
      pageSize: Math.min(Math.max(input.pageSize ?? 20, 1), 50),
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    data: page.data.map(toMobileShareApplication),
    nextCursor: page.meta.cursor ?? null,
    state: "available",
    total: page.meta.total,
  }
}

export async function createMobileMemberShareApplicationForSession(input: {
  notes?: string | null
  requestedUnits: number
  tenantId: string
  userId: string
}): Promise<MobileMemberShareApplication> {
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Share requests are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before requesting optional shares."
    )
  }

  const application = await createMemberShareApplication(
    {
      memberId: member.id,
      notes: input.notes,
      requestedByUserId: input.userId,
      requestedUnits: input.requestedUnits,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileShareApplication(application)
}
