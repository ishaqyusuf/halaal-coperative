import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"

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

export type MobileMemberSectionKey = "commitments" | "financing" | "shares"

export type MobileSupportCategory =
  | "payment_issue"
  | "account_update"
  | "shares"
  | "financing"
  | "procurement"
  | "feature_request"
  | "technical"
  | "other"

export type MobileMemberSectionRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberSection = {
  emptyState: string
  generatedAt: string
  key: MobileMemberSectionKey
  rows: MobileMemberSectionRow[]
  stats: MobileOverviewMetric[]
  subtitle: string
  title: string
}

export type MobileMemberMoreRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberMoreSection = {
  icon: string
  key: "profile" | "statement" | "receipts" | "support"
  rows: MobileMemberMoreRow[]
  title: string
}

export type MobileMemberMore = {
  generatedAt: string
  member: {
    id: string
    kycStatus: string
    memberNumber: string
    name: string
    status: string
  } | null
  sections: MobileMemberMoreSection[]
}

export type MobileSupportCase = {
  category: MobileSupportCategory
  detail: string
  financialAdjustmentApprovalStatus: string
  id: string
  lastActivityAt: string
  messageCount: number
  priority: string
  requiresFinancialAdjustment: boolean
  status: string
  subject: string
}

export type MobileMemberSupport = {
  cases: MobileSupportCase[]
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  summary: {
    highPriorityOpenCases: number
    openCases: number
    totalCases: number
  }
}

export type MobileSupportCreateInput = {
  category: MobileSupportCategory
  description: string
  moneyImpactRequested?: boolean
  subject: string
}

export async function getMobileMemberHome() {
  const client = createMobileTrpcClient()

  return client.mobile.member.home.query() as Promise<MobileMemberHome>
}

export async function getMobileMemberMore() {
  const client = createMobileTrpcClient()

  return client.mobile.member.more.query() as Promise<MobileMemberMore>
}

export async function getMobileMemberSupport() {
  const client = createMobileTrpcClient()

  return client.mobile.member.support.list.query() as Promise<MobileMemberSupport>
}

export async function createMobileMemberSupportCase(
  input: MobileSupportCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.support.create.mutate(
    input
  ) as Promise<MobileSupportCase>
}

export async function getMobileMemberSection(section: MobileMemberSectionKey) {
  const client = createMobileTrpcClient()

  return client.mobile.member.section.query({
    section,
  }) as Promise<MobileMemberSection>
}

export async function getMobileAdminOverview() {
  const client = createMobileTrpcClient()

  return client.mobile.admin.overview.query() as Promise<MobileAdminOverview>
}
