import {
  createDbRuntime,
  listContributionPlans,
  listContributions,
  listLoans,
  listMembers,
} from "@halaalvest/db"
import type { ContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

type ContributionLedgerRow = {
  amount: number | string | { toString(): string }
  committedAmount: number | string | { toString(): string } | null
  extraSavingsAmount: number | string | { toString(): string } | null
  id: string
  member?: {
    fullName?: string | null
    memberNumber?: string | null
  } | null
  postedAt: Date
}

type ContributionMemberRow = {
  fullName: string
  id: string
  memberNumber: string
  paymentAllocationPreference: "loan_first" | "manual_split" | "savings_first"
}

type ContributionPlanRow = {
  amount: number | string | { toString(): string }
  id: string
  isActive: boolean
  member: {
    fullName: string
  }
  name: string | null
  startsAt: Date
}

type ContributionLoanRow = {
  id: string
  loanProduct: {
    name: string
  }
  member: {
    fullName: string
  }
  status: string
}

type ContributionListResult = {
  items: ContributionLedgerRow[]
  total: number
}

export type ContributionsPageData =
  | {
      canRecordContributions: boolean
      filters: ContributionsFilterParams
      state: "unavailable"
    }
  | {
      canRecordContributions: boolean
      commitmentPlans: ContributionPlanRow[]
      contributions: ContributionListResult
      filters: ContributionsFilterParams
      loans: ContributionLoanRow[]
      members: {
        items: ContributionMemberRow[]
      }
      state: "ready"
    }

export async function loadContributionsPageData(
  filters: ContributionsFilterParams,
): Promise<ContributionsPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canRecordContributions = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      canRecordContributions,
      filters,
      state: "unavailable" as const,
    }
  }

  const [contributions, members, commitmentPlans, loans] = await Promise.all([
    listContributions(context.tenant.id, {
      channel:
        filters.channel === "payroll" ||
        filters.channel === "transfer" ||
        filters.channel === "cash" ||
        filters.channel === "manual"
          ? filters.channel
          : undefined,
      fromDate: filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined,
      memberId: filters.memberId ?? undefined,
      page: 1,
      pageSize: 20,
      search: filters.search ?? undefined,
      toDate: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
    }),
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listContributionPlans(context.tenant.id),
    listLoans(context.tenant.id),
  ])

  return {
    canRecordContributions,
    commitmentPlans: commitmentPlans as ContributionPlanRow[],
    contributions: contributions as ContributionListResult,
    filters,
    loans: loans as ContributionLoanRow[],
    members: members as { items: ContributionMemberRow[] },
    state: "ready" as const,
  }
}
