import {
  createDbRuntime,
  getCollectionSourceContributionBatch,
  getTenantOperationProfile,
  listContributionPlans,
  listCollectionSourceContributionBatches,
  listContributions,
  listCurrentMonthStagedContributions,
  listActiveDeductionSources,
  listLoans,
  listMembers,
} from "@halaalvest/db"
import type {
  CollectionSourceBatchView,
  StagedMonthlyContributionRow,
} from "@halaalvest/db"
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

export type CollectionSourceBatchOption = {
  externalReference: string | null
  id: string
  label: string
  type: string
}

export type ContributionsPageData =
  | {
      canRecordContributions: boolean
      canUseCollectionSourceBatches: boolean
      filters: ContributionsFilterParams
      quickFillEnabled: boolean
      state: "unavailable"
    }
  | {
      canRecordContributions: boolean
      canUseCollectionSourceBatches: boolean
      commitmentPlans: ContributionPlanRow[]
      collectionSourceBatchOptions: CollectionSourceBatchOption[]
      collectionSourceBatches: Array<Omit<CollectionSourceBatchView, "rows">>
      contributions: ContributionListResult
      currentMonthFilter: CurrentMonthFilter
      filters: ContributionsFilterParams
      loans: ContributionLoanRow[]
      members: {
        items: ContributionMemberRow[]
      }
      quickFillEnabled: boolean
      selectedCollectionSourceBatch: CollectionSourceBatchView | null
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
  input?: {
    selectedBatchId?: string
  },
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
      canUseCollectionSourceBatches: false,
      filters,
      quickFillEnabled,
      state: "unavailable" as const,
    }
  }

  const operationProfile = await getTenantOperationProfile(context.tenant.id)
  const canUseCollectionSourceBatches =
    canRecordContributions &&
    operationProfile.services.collection_source_batch_posting.canStaffCreate

  const [
    contributions,
    members,
    commitmentPlans,
    loans,
    stagedContributions,
    collectionSourceOptions,
    collectionSourceBatches,
  ] = await Promise.all([
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
    canUseCollectionSourceBatches
      ? listActiveDeductionSources(context.tenant.id)
      : Promise.resolve([]),
    canUseCollectionSourceBatches
      ? listCollectionSourceContributionBatches(context.tenant.id)
      : Promise.resolve([]),
  ])
  const selectedBatchId =
    input?.selectedBatchId ?? collectionSourceBatches[0]?.id
  const selectedCollectionSourceBatch =
    canUseCollectionSourceBatches && selectedBatchId
      ? await getCollectionSourceContributionBatch(
          context.tenant.id,
          selectedBatchId,
        )
      : null

  return {
    canRecordContributions,
    canUseCollectionSourceBatches,
    commitmentPlans: commitmentPlans as ContributionPlanRow[],
    collectionSourceBatchOptions: collectionSourceOptions.map((source) => ({
      externalReference: source.externalReference,
      id: source.id,
      label: source.name,
      type: source.type,
    })),
    collectionSourceBatches,
    contributions: contributions as ContributionListResult,
    currentMonthFilter,
    filters,
    loans: loans as ContributionLoanRow[],
    members: members as { items: ContributionMemberRow[] },
    quickFillEnabled,
    selectedCollectionSourceBatch,
    stagedContributions,
    state: "ready" as const,
  }
}
