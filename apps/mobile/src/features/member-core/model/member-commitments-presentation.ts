import type { MobileMemberSection } from "./member-core-types"

type CommitmentMetric = MobileMemberSection["stats"][number]

export type MemberCommitmentsPresentation = {
  activePlan: {
    detail: string | null
    label: string
    status: string | null
    value: string | null
  }
  contributionSummary: string | null
  postedSavings: {
    label: string
    value: string
  }
  specialSavings: {
    detail: string | null
    label: string
    value: string
  }
}

function findMetric(
  section: MobileMemberSection,
  key: string,
  label: string
) {
  return (
    section.stats.find((metric) => metric.key === key) ??
    section.stats.find(
      (metric) => metric.label.trim().toLowerCase() === label.toLowerCase()
    )
  )
}

function metricValue(metric: CommitmentMetric | undefined) {
  return Number.isFinite(metric?.value) ? Math.max(metric?.value ?? 0, 0) : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-NG").format(value)
}

function formatPlanDetail(value: string) {
  return value.replace(/^Active since\s+/i, "Started ")
}

export function buildMemberCommitmentsPresentation(
  section: MobileMemberSection,
  currencyCode: string
): MemberCommitmentsPresentation {
  const activeCommitment = findMetric(
    section,
    "active-commitment",
    "Active commitment"
  )
  const postedSavings = findMetric(section, "savings", "Savings")
  const specialSavings = findMetric(
    section,
    "special-savings",
    "Special savings"
  )
  const contributionCount = findMetric(
    section,
    "contributions",
    "Contributions"
  )
  const activeCommitmentValue = metricValue(activeCommitment)
  const contributionCountValue = metricValue(contributionCount)
  const hasActivePlan = activeCommitmentValue > 0

  return {
    activePlan: {
      detail:
        hasActivePlan && activeCommitment?.detail
          ? formatPlanDetail(activeCommitment.detail)
          : null,
      label: hasActivePlan ? "Monthly commitment" : "No active plan",
      status: hasActivePlan ? "Active" : null,
      value: hasActivePlan
        ? formatCurrency(activeCommitmentValue, currencyCode)
        : null,
    },
    contributionSummary:
      contributionCountValue > 0
        ? `${formatCount(contributionCountValue)} posted ${
            contributionCountValue === 1 ? "contribution" : "contributions"
          }`
        : null,
    postedSavings: {
      label: "Posted savings",
      value: formatCurrency(metricValue(postedSavings), currencyCode),
    },
    specialSavings: {
      detail: metricValue(specialSavings) > 0 ? "Voluntary savings" : null,
      label: "Special savings",
      value: formatCurrency(metricValue(specialSavings), currencyCode),
    },
  }
}
