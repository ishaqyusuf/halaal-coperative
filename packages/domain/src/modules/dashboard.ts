import { defaultTenantPolicy, type TenantPolicySummary } from "./policies"

export interface DashboardTenantSnapshot {
  id: string
  slug: string
  name: string
  region: string | null
  currencyCode: string
  timezone: string
  status: "pending" | "active" | "suspended" | "archived"
  memberCount: number
  isCaseStudy?: boolean
}

export interface DashboardSnapshot {
  tenantName: string
  memberCount: number
  activeLoans: number
  availablePool: number
  reserveBuffer: number
  monthlyContributionTarget: number
  collectionCoverage: number
  delinquencyRate: number
}

export function buildDashboardSnapshot(input: {
  tenant: DashboardTenantSnapshot
  policy?: Partial<TenantPolicySummary>
  metrics?: Partial<Omit<DashboardSnapshot, "tenantName" | "memberCount" | "reserveBuffer">>
}): DashboardSnapshot {
  const policy = {
    ...defaultTenantPolicy,
    ...input.policy,
  }

  return {
    tenantName: input.tenant.name,
    memberCount: input.tenant.memberCount,
    activeLoans: input.metrics?.activeLoans ?? Math.max(12, Math.round(input.tenant.memberCount * 0.14)),
    availablePool: input.metrics?.availablePool ?? Math.max(1_200_000, input.tenant.memberCount * 8_600),
    reserveBuffer: policy.reserveBuffer,
    monthlyContributionTarget:
      input.metrics?.monthlyContributionTarget ?? Math.max(320_000, input.tenant.memberCount * 3_000),
    collectionCoverage: input.metrics?.collectionCoverage ?? 0.94,
    delinquencyRate: input.metrics?.delinquencyRate ?? 0.06,
  }
}

export const sampleDashboardSnapshot = buildDashboardSnapshot({
  tenant: {
    id: "tenant-amanah-demo",
    slug: "amanah",
    name: "Amanah Staff Thrift Cooperative",
    region: "Lagos",
    currencyCode: "NGN",
    timezone: "Africa/Lagos",
    status: "active",
    memberCount: 428,
    isCaseStudy: true,
  },
})
