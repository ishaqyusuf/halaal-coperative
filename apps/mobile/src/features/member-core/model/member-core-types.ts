import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileMetricFormat = "currency" | "percent" | "count"

export type MobileOverviewMetric = {
  detail: string
  format: MobileMetricFormat
  key: string
  label: string
  value: number
}

export type MobileMemberActivityKind = "commitments" | "shares" | "statement"

export type MobileMemberActivityPage = {
  cache?: MobileReadCacheState
  generatedAt: string
  items: MobileMemberSectionRow[]
  kind: MobileMemberActivityKind
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
}

export type MemberActivityHistoryState = {
  error: string | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  onLoadMore: () => void
  rows: MobileMemberSectionRow[]
}

export type MobileMemberHome = {
  actionItems: {
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }[]
  cache?: MobileReadCacheState
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
  stats: MobileOverviewMetric[]
}

export type MobileMemberSectionKey = "commitments" | "financing" | "shares"

export type MobileMemberSectionRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberSection = {
  cache?: MobileReadCacheState
  emptyState: string
  generatedAt: string
  key: MobileMemberSectionKey
  rows: MobileMemberSectionRow[]
  stats: MobileOverviewMetric[]
  subtitle: string
  title: string
}

export type MobileMemberStatementSectionKey =
  | "profile"
  | MobileMemberSectionKey
  | "documents"
  | "receipts"
  | "charges"
  | "ledger"
  | "support"

export type MobileMemberStatementSection = {
  emptyState: string
  key: MobileMemberStatementSectionKey
  rows: MobileMemberSectionRow[]
  subtitle: string
  title: string
}

export type MobileMemberStatement = {
  cache?: MobileReadCacheState
  generatedAt: string
  member: {
    deductionSourceName: string | null
    email: string | null
    exitedAt: string | null
    id: string
    joinedAt: string
    kycStatus: string
    memberNumber: string
    memberType: string
    name: string
    status: string
  } | null
  sections: MobileMemberStatementSection[]
  stats: MobileOverviewMetric[]
}

export type MemberStatementExportPayload = {
  content: string
  expiresAt: string
  filename: string
  generatedAt: string
  id: string
  mimeType: "text/csv"
  rowCount: number
}
