import {
  createDbRuntime,
  listContributionPlans,
  listContributions,
  listCurrentMonthStagedContributions,
  listLoans,
  listMembers,
} from "@halaalvest/db"
import type { StagedMonthlyContributionRow } from "@halaalvest/db"
import type { ContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
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

type CurrentMonthFilter = {
  from: string
  isActive: boolean
  label: string
  to: string
}

export type ContributionsPageData =
  | {
      canRecordContributions: boolean
      filters: ContributionsFilterParams
      quickFillEnabled: boolean
      state: "unavailable"
    }
  | {
      canRecordContributions: boolean
      commitmentPlans: ContributionPlanRow[]
      contributions: ContributionListResult
      currentMonthFilter: CurrentMonthFilter
      filters: ContributionsFilterParams
      loans: ContributionLoanRow[]
      members: {
        items: ContributionMemberRow[]
      }
      quickFillEnabled: boolean
      stagedContributions: StagedMonthlyContributionRow[]
      state: "ready"
    }

function getCurrentMonthFilter(now = new Date()): CurrentMonthFilter {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const from = start.toISOString().slice(0, 10)
  const to = end.toISOString().slice(0, 10)

  return {
    from,
    isActive: false,
    label: new Intl.DateTimeFormat("en", {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(start),
    to,
  }
}

function isCurrentMonthDateFilter(
  filters: ContributionsFilterParams,
  currentMonth: Pick<CurrentMonthFilter, "from" | "to">,
) {
  return filters.from === currentMonth.from && filters.to === currentMonth.to
}

export async function loadContributionsPageData(
  filters: ContributionsFilterParams,
): Promise<ContributionsPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canRecordContributions = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const quickFillEnabled = canShowQuickFill(context)
  const currentMonthFilter = getCurrentMonthFilter()
  currentMonthFilter.isActive = isCurrentMonthDateFilter(filters, currentMonthFilter)

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      canRecordContributions,
      filters,
      quickFillEnabled,
      state: "unavailable" as const,
    }
  }

  const [contributions, members, commitmentPlans, loans, stagedContributions] = await Promise.all([
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
    currentMonthFilter.isActive
      ? listCurrentMonthStagedContributions(context.tenant.id)
      : Promise.resolve([]),
  ])

  return {
    canRecordContributions,
    commitmentPlans: commitmentPlans as ContributionPlanRow[],
    contributions: contributions as ContributionListResult,
    currentMonthFilter,
    filters,
    loans: loans as ContributionLoanRow[],
    members: members as { items: ContributionMemberRow[] },
    quickFillEnabled,
    stagedContributions,
    state: "ready" as const,
  }
}
