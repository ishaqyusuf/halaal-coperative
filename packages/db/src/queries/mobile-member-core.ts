import { createPrismaClient } from "../prisma"
import {
  getMemberByUserId,
  getMemberStatementDetail,
  getMemberStatementSummary,
  type MemberStatementSummary,
} from "./members"
import { getTenantOperationProfile } from "./operation-profile"
import { listMemberPaymentReceipts } from "./payment-receipts"
import { listProcurementRequests } from "./procurement"
import { listFoodPurchaseApplications } from "./food-purchase"
import { listSupportCases } from "./support"
import { getMemberShareBalancesAtDate } from "./tenant-finance"

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
    totalExtraSavingsContributions: number
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
          (summary?.totalExtraSavingsContributions ?? 0) > 0
            ? "Voluntary savings posted"
            : "No special savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: summary?.totalExtraSavingsContributions ?? 0,
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
      label: "Receipts",
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
}): MobileMemberCoreHome {
  const services = getServices(input)

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
      detail: `${summary?.activeLoanCount ?? 0} active financing record(s).`,
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
        detail:
          (summary?.contributionsCount ?? 0) > 0
            ? `${summary?.contributionsCount ?? 0} posted contribution entries`
            : "No posted contribution entries",
        format: "currency",
        key: "savings",
        label: "Savings total",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail:
          (summary?.totalExtraSavingsContributions ?? 0) > 0
            ? "Voluntary savings posted"
            : "No special savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: summary?.totalExtraSavingsContributions ?? 0,
      },
      {
        detail:
          (summary?.activeLoanCount ?? 0) > 0
            ? `${summary?.activeLoanCount ?? 0} active financing record(s)`
            : "No active financing",
        format: "currency",
        key: "financing",
        label: "Financing exposure",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
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

export async function getMobileMemberCoreHome(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberCoreHome> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return buildMobileMemberCoreHome({
      foodPurchaseRecords: 0,
      member: null,
      operationProfile: null,
      procurementRecords: 0,
      receiptRecords: 0,
      shareCapital: 0,
      summary: null,
      supportRecords: 0,
    })
  }

  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    return buildMobileMemberCoreHome({
      foodPurchaseRecords: 0,
      member: null,
      operationProfile: null,
      procurementRecords: 0,
      receiptRecords: 0,
      shareCapital: 0,
      summary: null,
      supportRecords: 0,
    })
  }

  const [
    summary,
    operationProfile,
    receipts,
    procurementRequests,
    foodPurchaseApplications,
    supportCases,
    shareBalances,
  ] = await Promise.all([
    getMemberStatementSummary(input.tenantId, member.id, prisma),
    getTenantOperationProfile(input.tenantId, prisma),
    listMemberPaymentReceipts(
      input.tenantId,
      { limit: 1, memberId: member.id },
      prisma
    ),
    listProcurementRequests(
      { limit: 1, memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    listFoodPurchaseApplications(
      { limit: 1, memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    listSupportCases(
      { limit: 1, memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    getMemberShareBalancesAtDate(input.tenantId, new Date(), prisma),
  ])
  const shareCapital =
    shareBalances.find((balance) => balance.memberId === member.id)
      ?.shareBalance ?? 0

  return buildMobileMemberCoreHome({
    foodPurchaseRecords: foodPurchaseApplications.length,
    member,
    operationProfile,
    procurementRecords: procurementRequests.length,
    receiptRecords: receipts.length,
    shareCapital,
    summary,
    supportRecords: supportCases.length,
  })
}

export async function getMobileMemberCommitments(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileMemberCommitments> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) return emptyMobileMemberCommitments()

  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptyMobileMemberCommitments()

  const detail = await getMemberStatementDetail(
    input.tenantId,
    member.id,
    prisma
  )
  if (!detail) {
    return emptyMobileMemberCommitments(
      "No statement detail was found for this member profile."
    )
  }

  const activePlan =
    detail.member.contributionPlans.find((plan) => plan.isActive) ??
    detail.member.contributionPlans[0] ??
    null

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
    contributions: detail.contributions.map((contribution) => ({
      amount: Number(contribution.amount ?? 0),
      channel: contribution.channel,
      extraSavingsAmount: Number(contribution.extraSavingsAmount ?? 0),
      id: contribution.id,
      periodLabel: contribution.periodLabel,
      postedAt: contribution.postedAt,
      reference: contribution.reference,
      status: contribution.status,
    })),
    summary: detail.summary
      ? {
          contributionsCount: detail.summary.contributionsCount,
          totalExtraSavingsContributions:
            detail.summary.totalExtraSavingsContributions,
          totalSavingsSnapshot: detail.summary.totalSavingsSnapshot,
        }
      : null,
  })
}
