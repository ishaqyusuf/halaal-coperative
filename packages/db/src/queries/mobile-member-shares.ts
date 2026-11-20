import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMemberByUserId } from "./members"
import {
  describeProfitPayoutDestination,
  getMemberProfitPayouts,
  type ProfitPayoutDestination,
} from "./profit-payouts"
import {
  cancelOwnMemberShareApplication,
  createMemberShareApplication,
  getMemberUnitSharePosition,
  getMemberUnitSharePositionForLinkedMember,
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

export type MobileMemberShareTimelineItem =
  | {
      kind: "request"
      occurredAt: string
      application: MobileMemberShareApplication
    }
  | {
      kind: "ledger"
      occurredAt: string
      id: string
      amount: number
      label: string
      source: string | null
    }

export type MobileMemberShareTimelinePage = {
  items: MobileMemberShareTimelineItem[]
  nextCursor: string | null
}

export type MobileMemberShareOverview = Pick<
  MobileMemberSharesSnapshot,
  "generatedAt" | "member" | "position" | "state"
> & {
  shareBalance: number
  profit: { count: number; total: number; latestUnpaidAmount: number | null }
  timeline: MobileMemberShareTimelinePage
}

export type MobileMemberShareProfitPeriod = {
  amount: number
  id: string
  name: string
  periodEnd: string
  publishedAt: string | null
  payout: { destination: string; paidAt: string } | null
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
    /** Set once this season's share is paid out to the member. */
    payout?: { destination: string; paidAt: string } | null
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
  row: Omit<
    MemberShareApplicationRow,
    | "shareValueSnapshot"
    | "unitAmountSnapshot"
    | "memberEmail"
    | "memberName"
    | "memberNumber"
  > & {
    shareValueSnapshot: unknown
    unitAmountSnapshot: unknown
  }
): MobileMemberShareApplication {
  return {
    approvedUnits: row.approvedUnits,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    notes: row.notes,
    requestedUnits: row.requestedUnits,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewNotes: row.reviewNotes,
    shareValueSnapshot: Number(row.shareValueSnapshot),
    status: row.status,
    unitAmountSnapshot: Number(row.unitAmountSnapshot),
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
        allocation.payout
          ? `Paid ${formatDateLabel(new Date(`${allocation.payout.paidAt}T00:00:00.000Z`))} ${describeProfitPayoutDestination(allocation.payout.destination as ProfitPayoutDestination)}`
          : allocation.publishedAt
            ? `Shared ${formatDateLabel(allocation.publishedAt)}`
            : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `dividend-${allocation.id}`,
      label: allocation.periodName,
      status: allocation.payout ? "Paid" : "Not paid yet",
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
  prismaOverride?: PrismaClient,
  resolvedMember?: Pick<
    NonNullable<Awaited<ReturnType<typeof getMemberByUserId>>>,
    "id" | "memberNumber" | "fullName"
  >
): Promise<MobileMemberSharesSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return emptyMobileMemberSharesSnapshot(
      "database_unavailable",
      "Share self-service needs the database runtime."
    )
  }

  const member = resolvedMember ?? (await getMemberByUserId(input, prisma))
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
            id: true,
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

  const payouts = await getMemberProfitPayouts(
    {
      memberId: member.id,
      seasonIds: dividendAllocations.map(
        (allocation) => allocation.dividendPeriod.id
      ),
      tenantId: input.tenantId,
    },
    prisma
  )
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
      payout: payouts.get(allocation.dividendPeriod.id) ?? null,
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

type LinkedShareMember = { memberId: string; tenantId: string }
type ShareTimelineCursor = {
  occurredAt: Date
  kind: MobileMemberShareTimelineItem["kind"]
  id: string
}

function parseShareTimelineCursor(
  cursor?: string | null
): ShareTimelineCursor | null {
  if (!cursor) return null
  const [date, kind, id, extra] = cursor.split("|")
  const occurredAt = new Date(date ?? "")
  if (
    !Number.isFinite(occurredAt.getTime()) ||
    (kind !== "ledger" && kind !== "request") ||
    !id ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ||
    extra !== undefined
  ) {
    throw ExpectedQueryError.validation("Share activity cursor is invalid.")
  }
  return { id, kind, occurredAt }
}

function shareTimelineId(item: MobileMemberShareTimelineItem) {
  return item.kind === "request" ? item.application.id : item.id
}

// Descending by timestamp, then requests before ledger movements, then id.
async function readShareTimeline(
  scope: LinkedShareMember,
  prisma: PrismaClient,
  cursor: ShareTimelineCursor | null,
  now: Date
): Promise<MobileMemberShareTimelinePage> {
  const limit = 20
  const requestsWhere: Prisma.MemberShareApplicationWhereInput = { ...scope }
  const ledgerWhere: Prisma.MemberShareLedgerEntryWhereInput = {
    ...scope,
    effectiveDate: { lte: now },
  }
  if (cursor?.kind === "request") {
    ledgerWhere.AND = { effectiveDate: { lte: cursor.occurredAt } }
  } else if (cursor?.kind === "ledger") {
    requestsWhere.createdAt = { lt: cursor.occurredAt }
    ledgerWhere.OR = [
      { effectiveDate: { lt: cursor.occurredAt } },
      { effectiveDate: cursor.occurredAt, id: { lt: cursor.id } },
    ]
  }

  const [requests, movements] = await Promise.all([
    prisma.memberShareApplication.findMany({
      // Let Postgres compare the cursor row at full timestamp precision.
      ...(cursor?.kind === "request"
        ? {
            cursor: { id: cursor.id, ...scope },
            skip: 1,
          }
        : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      where: requestsWhere,
    }),
    prisma.memberShareLedgerEntry.findMany({
      orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
      take: limit + 1,
      where: ledgerWhere,
    }),
  ])
  const items: MobileMemberShareTimelineItem[] = [
    ...requests.map((application) => ({
      application: toMobileShareApplication(application),
      kind: "request" as const,
      occurredAt: application.createdAt.toISOString(),
    })),
    ...movements.map((entry) => ({
      amount: Number(entry.amount),
      id: entry.id,
      kind: "ledger" as const,
      label: entry.notes ?? "Share ledger movement",
      occurredAt: entry.effectiveDate.toISOString(),
      source: humanizeStatus(entry.sourceType),
    })),
  ]
  items.sort((a, b) => {
    if (a.occurredAt !== b.occurredAt)
      return a.occurredAt < b.occurredAt ? 1 : -1
    if (a.kind !== b.kind) return a.kind === "request" ? -1 : 1
    return 0
  })
  const page = items.slice(0, limit)
  const last = page.at(-1)
  return {
    items: page,
    nextCursor:
      items.length > limit && last
        ? [last.occurredAt, last.kind, shareTimelineId(last)].join("|")
        : null,
  }
}

function publishedShareProfitWhere(scope: LinkedShareMember) {
  return { ...scope, dividendPeriod: { status: "published" as const } }
}

export async function getMobileMemberShareOverview(
  identity: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberShareOverview> {
  const prisma = prismaOverride ?? createPrismaClient()
  const now = new Date()
  const empty = {
    generatedAt: now.toISOString(),
    member: null,
    position: null,
    profit: { count: 0, total: 0, latestUnpaidAmount: null },
    shareBalance: 0,
    timeline: { items: [], nextCursor: null },
  }
  if (!prisma) return { ...empty, state: "database_unavailable" }
  const member = await getMemberByUserId(identity, prisma)
  if (!member) return { ...empty, state: "member_profile_missing" }

  const scope = { memberId: member.id, tenantId: identity.tenantId }
  const [policy, timeline, profit, latestUnpaid] = await Promise.all([
    getTenantSharePolicy(scope.tenantId, prisma),
    readShareTimeline(scope, prisma, null, now),
    prisma.dividendAllocation.aggregate({
      _count: { _all: true },
      _sum: { allocationAmount: true },
      where: publishedShareProfitWhere(scope),
    }),
    prisma.dividendAllocation.findFirst({
      orderBy: [{ dividendPeriod: { periodEnd: "desc" } }, { id: "desc" }],
      select: { allocationAmount: true },
      where: {
        ...scope,
        dividendPeriod: {
          status: "published",
          profitPayouts: { none: { ...scope, status: "paid" } },
        },
      },
    }),
  ])
  const unitBased = policy.configurationMode === "unit_based"
  const [position, balance] = await Promise.all([
    unitBased
      ? getMemberUnitSharePositionForLinkedMember(scope, policy, prisma)
      : null,
    unitBased
      ? null
      : prisma.memberShareLedgerEntry.aggregate({
          _sum: { amount: true },
          where: { ...scope, effectiveDate: { lte: now } },
        }),
  ])
  return {
    generatedAt: now.toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    position: position ? toMobileMemberSharePosition(position) : null,
    profit: {
      count: profit._count._all,
      total: Number(profit._sum.allocationAmount ?? 0),
      latestUnpaidAmount: latestUnpaid
        ? Number(latestUnpaid.allocationAmount)
        : null,
    },
    shareBalance:
      position?.totalApprovedValue ?? Number(balance?._sum.amount ?? 0),
    state: unitBased ? "available" : "unit_model_inactive",
    timeline,
  }
}

export async function getMobileMemberShareTimelinePage(
  input: { tenantId: string; userId: string; cursor: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberShareTimelinePage> {
  const cursor = parseShareTimelineCursor(input.cursor)
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Share activity is unavailable.")
  const member = await getMemberByUserId(input, prisma)
  if (!member) return { items: [], nextCursor: null }
  return readShareTimeline(
    { memberId: member.id, tenantId: input.tenantId },
    prisma,
    cursor,
    new Date()
  )
}

export async function getMobileMemberShareProfitPeriods(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberShareProfitPeriod[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Published profit is unavailable.")
  const member = await getMemberByUserId(input, prisma)
  if (!member) return []
  const scope = { memberId: member.id, tenantId: input.tenantId }
  const allocations = await prisma.dividendAllocation.findMany({
    orderBy: [{ dividendPeriod: { periodEnd: "desc" } }, { id: "desc" }],
    select: {
      allocationAmount: true,
      dividendPeriod: {
        select: { id: true, name: true, periodEnd: true, publishedAt: true },
      },
      id: true,
    },
    take: 12,
    where: publishedShareProfitWhere(scope),
  })
  const payouts = await getMemberProfitPayouts(
    {
      ...scope,
      seasonIds: allocations.map((allocation) => allocation.dividendPeriod.id),
    },
    prisma
  )
  return allocations.map(({ allocationAmount, dividendPeriod, id }) => {
    const payout = payouts.get(dividendPeriod.id)
    return {
      amount: Number(allocationAmount),
      id,
      name: dividendPeriod.name,
      payout: payout
        ? {
            destination: describeProfitPayoutDestination(
              payout.destination as ProfitPayoutDestination
            ),
            paidAt: payout.paidAt,
          }
        : null,
      periodEnd: dividendPeriod.periodEnd.toISOString(),
      publishedAt: dividendPeriod.publishedAt?.toISOString() ?? null,
    }
  })
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

export async function cancelMobileMemberShareApplicationForSession(input: {
  applicationId: string
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
      "Member profile needs linking before managing share requests."
    )
  }

  const application = await cancelOwnMemberShareApplication(
    {
      actorUserId: input.userId,
      applicationId: input.applicationId,
      memberId: member.id,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileShareApplication(application)
}
