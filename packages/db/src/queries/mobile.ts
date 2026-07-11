import { createPrismaClient } from "../prisma"
import { getOverviewSummary } from "./dashboard"
import { getMemberByUserId, listMemberStatementSummaries } from "./members"

export type MobileMetricFormat = "currency" | "percent" | "count"

export type MobileOverviewMetric = {
  detail: string
  format: MobileMetricFormat
  key: string
  label: string
  value: number
}

export type MobileMemberHome = {
  actionItems: Array<{
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }>
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
  stats: MobileOverviewMetric[]
}

export type MobileAdminOverview = {
  actionQueue: Array<{
    count: number
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }>
  generatedAt: string
  stats: MobileOverviewMetric[]
  warnings: Array<{
    key: string
    label: string
  }>
}

function emptyMemberHome(): MobileMemberHome {
  return {
    actionItems: [
      {
        detail: "No linked member profile was found for this mobile session.",
        key: "member-profile",
        label: "Member profile needs linking",
        severity: "warning",
      },
    ],
    generatedAt: new Date().toISOString(),
    member: null,
    readiness: {
      detail: "Your cooperative profile is not linked to this account yet.",
      percentage: 0,
      status: "missing_profile",
    },
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

function getReadiness(input: {
  kycStatus: string
  memberStatus: string
}): MobileMemberHome["readiness"] {
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

function formatDateLabel(value: Date | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

export async function getMobileMemberHome(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberHome> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberHome()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberHome()
  }

  const summaries = await listMemberStatementSummaries(input.tenantId, prisma)
  const summary = summaries.find((item) => item.memberId === member.id) ?? null
  const readiness = getReadiness({
    kycStatus: member.kycStatus,
    memberStatus: member.status,
  })
  const actionItems: MobileMemberHome["actionItems"] = []

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
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      kycStatus: member.kycStatus,
      memberNumber: member.memberNumber,
      name: member.fullName,
      status: member.status,
    },
    readiness,
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
        label: "Savings",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail:
          (summary?.activeLoanCount ?? 0) > 0
            ? `${summary?.activeLoanCount ?? 0} active financing record(s)`
            : "No active financing",
        format: "currency",
        key: "financing",
        label: "Financing",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
    ],
  }
}

export async function getMobileAdminOverview(
  tenantId: string
): Promise<MobileAdminOverview> {
  const summary = await getOverviewSummary(tenantId)
  const topQueue = summary.actionQueue
    .filter((item) => item.count > 0)
    .slice(0, 5)

  return {
    actionQueue: topQueue.map((item) => ({
      count: item.count,
      detail: item.severity === "critical" ? "Needs urgent review" : "Open",
      key: item.key,
      label: item.label,
      severity: item.severity,
    })),
    generatedAt: summary.workspace.generatedAt,
    stats: [
      {
        detail: "After reserve and pending commitments",
        format: "currency",
        key: "deployable-funds",
        label: "Deployable funds",
        value: summary.primaryMetrics.deployableFunds,
      },
      {
        detail: summary.contributionHealth.periodLabel,
        format: "percent",
        key: "collection-coverage",
        label: "Collections",
        value: summary.primaryMetrics.collectionCoverage,
      },
      {
        detail: "Open mobile-safe action queue",
        format: "count",
        key: "action-queue",
        label: "Action queue",
        value: summary.primaryMetrics.actionQueueTotal,
      },
    ],
    warnings: summary.setupWarnings.map((item) => ({
      key: item.key,
      label: item.label,
    })),
  }
}
