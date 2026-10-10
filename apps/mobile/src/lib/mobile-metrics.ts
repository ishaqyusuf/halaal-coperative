import { type MobileOverviewMetric } from "@/lib/mobile-display-types"

const UUID_PATTERN =
  /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

export function formatMobileRecordDetail(detail: string) {
  return detail.replace(UUID_PATTERN, "$1…")
}

export function formatMobileActivityDetail(
  detail: string,
  status?: string | null
) {
  let includesPostedEvidence = false
  const conciseDetail = formatMobileRecordDetail(detail)
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(
      (part) =>
        !/^Ref\s+/i.test(part) &&
        !/^\d+\s+ledger (?:entry|entries)$/i.test(part)
    )
    .map((part) => {
      if (/^Posted\s+/i.test(part)) {
        includesPostedEvidence = true
        return part.replace(/^Posted\s+/i, "")
      }

      if (/^Special savings\s+[\d,.]+$/i.test(part)) {
        return "Includes special savings"
      }

      return part
    })
    .filter(Boolean)
    .join(" · ")

  if (!status) return conciseDetail

  const statusLabel = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  if (includesPostedEvidence && statusLabel.toLowerCase() === "posted") {
    return conciseDetail
  }

  return conciseDetail ? `${conciseDetail} · ${statusLabel}` : statusLabel
}

export function formatMobileStatementDetail(detail: string) {
  return formatMobileRecordDetail(detail)
    .replace(/^Backfill\s+-\s+Effective\s+/i, "Established ")
    .replace(
      /^(\d+)\s+requested unit\(s\)\s+-\s+Requested\s+/i,
      "$1 units · "
    )
    .replace(/\s+-\s+Ref\s+.*?(?=\s+-\s+|$)/i, "")
    .replace(/\s+-\s+\d+\s+ledger (?:entry|entries)$/i, "")
    .replace(/^Posted\s+/i, "")
    .replace(/\s+-\s+(?:Posted|Requested|Effective|Assessed)\s+/gi, " · ")
    .replace(/\s+-\s+Deduct From Savings$/i, "")
    .replace(/\s+-\s+/g, " · ")
}

export function formatMobileMetricValue(
  metric: MobileOverviewMetric,
  currencyCode: string
) {
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      notation: "compact",
      style: "currency",
    }).format(metric.value)
  }

  if (metric.format === "percent") {
    return new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 0,
      style: "percent",
    }).format(metric.value)
  }

  return new Intl.NumberFormat("en-NG").format(metric.value)
}
