import type { MobileMemberSection } from "@/features/member-core/public/member-core-types"

type SectionMetric = MobileMemberSection["stats"][number]
type SectionRow = MobileMemberSection["rows"][number]

export type MemberFinancingPresentation = {
  activeRows: SectionRow[]
  monthlyServicing: {
    detail: string | null
    value: string
  } | null
  outstanding: {
    detail: string | null
    summaryDetail: string | null
    value: string
  } | null
}

function findMetric(
  section: MobileMemberSection,
  key: string,
  fallbackLabel: string
) {
  return (
    section.stats.find((metric) => metric.key === key) ??
    section.stats.find(
      (metric) =>
        metric.label.trim().toLowerCase() === fallbackLabel.toLowerCase()
    )
  )
}

function numericValue(item: SectionMetric | SectionRow | undefined) {
  return Number.isFinite(item?.value) ? Math.max(item?.value ?? 0, 0) : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function compactDetail(value: string | undefined) {
  if (!value) return null

  return value.split("·").at(-1)?.trim() || value
}

export function buildMemberFinancingPresentation(
  section: MobileMemberSection,
  currencyCode: string
): MemberFinancingPresentation {
  const outstanding = findMetric(
    section,
    "outstanding-principal",
    "Outstanding"
  )
  const monthlyServicing = findMetric(
    section,
    "monthly-servicing",
    "Monthly servicing"
  )

  return {
    activeRows: section.rows,
    monthlyServicing:
      numericValue(monthlyServicing) > 0
        ? {
            detail: monthlyServicing?.detail ?? null,
            value: formatCurrency(numericValue(monthlyServicing), currencyCode),
          }
        : null,
    outstanding:
      numericValue(outstanding) > 0
        ? {
            detail: outstanding?.detail ?? null,
            summaryDetail: compactDetail(outstanding?.detail),
            value: formatCurrency(numericValue(outstanding), currencyCode),
          }
        : null,
  }
}
