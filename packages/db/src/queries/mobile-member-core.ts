import { createPrismaClient } from "../prisma"
import { approvedNotPaidOutMetrics } from "./approved-not-paid-out"
import {
  getMemberByUserId,
  getMemberStatementSummary,
  type MemberStatementSummary,
} from "./members"
import { getMobileNotificationUnreadCount } from "./mobile-notifications"
import { resolveTenantServiceCapabilities } from "./operation-profile"
import { memberReceiptSubmissionAccessSql } from "./payment-receipt-member-access"

export const mobileMemberSectionKeys = [
  "commitments",
  "financing",
  "shares",
] as const

export type MobileMemberCoreMetric = {
  detail: string
  format: "currency" | "percent" | "count"
  key: string
  label: string
  value: number
}

export type MobileMemberCoreHome = {
  actionItems: {
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }[]
  generatedAt: string
  member: {
    id: string
    kycStatus: string
    memberNumber: string
    name: string
    status: string
  } | null
  /** Bell badge on home (T04). */
  notifications: { unread: number }
  readiness: {
    detail: string
    percentage: number
    status: "ready" | "needs_attention" | "missing_profile"
  }
  services: {
    icon: string
    key: string
    label: string
    tone: "accent" | "primary" | "success"
  }[]
  stats: MobileMemberCoreMetric[]
}

export type MobileMemberCommitmentRow = {
  detail: string
  interval?: string
  format: "currency" | "percent" | "count" | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberCommitments = {
  emptyState: string
  generatedAt: string
  key: "commitments"
  rows: MobileMemberCommitmentRow[]
  stats: MobileMemberCoreMetric[]
  subtitle: string
  title: string
}

type MobileMemberCommitmentsBuildInput = {
  activePlan: {
    amount: number
    id: string
    interval: string
    isActive: boolean
    name: string
    startsAt: Date | null
  } | null
  contributions: {
    amount: number
    channel: string
    extraSavingsAmount: number
    id: string
    periodLabel: string | null
    postedAt: Date | null
    reference: string | null
    status: string
  }[]
  generatedAt?: Date
  summary: {
    contributionsCount: number
    specialSavingsBalance: number
    totalSavingsSnapshot: number
  } | null
}

type MobileMemberCoreOperationProfile = {
  services: {
    food_purchase: { shouldShowInMemberNav: boolean }
    payment_receipts: { shouldShowInMemberNav: boolean }
    procurement: { shouldShowInMemberNav: boolean }
    support_cases: { shouldShowInMemberNav: boolean }
  }
}

type MobileMemberCoreIdentity = {
  fullName: string
  id: string
  kycStatus: string
  memberNumber: string
  status: string
}

function formatDateLabel(value: Date | null) {
  if (!value) return null

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

function emptyMobileMemberCommitments(
  detail = "No linked member profile was found for this mobile session."
): MobileMemberCommitments {
  return {
    emptyState: "No commitment records are available yet.",
    generatedAt: new Date().toISOString(),
    key: "commitments",
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
        detail: "No active commitment available",
        format: "currency",
        key: "active-commitment",
        label: "Active commitment",
        value: 0,
      },
      {
        detail: "No posted savings available",
        format: "currency",
        key: "savings",
        label: "Savings",
        value: 0,
      },
      {
        detail: "No special savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: 0,
      },
      {
        detail: "No posted contributions",
        format: "count",
        key: "contributions",
        label: "Contributions",
        value: 0,
      },
    ],
    subtitle:
      "Track your active commitment, posted savings, and voluntary savings separately.",
    title: "Commitments",
  }
}

export function buildMobileMemberCommitments(
  input: MobileMemberCommitmentsBuildInput
): MobileMemberCommitments {
  const rows: MobileMemberCommitmentRow[] = []

  if (input.activePlan) {
    rows.push({
      detail: input.activePlan.startsAt
        ? `Started ${formatDateLabel(input.activePlan.startsAt)}`
        : (humanizeStatus(input.activePlan.interval) ?? "Contribution plan"),
      format: "currency",
      interval: humanizeStatus(input.activePlan.interval) ?? undefined,
      key: `plan-${input.activePlan.id}`,
      label: input.activePlan.name,
      status: input.activePlan.isActive ? "Active" : "Inactive",
      value: input.activePlan.amount,
    })
  }

  for (const contribution of input.contributions.slice(0, 4)) {
    rows.push({
      detail: [
        humanizeStatus(contribution.channel),
        contribution.postedAt
          ? `Posted ${formatDateLabel(contribution.postedAt)}`
          : null,
        contribution.reference ? `Ref ${contribution.reference}` : null,
        contribution.extraSavingsAmount > 0
          ? `Special savings ${contribution.extraSavingsAmount}`
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `contribution-${contribution.id}`,
      label: contribution.periodLabel ?? "Contribution posted",
      status: humanizeStatus(contribution.status),
      value: contribution.amount,
    })
  }

  const summary = input.summary

  return {
    emptyState: "No commitment records are available yet.",
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    key: "commitments",
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail:
                "Your active plan and posted contributions will appear here.",
              format: null,
              key: "commitments-empty",
              label: "No commitment activity",
              status: null,
              value: null,
            },
          ],
    stats: [
      {
        detail: input.activePlan?.startsAt
          ? `Active since ${formatDateLabel(input.activePlan.startsAt)}`
          : "No active commitment available",
        format: "currency",
        key: "active-commitment",
        label: "Active commitment",
        value: input.activePlan?.amount ?? 0,
      },
      {
        detail:
          (summary?.contributionsCount ?? 0) > 0
            ? `${summary?.contributionsCount ?? 0} posted entries`
            : "No posted contribution entries",
        format: "currency",
        key: "savings",
        label: "Savings",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail:
          (summary?.specialSavingsBalance ?? 0) > 0
            ? "Opening and voluntary special savings"
            : "No special savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: summary?.specialSavingsBalance ?? 0,
      },
      {
        detail: "Posted contribution entries",
        format: "count",
        key: "contributions",
        label: "Contributions",
        value: summary?.contributionsCount ?? 0,
      },
    ],
    subtitle:
      "Track your active commitment, posted savings, and voluntary savings separately.",
    title: "Commitments",
  }
}

function getReadiness(input: {
  kycStatus: string
  memberStatus: string
}): MobileMemberCoreHome["readiness"] {
  if (input.memberStatus !== "active") {
    return {
      detail: "Your membership is not active yet.",
      percentage: 40,
      status: "needs_attention",
    }
  }

  if (input.kycStatus === "verified") {
    return {
      detail: "Member profile and KYC are ready.",
      percentage: 100,
      status: "ready",
    }
  }

  return {
    detail:
      input.kycStatus === "rejected"
        ? "KYC needs correction before full self-service access."
        : "KYC is still pending or not started.",
    percentage: input.kycStatus === "rejected" ? 50 : 72,
    status: "needs_attention",
  }
}

function getServices(input: {
  foodPurchaseRecords: number
  operationProfile: MobileMemberCoreOperationProfile | null
  procurementRecords: number
  receiptRecords: number
  supportRecords: number
}): MobileMemberCoreHome["services"] {
  const services: MobileMemberCoreHome["services"] = [
    {
      icon: "BadgeCheck",
      key: "commitments",
      label: "Commitments",
      tone: "accent",
    },
    { icon: "Wallet", key: "savings", label: "Savings", tone: "success" },
    {
      icon: "HandCoins",
      key: "financing",
      label: "Financing",
      tone: "primary",
    },
    { icon: "PieChart", key: "shares", label: "Shares", tone: "accent" },
    {
      icon: "FileText",
      key: "statements",
      label: "Statements",
      tone: "primary",
    },
    {
      icon: "Bell",
      key: "notifications",
      label: "Notifications",
      tone: "accent",
    },
    { icon: "RefreshCw", key: "updates", label: "Updates", tone: "accent" },
    {
      icon: "BriefcaseBusiness",
      key: "projectFinancing",
      label: "Project Financing",
      tone: "primary",
    },
    {
      icon: "ShieldCheck",
      key: "guarantors",
      label: "Guarantor approvals",
      tone: "success",
    },
  ]

  if (!input.operationProfile) {
    services.push({
      icon: "Headphones",
      key: "support",
      label: "Support",
      tone: "primary",
    })
    return services
  }

  const profileServices = input.operationProfile.services
  const optionalServices = [
    {
      hasRecords: input.receiptRecords > 0,
      icon: "ReceiptText",
      key: "receipts",
      label: "Transactions",
      setting: profileServices.payment_receipts,
      tone: "primary",
    },
    {
      hasRecords: input.procurementRecords > 0,
      icon: "PackageSearch",
      key: "procurement",
      label: "Procurement",
      setting: profileServices.procurement,
      tone: "accent",
    },
    {
      hasRecords: input.foodPurchaseRecords > 0,
      icon: "ShoppingBasket",
      key: "foodPurchase",
      label: "Foodstuff Purchase",
      setting: profileServices.food_purchase,
      tone: "success",
    },
    {
      hasRecords: input.supportRecords > 0,
      icon: "Headphones",
      key: "support",
      label: "Support",
      setting: profileServices.support_cases,
      tone: "primary",
    },
  ] as const

  for (const service of optionalServices) {
    if (!service.setting.shouldShowInMemberNav && !service.hasRecords) continue
    services.push({
      icon: service.icon,
      key: service.key,
      label: service.label,
      tone: service.tone,
    })
  }

  return services
}

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/**
 * The savings total is the member's savings snapshot, which can hold an
 * opening balance before any contribution is posted; never pair a balance
 * with "no entries".
 */
function describeSavingsTotal(contributionsCount: number, total: number) {
  if (contributionsCount > 0) {
    return `${countLabel(contributionsCount, "contribution")} posted`
  }
  return total > 0 ? "Savings balance on record" : "No contributions posted yet"
}

export function buildMobileMemberCoreHome(input: {
  foodPurchaseRecords: number
  generatedAt?: Date
  member: MobileMemberCoreIdentity | null
  operationProfile: MobileMemberCoreOperationProfile | null
  procurementRecords: number
  receiptRecords: number
  shareCapital: number
  summary: MemberStatementSummary | null
  supportRecords: number
  unreadNotifications?: number
}): MobileMemberCoreHome {
  const services = getServices(input)
  const notifications = {
    unread: Math.max(0, Math.trunc(input.unreadNotifications ?? 0)),
  }

  if (!input.member) {
    return {
      actionItems: [
        {
          detail: "No linked member profile was found for this mobile session.",
          key: "member-profile",
          label: "Member profile needs linking",
          severity: "warning",
        },
      ],
      generatedAt: (input.generatedAt ?? new Date()).toISOString(),
      member: null,
      notifications,
      readiness: {
        detail: "Your cooperative profile is not linked to this account yet.",
        percentage: 0,
        status: "missing_profile",
      },
      services,
      stats: [
        {
          detail: "No active commitment available",
          format: "currency",
          key: "commitment",
          label: "Commitment",
          value: 0,
        },
        {
          detail: "No posted savings available",
          format: "currency",
          key: "savings",
          label: "Savings",
          value: 0,
        },
        {
          detail: "No active financing available",
          format: "currency",
          key: "financing",
          label: "Financing",
          value: 0,
        },
      ],
    }
  }

  const summary = input.summary
  const readiness = getReadiness({
    kycStatus: input.member.kycStatus,
    memberStatus: input.member.status,
  })
  const actionItems: MobileMemberCoreHome["actionItems"] = []

  if (readiness.status !== "ready") {
    actionItems.push({
      detail: readiness.detail,
      key: "kyc-readiness",
      label: "Profile readiness",
      severity: "warning",
    })
  }
  if (!summary?.activeCommitmentAmount) {
    actionItems.push({
      detail: "No active monthly commitment was found.",
      key: "commitment",
      label: "Commitment setup",
      severity: "neutral",
    })
  }
  if ((summary?.totalOutstandingPrincipal ?? 0) > 0) {
    actionItems.push({
      detail: `${countLabel(summary?.activeLoanCount ?? 0, "active financing record")}.`,
      key: "financing",
      label: "Financing exposure",
      severity: "neutral",
    })
  }

  return {
    actionItems,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    member: {
      id: input.member.id,
      kycStatus: input.member.kycStatus,
      memberNumber: input.member.memberNumber,
      name: input.member.fullName,
      status: input.member.status,
    },
    notifications,
    readiness,
    services,
    stats: [
      {
        detail: summary?.activeCommitmentStartsAt
          ? `Active since ${formatDateLabel(summary.activeCommitmentStartsAt)}`
          : "No active commitment available",
        format: "currency",
        key: "commitment",
        label: "Commitment",
        value: summary?.activeCommitmentAmount ?? 0,
      },
      {
        detail: describeSavingsTotal(
          summary?.contributionsCount ?? 0,
          summary?.totalSavingsSnapshot ?? 0
        ),
        format: "currency",
        key: "savings",
        label: "Savings total",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail:
          (summary?.specialSavingsBalance ?? 0) > 0
            ? "Opening and voluntary special savings"
            : "No special savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: summary?.specialSavingsBalance ?? 0,
      },
      {
        detail:
          (summary?.activeLoanCount ?? 0) > 0
            ? countLabel(
                summary?.activeLoanCount ?? 0,
                "active financing record"
              )
            : "No active financing",
        format: "currency",
        key: "financing",
        label: "Financing exposure",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
      ...approvedNotPaidOutMetrics(summary),
      {
        detail:
          input.shareCapital > 0
            ? "Ledger balance as of today"
            : "No share capital posted",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: input.shareCapital,
      },
    ],
  }
}

type MobileMemberHomeSignals = {
  foodPurchaseRecords: number
  operationProfile: MobileMemberCoreOperationProfile | null
  procurementRecords: number
  receiptRecords: number
  supportRecords: number
}

const emptyMobileMemberHomeSignals: MobileMemberHomeSignals = {
  foodPurchaseRecords: 0,
  operationProfile: null,
  procurementRecords: 0,
  receiptRecords: 0,
  supportRecords: 0,
}

/**
 * Everything home needs to decide the optional service tiles, in one
 * statement: whether the member has receipts, procurement, foodstuff or
 * support records (EXISTS on the tenant+member indexes) and the tenant's
 * service access modes. It replaces four full list reads (with their
 * relation loads) and the operation profile read, and never writes defaults.
 */
async function readMobileMemberHomeSignals(
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>,
  tenantId: string,
  memberId: string
): Promise<MobileMemberHomeSignals> {
  const rows = (await prisma.$queryRaw`
    SELECT
      EXISTS (
        SELECT 1 FROM member_payment_receipts
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
      ) AS "hasReceipts",
      ${memberReceiptSubmissionAccessSql({ tenantId, memberId })} AS "canSendReceipt",
      EXISTS (
        SELECT 1 FROM procurement_requests
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
      ) AS "hasProcurement",
      EXISTS (
        SELECT 1 FROM food_purchase_applications
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
      ) AS "hasFoodPurchase",
      EXISTS (
        SELECT 1 FROM support_cases
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
      ) AS "hasSupport",
      COALESCE(
        (
          SELECT jsonb_object_agg(service_key::text, access_mode::text)
          FROM tenant_service_settings
          WHERE tenant_id = ${tenantId}::uuid
        ),
        '{}'::jsonb
      ) AS "serviceModes"
  `) as Array<{
    hasFoodPurchase: boolean
    hasProcurement: boolean
    hasReceipts: boolean
    canSendReceipt: boolean
    hasSupport: boolean
    serviceModes: Record<string, unknown> | null
  }>
  const row = rows[0]
  if (!row) return emptyMobileMemberHomeSignals
  const services = resolveTenantServiceCapabilities(row.serviceModes ?? {})
  services.payment_receipts.shouldShowInMemberNav = row.canSendReceipt

  return {
    foodPurchaseRecords: row.hasFoodPurchase ? 1 : 0,
    operationProfile: {
      services,
    },
    procurementRecords: row.hasProcurement ? 1 : 0,
    receiptRecords: row.hasReceipts ? 1 : 0,
    supportRecords: row.hasSupport ? 1 : 0,
  }
}

/**
 * Mobile member home (T04): the member row, then the statement summary, the
 * service signals and the bell's unread count in parallel. Four queries
 * after the request's access gate, whatever the member's history size.
 */
export async function getMobileMemberCoreHome(
  input: {
    tenantId: string
    /** For the notification badge; omitted means no unread count is read. */
    userEmail?: string | null
    userId: string
  },
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileMemberCoreHome> {
  const prisma = prismaOverride ?? createPrismaClient()
  const empty = (generatedAt?: Date) =>
    buildMobileMemberCoreHome({
      ...emptyMobileMemberHomeSignals,
      generatedAt,
      member: null,
      shareCapital: 0,
      summary: null,
    })

  if (!prisma) return empty()

  const member = await getMemberByUserId(input, prisma)
  if (!member) return empty()

  const [summary, signals, unreadNotifications] = await Promise.all([
    getMemberStatementSummary(input.tenantId, member.id, prisma),
    readMobileMemberHomeSignals(prisma, input.tenantId, member.id),
    input.userEmail
      ? getMobileNotificationUnreadCount(
          {
            role: "member",
            tenantId: input.tenantId,
            userEmail: input.userEmail,
            userId: input.userId,
          },
          prisma
        )
      : Promise.resolve(0),
  ])

  return buildMobileMemberCoreHome({
    ...signals,
    member,
    // Share ledger balance as of today, from the same summary the web uses.
    shareCapital: summary?.shareCapitalBalance ?? 0,
    summary,
    unreadNotifications,
  })
}

export async function getMobileMemberCommitments(
  input: {
    tenantId: string
    userId: string
    summaryOnly?: boolean
  },
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileMemberCommitments> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) return emptyMobileMemberCommitments()

  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptyMobileMemberCommitments()

  const where = { memberId: member.id, tenantId: input.tenantId }
  const [activePlan, summary, contributions] = await Promise.all([
    prisma.contributionPlan.findFirst({
      where,
      orderBy: [{ isActive: "desc" }, { startsAt: "desc" }, { id: "desc" }],
    }),
    getMemberStatementSummary(input.tenantId, member.id, prisma),
    input.summaryOnly
      ? []
      : prisma.contribution.findMany({
          where,
          orderBy: [{ postedAt: "desc" }, { id: "desc" }],
          take: 4,
        }),
  ])

  return buildMobileMemberCommitments({
    activePlan: activePlan
      ? {
          amount: Number(activePlan.amount ?? 0),
          id: activePlan.id,
          interval: activePlan.interval,
          isActive: activePlan.isActive,
          name: activePlan.name,
          startsAt: activePlan.startsAt,
        }
      : null,
    contributions: contributions.map((contribution) => ({
      amount: Number(contribution.amount ?? 0),
      channel: contribution.channel,
      extraSavingsAmount: Number(contribution.extraSavingsAmount ?? 0),
      id: contribution.id,
      periodLabel: contribution.periodLabel,
      postedAt: contribution.postedAt,
      reference: contribution.reference,
      status: contribution.status,
    })),
    summary,
  })
}
