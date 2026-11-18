import { Prisma, type PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { approvedNotPaidOutMetrics } from "./approved-not-paid-out"
import { getOverviewSummary } from "./dashboard"
import {
  createMember,
  getMemberRegistrySummary,
  getMemberStatementDetail,
  getMemberStatementSummary,
  listMembers,
  updateMemberKyc,
  updateMemberStatus,
} from "./members"
import {
  approveMemberOnboardingRequest,
  listMemberOnboardingRequests,
  rejectMemberOnboardingRequest,
} from "./member-onboarding"
import {
  getMemberScopedPaymentReceiptSummary,
  listMemberPaymentReceipts,
} from "./payment-receipts"
import { getMemberSupportCaseSummary, listSupportCases } from "./support"
import {
  getMemberShareBalancesAtDate,
  listMemberShareApplications,
  listMemberShareLedgerEntries,
} from "./tenant-finance"
export { orderMobileAdminActionQueue } from "./mobile-admin-member-lifecycle-policy"
import { orderMobileAdminActionQueue } from "./mobile-admin-member-lifecycle-policy"

export const mobileAdminMemberLifecycleStatusKeys = [
  "pending",
  "active",
  "inactive",
  "suspended",
  "exited",
] as const
type MobileAdminMemberStatus =
  (typeof mobileAdminMemberLifecycleStatusKeys)[number]

export const mobileAdminMemberLifecycleKycStatusKeys = [
  "not_started",
  "pending",
  "verified",
  "rejected",
] as const
type MobileAdminMemberKycStatus =
  (typeof mobileAdminMemberLifecycleKycStatusKeys)[number]

type MobileMetric = {
  detail: string
  format: "count" | "currency" | "percent"
  key: string
  label: string
  value: number
}

type MobileAdminMemberRow = {
  activeMonthlyCommitment: number | null
  deductionSourceName: string | null
  email: string | null
  fullName: string
  id: string
  joinedAt: string
  kycStatus: string
  linkedUserEmail: string | null
  memberNumber: string
  memberType: string
  phoneNumber: string | null
  status: string
}

/**
 * Triage 2.8 retired the old plan member cap, so adding members is always
 * available. The field stays in the directory response because installed
 * mobile builds only show "Add member" while `status` is "available".
 */
export function toMobileMemberExpansion(activeMemberCount: number) {
  return {
    activeMemberCount,
    activeMemberLimit: null,
    planCode: null,
    planName: null,
    reason: null,
    status: "available" as const,
  }
}

type MobileStatementSection = {
  emptyState: string
  key: string
  rows: Array<{
    detail: string
    format: MobileMetric["format"] | null
    key: string
    label: string
    status: string | null
    value: number | null
  }>
  subtitle: string
  title: string
}

function requirePrisma(feature: string) {
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(`${feature} is unavailable without database configuration.`)
  }
  return prisma
}

function humanize(value: string | null | undefined) {
  return value
    ? value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null
}

function toMemberRow(row: {
  contributionPlans: { amount: unknown }[]
  deductionSource: { name: string } | null
  email: string | null
  fullName: string
  id: string
  joinedAt: Date
  kycStatus: string
  memberNumber: string
  memberType: string
  phoneNumber: string | null
  status: string
  user: { email: string } | null
}): MobileAdminMemberRow {
  return {
    activeMonthlyCommitment: row.contributionPlans[0]
      ? Number(row.contributionPlans[0].amount)
      : null,
    deductionSourceName: row.deductionSource?.name ?? null,
    email: row.email ?? null,
    fullName: row.fullName,
    id: row.id,
    joinedAt: row.joinedAt.toISOString(),
    kycStatus: row.kycStatus,
    linkedUserEmail: row.user?.email ?? null,
    memberNumber: row.memberNumber,
    memberType: row.memberType,
    phoneNumber: row.phoneNumber ?? null,
    status: row.status,
  }
}

/** "₦180,000" for the tenant's currency (whole amounts keep no kobo). */
function formatOverviewMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      style: "currency",
    }).format(amount)
  } catch {
    return amount.toLocaleString("en-NG")
  }
}

/**
 * Mobile admin overview (T05). Mobile shows only open queue rows, so the
 * summary skips the operation profile ("open-items"); activity rows carry
 * the member, amount, kind and status the app lays out itself.
 */
export async function getMobileAdminLifecycleOverview(tenantId: string) {
  const prisma = createPrismaClient()
  const summary = await getOverviewSummary(tenantId, prisma ?? undefined, {
    queueRows: "open-items",
  })
  const currencyCode = summary.workspace.currencyCode
  return {
    actionQueue: orderMobileAdminActionQueue(summary.actionQueue)
      .slice(0, 8)
      .map((item) => ({
        count: item.count,
        detail: item.severity === "critical" ? "Needs urgent review" : "Open",
        key: item.key,
        label: item.label,
        severity: item.severity,
      })),
    complianceWatch: summary.complianceWatch.map(({ count, key, label }) => ({
      count,
      key,
      label,
    })),
    generatedAt: summary.workspace.generatedAt,
    recentActivity: summary.recentActivity.map(
      ({
        amount,
        detail,
        id,
        kind,
        label,
        memberName,
        occurredAt,
        status,
      }) => ({
        amount,
        detail,
        id,
        kind,
        label,
        memberName,
        occurredAt,
        status,
      })
    ),
    stats: [
      {
        detail: "After reserves",
        format: "currency" as const,
        key: "deployable-funds",
        label: "Deployable funds",
        value: summary.primaryMetrics.deployableFunds,
      },
      {
        detail: summary.contributionHealth.periodLabel,
        format: "percent" as const,
        key: "collection-coverage",
        label: "Collections",
        value: summary.primaryMetrics.collectionCoverage,
      },
      {
        detail: `${formatOverviewMoney(summary.primaryMetrics.portfolioAtRiskAmount, currencyCode)} overdue`,
        format: "percent" as const,
        key: "portfolio-risk",
        label: "Portfolio risk",
        value: summary.primaryMetrics.portfolioAtRiskRate,
      },
    ],
    warnings: summary.setupWarnings.map(({ key, label }) => ({ key, label })),
  }
}

export async function getMobileAdminMemberDirectorySummary(
  tenantId: string,
  prisma = createPrismaClient(),
  approvalLimit = 20
) {
  const where = { tenantId }
  const [groups, pendingDocuments, onboarding] = prisma
    ? await Promise.all([
        prisma.member.groupBy({
          by: ["status", "kycStatus"],
          _count: { _all: true },
          where,
        }),
        prisma.memberDocument.count({
          where: { ...where, reviewStatus: "pending" },
        }),
        listMemberOnboardingRequests(
          tenantId,
          { pageSize: approvalLimit, status: "pending_approval" },
          prisma
        ),
      ])
    : ([[], 0, { items: [], total: 0 }] as const)

  const statusCounts = {
    pending: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    exited: 0,
  }
  const kycCounts = { not_started: 0, pending: 0, verified: 0, rejected: 0 }
  let reviewCount = pendingDocuments
  let total = 0
  for (const { status, kycStatus, _count } of groups) {
    statusCounts[status] += _count._all
    kycCounts[kycStatus] += _count._all
    total += _count._all
    if (status === "active" && kycStatus !== "verified")
      reviewCount += _count._all
  }

  return {
    generatedAt: new Date().toISOString(),
    total,
    statusCounts,
    kycCounts,
    memberExpansion: toMobileMemberExpansion(statusCounts.active),
    onboardingRequests: onboarding.items.map((item) => ({
      createdAt: item.createdAt.toISOString(),
      email: item.email,
      emailVerifiedAt: item.emailVerifiedAt?.toISOString() ?? null,
      fullName: item.fullName,
      id: item.id,
      linkedUserEmail: item.user?.email ?? null,
      memberNumber: item.memberNumber,
      phoneNumber: item.phoneNumber ?? null,
      status: item.status,
    })),
    reviewQueues: [
      {
        count: onboarding.total,
        detail: "Pending signup approvals",
        key: "membership-approvals" as const,
        label: "Membership approvals",
        severity: "warning" as const,
      },
      {
        count: reviewCount,
        detail: "Members or documents waiting for KYC review",
        key: "kyc-documents" as const,
        label: "KYC and document reviews",
        severity: "warning" as const,
      },
    ].filter(({ count }) => count > 0),
  }
}

type DirectoryPageInput = {
  kycStatus?: MobileAdminMemberKycStatus
  needsReview?: boolean
  page?: number
  pageSize?: number
  search?: string
  status?: MobileAdminMemberStatus
  tenantId: string
}

export async function getMobileAdminMemberDirectoryPage(
  {
    tenantId,
    page = 1,
    pageSize = 20,
    search,
    status,
    kycStatus,
    needsReview,
  }: DirectoryPageInput,
  prisma = createPrismaClient()
) {
  const empty = {
    generatedAt: new Date().toISOString(),
    memberExpansion: toMobileMemberExpansion(0),
    members: [],
    onboardingRequests: [],
    page,
    pageSize,
    reviewQueues: [],
    summary: {
      activeCount: 0,
      kycPendingCount: 0,
      linkedUsersCount: 0,
      pageCount: 0,
      totalCount: 0,
    },
    total: 0,
  }
  if (!prisma) return empty

  const conditions = [Prisma.sql`m.tenant_id = ${tenantId}::uuid`]
  if (status) conditions.push(Prisma.sql`m.status = ${status}::"MemberStatus"`)
  if (kycStatus)
    conditions.push(Prisma.sql`m.kyc_status = ${kycStatus}::"KycStatus"`)
  if (needsReview) {
    conditions.push(Prisma.sql`(
      (m.status = 'active' AND m.kyc_status <> 'verified') OR EXISTS (
        SELECT 1 FROM member_documents d
        WHERE d.tenant_id = m.tenant_id AND d.member_id = m.id AND d.review_status = 'pending'
      )
    )`)
  }
  if (search) {
    const digits = /^[+()\s.\d-]+$/.test(search)
      ? search.replace(/\D/g, "")
      : ""
    const phone =
      digits.length >= 3 ? digits.replace(/^(?:234|0)(?=\d{10}$)/, "") : ""
    const textMatch = Prisma.sql`strpos(lower(m.full_name), lower(${search})) > 0
      OR strpos(lower(m.member_number), lower(${search})) > 0`
    conditions.push(
      phone
        ? Prisma.sql`(${textMatch} OR strpos(regexp_replace(m.phone_number, '[^0-9]', '', 'g'), ${phone}) > 0)`
        : Prisma.sql`(${textMatch})`
    )
  }
  const where = Prisma.join(conditions, " AND ")
  type Row = Pick<
    MobileAdminMemberRow,
    | "id"
    | "fullName"
    | "memberNumber"
    | "memberType"
    | "status"
    | "kycStatus"
    | "email"
    | "phoneNumber"
  > & { joinedAt: Date }
  const [items, [count]] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT m.id, m.full_name AS "fullName", m.member_number AS "memberNumber",
        m.member_type AS "memberType", m.status, m.kyc_status AS "kycStatus",
        m.joined_at AS "joinedAt", m.email, m.phone_number AS "phoneNumber"
      FROM members m WHERE ${where}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `,
    prisma.$queryRaw<{ total: bigint }[]>`
      SELECT count(*) AS total FROM members m WHERE ${where}
    `,
  ])

  return {
    ...empty,
    members: items.map((row) => ({
      ...row,
      activeMonthlyCommitment: null,
      deductionSourceName: null,
      joinedAt: row.joinedAt.toISOString(),
      linkedUserEmail: null,
    })),
    summary: {
      ...empty.summary,
      pageCount: items.length,
      totalCount: Number(count?.total ?? 0),
    },
    total: Number(count?.total ?? 0),
  }
}

export async function getMobileAdminMemberDirectory(input: {
  kycStatus?: MobileAdminMemberKycStatus
  page?: number
  pageSize?: number
  search?: string
  status?: MobileAdminMemberStatus
  tenantId: string
}) {
  const prisma = createPrismaClient()
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 25
  if (!prisma) {
    return {
      generatedAt: new Date().toISOString(),
      memberExpansion: toMobileMemberExpansion(0),
      members: [],
      onboardingRequests: [],
      page,
      pageSize,
      reviewQueues: [],
      summary: {
        activeCount: 0,
        kycPendingCount: 0,
        linkedUsersCount: 0,
        pageCount: 0,
        totalCount: 0,
      },
      total: 0,
    }
  }

  const [result, registry, directory] = await Promise.all([
    listMembers(
      input.tenantId,
      {
        kycStatus: input.kycStatus,
        page,
        pageSize,
        search: input.search,
        status: input.status,
      },
      prisma
    ),
    getMemberRegistrySummary(
      input.tenantId,
      {
        kycStatus: input.kycStatus,
        search: input.search,
        status: input.status,
      },
      prisma
    ),
    getMobileAdminMemberDirectorySummary(input.tenantId, prisma, 3),
  ])
  const members = result.items.map(toMemberRow)

  return {
    generatedAt: new Date().toISOString(),
    memberExpansion: directory.memberExpansion,
    members,
    onboardingRequests: directory.onboardingRequests,
    reviewQueues: directory.reviewQueues,
    page: result.page,
    pageSize: result.pageSize,
    summary: {
      activeCount: registry.activeCount,
      kycPendingCount: registry.kycPendingCount,
      linkedUsersCount: registry.linkedUsersCount,
      pageCount: members.length,
      totalCount: registry.totalCount,
    },
    total: result.total,
  }
}

export async function getMobileAdminMemberProfile(
  { tenantId, memberId }: { tenantId: string; memberId: string },
  prisma?: PrismaClient | null
) {
  const db = prisma ?? createPrismaClient()
  const empty = {
    generatedAt: new Date().toISOString(),
    member: null,
    sections: [],
    stats: [],
    recentChanges: [],
  }
  if (!db) return empty

  const scope = { tenantId, memberId }
  const member = await db.member.findFirst({
    where: { id: memberId, tenantId },
    include: {
      contributionPlans: {
        where: { isActive: true },
        orderBy: { startsAt: "desc" },
        select: { amount: true },
        take: 1,
      },
      deductionSource: { select: { name: true } },
      documents: {
        where: { tenantId },
        orderBy: { uploadedAt: "desc" },
        select: { id: true, documentType: true, reviewStatus: true },
        take: 20,
      },
      user: { select: { email: true, fullName: true } },
    },
  })
  if (!member) return empty

  const [summary, shares, receipts, changes] = await Promise.all([
    getMemberStatementSummary(tenantId, memberId, db),
    db.memberShareLedgerEntry.aggregate({
      _sum: { amount: true },
      where: { ...scope, effectiveDate: { lte: new Date() } },
    }),
    getMemberScopedPaymentReceiptSummary(scope, db),
    db.auditLog.findMany({
      where: {
        tenantId,
        entityType: "Member",
        entityId: memberId,
        action: {
          in: ["member.created", "member.kyc_updated", "member.status_changed"],
        },
      },
      select: {
        id: true,
        action: true,
        occurredAt: true,
        metadata: true,
        actorUser: { select: { fullName: true } },
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ])
  return {
    ...empty,
    member: {
      ...toMemberRow(member),
      exitedAt: member.exitedAt?.toISOString() ?? null,
      linkedUserName: member.user?.fullName ?? null,
    },
    sections: [
      {
        key: "documents",
        title: "Documents",
        subtitle: "Uploaded KYC and member evidence.",
        emptyState: "None uploaded",
        rows: member.documents.map((document) => ({
          detail: document.documentType,
          format: null,
          key: document.id,
          label: humanize(document.documentType) ?? "Member document",
          status: document.reviewStatus,
          value: null,
        })),
      },
    ],
    stats: [
      {
        key: "savings",
        label: "Savings",
        detail: "Posted member savings",
        value: summary?.totalSavingsSnapshot ?? 0,
        format: "currency",
      },
      {
        key: "financing",
        label: "Financing",
        detail: "Current financing principal",
        value: summary?.totalOutstandingPrincipal ?? 0,
        format: "currency",
      },
      {
        key: "share-capital",
        label: "Share capital",
        detail: "Posted share balance",
        value: Math.max(0, Number(shares._sum.amount ?? 0)),
        format: "currency",
      },
      {
        key: "receipt-pending-review",
        label: "Receipts to review",
        detail: "Submitted or under review",
        value: receipts.pendingReviewReceipts,
        format: "count",
      },
      ...approvedNotPaidOutMetrics(summary),
    ] satisfies MobileMetric[],
    recentChanges: changes.map(
      ({ action, actorUser, id, metadata, occurredAt }) => {
        const fields =
          metadata && typeof metadata === "object" && !Array.isArray(metadata)
            ? metadata
            : {}
        const kind =
          action === "member.kyc_updated"
            ? "kyc"
            : action === "member.status_changed"
              ? "status"
              : "created"
        const value = kind === "kyc" ? fields.kycStatus : fields.newStatus
        const notes =
          kind === "kyc" ? fields.kycReviewNotes : fields.reviewNotes
        return {
          actor: actorUser?.fullName ?? null,
          id,
          kind,
          notes: typeof notes === "string" ? notes : null,
          occurredAt: occurredAt.toISOString(),
          value: typeof value === "string" ? value : null,
        }
      }
    ),
  }
}

export async function getMobileAdminMemberLifecycleDetail(input: {
  memberId: string
  tenantId: string
}) {
  const prisma = createPrismaClient()
  const empty = (detail: string) => ({
    generatedAt: new Date().toISOString(),
    member: null,
    sections: [
      {
        emptyState: detail,
        key: "profile",
        rows: [
          {
            detail,
            format: null,
            key: "member-profile",
            label: "Member profile",
            status: "Unavailable",
            value: null,
          },
        ],
        subtitle: "Membership identity and account readiness.",
        title: "Profile",
      },
    ] satisfies MobileStatementSection[],
    stats: [
      {
        detail: "No active commitment available",
        format: "currency" as const,
        key: "active-commitment",
        label: "Active commitment",
        value: 0,
      },
      {
        detail: "No posted contribution entries",
        format: "currency" as const,
        key: "savings",
        label: "Savings",
        value: 0,
      },
      {
        detail: "No active financing",
        format: "currency" as const,
        key: "financing",
        label: "Financing",
        value: 0,
      },
      {
        detail: "No published dividends",
        format: "currency" as const,
        key: "dividends",
        label: "Dividends",
        value: 0,
      },
    ] satisfies MobileMetric[],
  })
  if (!prisma)
    return empty("Database is not configured for this mobile session.")
  const detail = await getMemberStatementDetail(
    input.tenantId,
    input.memberId,
    prisma
  )
  if (!detail)
    return empty("No statement detail was found for this member profile.")
  const summary = detail.summary
  const [
    receiptSummary,
    receipts,
    supportSummary,
    supportCases,
    shareBalances,
    shareApplications,
    shareLedger,
  ] = await Promise.all([
    getMemberScopedPaymentReceiptSummary(
      { memberId: detail.member.id, tenantId: input.tenantId },
      prisma
    ),
    listMemberPaymentReceipts(
      input.tenantId,
      { limit: 3, memberId: detail.member.id },
      prisma
    ),
    getMemberSupportCaseSummary(
      { memberId: detail.member.id, tenantId: input.tenantId },
      prisma
    ),
    listSupportCases(
      { limit: 3, memberId: detail.member.id, tenantId: input.tenantId },
      prisma
    ),
    getMemberShareBalancesAtDate(input.tenantId, new Date(), prisma),
    listMemberShareApplications(
      { memberId: detail.member.id, tenantId: input.tenantId },
      prisma
    ),
    listMemberShareLedgerEntries(
      { memberId: detail.member.id, tenantId: input.tenantId },
      prisma
    ),
  ])
  const shareBalance =
    shareBalances.find((balance) => balance.memberId === detail.member.id)
      ?.shareBalance ?? 0
  const documentRows = detail.member.documents.map((document) => ({
    detail: document.documentType,
    format: null,
    key: document.id,
    label: humanize(document.documentType) ?? "Member document",
    status: humanize(document.reviewStatus),
    value: null,
  }))
  const sections: MobileStatementSection[] = [
    {
      emptyState: "Member identity is unavailable.",
      key: "profile",
      rows: [
        {
          detail: `${humanize(detail.member.memberType)} member`,
          format: null,
          key: "member-number",
          label: detail.member.memberNumber,
          status: humanize(detail.member.kycStatus),
          value: null,
        },
      ],
      subtitle: "Membership identity and account readiness.",
      title: "Profile",
    },
    {
      emptyState: "No contribution records.",
      key: "commitments",
      rows: [
        {
          detail: `${summary?.contributionsCount ?? 0} posted entries`,
          format: "currency",
          key: "savings",
          label: "Savings snapshot",
          status: "Posted",
          value: summary?.totalSavingsSnapshot ?? 0,
        },
      ],
      subtitle: "Posted member commitments and savings.",
      title: "Commitments",
    },
    {
      emptyState: "No active financing.",
      key: "financing",
      rows: [
        {
          detail: `${summary?.activeLoanCount ?? 0} active record(s)`,
          format: "currency",
          key: "outstanding-financing",
          label: "Outstanding financing",
          status: summary?.activeLoanCount ? "Active" : "Clear",
          value: summary?.totalOutstandingPrincipal ?? 0,
        },
        ...approvedNotPaidOutMetrics(summary).map((metric) => ({
          ...metric,
          status: "Approved",
        })),
      ],
      subtitle: "Current financing exposure.",
      title: "Financing",
    },
    {
      emptyState: "No share activity.",
      key: "shares",
      rows: [
        {
          detail: `${shareApplications.length} application(s) · ${shareLedger.length} ledger movement(s)`,
          format: "currency",
          key: "share-capital",
          label: "Share capital",
          status: "Current",
          value: shareBalance,
        },
      ],
      subtitle: "Share capital, applications, and ledger activity.",
      title: "Shares",
    },
    {
      emptyState: "No payment receipts.",
      key: "receipts",
      rows: [
        {
          detail: `${receiptSummary.submittedReceipts} submitted · ${receiptSummary.underReviewReceipts} under review`,
          format: "count",
          key: "receipt-pending-review",
          label: "Pending review",
          status:
            receiptSummary.pendingReviewReceipts > 0
              ? "Needs finance review"
              : "Clear",
          value: receiptSummary.pendingReviewReceipts,
        },
        ...receipts.map((receipt) => ({
          detail: `${receipt.allocations.length} allocation(s) · ${receipt.paidAt.toISOString()}`,
          format: "currency" as const,
          key: `receipt-${receipt.id}`,
          label: receipt.paymentReference
            ? `Receipt ${receipt.paymentReference}`
            : "Payment receipt",
          status: humanize(receipt.status),
          value: receipt.totalAmount,
        })),
      ],
      subtitle: "Submitted proof of payment and finance review state.",
      title: "Receipts",
    },
    {
      emptyState: "No charge applications.",
      key: "charges",
      rows: detail.chargeApplications.map((charge: any) => ({
        detail: humanize(charge.collectionMode) ?? "Workflow charge",
        format: "currency",
        key: `charge-${charge.id}`,
        label: charge.chargeDefinition.name,
        status: humanize(charge.status),
        value: Number(charge.amount ?? 0),
      })),
      subtitle: "Workflow charges remain separate from principal amounts.",
      title: "Charges",
    },
    {
      emptyState: "No support cases.",
      key: "support",
      rows: [
        {
          detail: "Open, in progress, or waiting on member",
          format: "count",
          key: "support-open",
          label: "Open support",
          status: supportSummary.openCases > 0 ? "Open" : "Clear",
          value: supportSummary.openCases,
        },
        ...supportCases.map((supportCase) => ({
          detail:
            supportCase.messages.at(-1)?.message ?? supportCase.description,
          format: null,
          key: `support-${supportCase.id}`,
          label: supportCase.subject,
          status: humanize(supportCase.status),
          value: null,
        })),
      ],
      subtitle: "Account questions and money-impact review state.",
      title: "Support",
    },
    {
      emptyState: "No member documents.",
      key: "documents",
      rows: documentRows,
      subtitle: "Uploaded KYC and member evidence.",
      title: "Documents",
    },
    {
      emptyState: "No posted ledger transactions.",
      key: "ledger",
      rows: detail.ledgerTransactions.slice(0, 8).map((transaction) => ({
        detail: `${transaction.entries.length} ledger entr${transaction.entries.length === 1 ? "y" : "ies"}`,
        format: "currency",
        key: `ledger-${transaction.id}`,
        label:
          transaction.narration ??
          humanize(transaction.transactionType) ??
          "Ledger transaction",
        status: humanize(transaction.transactionType),
        value: transaction.entries.reduce(
          (total, entry) => total + Number(entry.amount ?? 0),
          0
        ),
      })),
      subtitle: "Recent accounting activity posted to the member ledger.",
      title: "Ledger",
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    member: {
      deductionSourceName: detail.member.deductionSource?.name ?? null,
      email: detail.member.email ?? null,
      exitedAt: detail.member.exitedAt?.toISOString() ?? null,
      fullName: detail.member.fullName,
      id: detail.member.id,
      joinedAt: detail.member.joinedAt.toISOString(),
      kycStatus: detail.member.kycStatus,
      linkedUserEmail: detail.member.user?.email ?? null,
      linkedUserName: detail.member.user?.fullName ?? null,
      memberNumber: detail.member.memberNumber,
      memberType: detail.member.memberType,
      phoneNumber: detail.member.phoneNumber ?? null,
      status: detail.member.status,
    },
    sections,
    stats: [
      {
        detail: "Posted member savings",
        format: "currency" as const,
        key: "savings",
        label: "Savings",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail: "Current financing principal",
        format: "currency" as const,
        key: "financing",
        label: "Financing",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
      ...approvedNotPaidOutMetrics(summary),
    ],
  }
}

export async function createMobileAdminMemberProfile(input: {
  actorUserId: string
  address?: string | null
  email?: string | null
  fullName: string
  joinedAt: Date
  memberNumber: string
  memberType: "civil_servant" | "individual" | "business"
  monthlyCommitment?: number | null
  occupation?: string | null
  phoneNumber?: string | null
  tenantId: string
}) {
  const prisma = requirePrisma("Member creation")
  const member = await createMember(
    {
      ...input,
      email: input.email?.toLowerCase() ?? null,
      monthlyCommitment: input.monthlyCommitment ?? undefined,
    },
    prisma
  )
  return {
    activeMonthlyCommitment: input.monthlyCommitment ?? null,
    deductionSourceName: null,
    email: member.email ?? null,
    fullName: member.fullName,
    id: member.id,
    joinedAt: member.joinedAt.toISOString(),
    kycStatus: member.kycStatus,
    linkedUserEmail: null,
    memberNumber: member.memberNumber,
    memberType: member.memberType,
    phoneNumber: member.phoneNumber ?? null,
    status: member.status,
  }
}

export async function changeMobileAdminMemberStatus(input: {
  actorUserId: string
  memberId: string
  reviewNotes?: string | null
  status: string
  tenantId: string
}) {
  const prisma = requirePrisma("Member status review")
  const member = await updateMemberStatus(
    input.tenantId,
    input.memberId,
    input.status as never,
    input.actorUserId,
    { prisma, reviewNotes: input.reviewNotes }
  )
  return { id: member.id, status: member.status }
}

export async function reviewMobileAdminMemberKyc(input: {
  actorUserId: string
  governmentIdNumber?: string | null
  kycDocumentType?: string | null
  kycDocumentUrl?: string | null
  kycReviewNotes?: string | null
  kycStatus: string
  memberId: string
  tenantId: string
}) {
  const prisma = requirePrisma("Member KYC review")
  const member = await updateMemberKyc(
    { ...input, kycStatus: input.kycStatus as never },
    prisma
  )
  return { id: member.id, kycStatus: member.kycStatus }
}

export async function decideMobileAdminMemberOnboarding(input: {
  actorUserId: string
  decision: "approved" | "rejected"
  requestId: string
  reviewNotes?: string | null
  tenantId: string
}) {
  const prisma = requirePrisma("Member onboarding review")
  const result =
    input.decision === "approved"
      ? await approveMemberOnboardingRequest(
          {
            actorUserId: input.actorUserId,
            requestId: input.requestId,
            reviewNotes: input.reviewNotes,
            tenantId: input.tenantId,
          },
          prisma
        )
      : await rejectMemberOnboardingRequest(
          {
            actorUserId: input.actorUserId,
            reason: input.reviewNotes,
            requestId: input.requestId,
            tenantId: input.tenantId,
          },
          prisma
        )
  return { id: result.request.id, status: result.request.status }
}
