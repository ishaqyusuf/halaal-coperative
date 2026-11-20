import {
  createDbRuntime,
  getCollectionSourceContributionBatch,
  getContributionFilterMetadata,
  getTenantOperationProfile,
  listActiveContributionPlans,
  listActiveDeductionSources,
  listLoanOptions,
  listMembersWithPaymentOrder,
  listRecentCollectionSourceBatchLinks,
} from "@halaalvest/db"
import type { CollectionSourceBatchView } from "@halaalvest/db"
import type { PageFilterData } from "@halaalvest/utils"
import type { ContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"
import { getInitialTableSettings } from "@/utils/columns"
import type { TableSettings } from "@/utils/table-settings"

type ContributionMemberRow = {
  fullName: string
  id: string
  memberNumber: string
  paymentAllocationPreference: "loan_first" | "manual_split" | "savings_first"
}

type ContributionPlanRow = {
  amount: number
  id: string
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
      quickFillEnabled: boolean
      state: "unavailable"
    }
  | {
      activeView: NonNullable<ContributionsFilterParams["view"]>
      canRecordContributions: boolean
      canUseCollectionSourceBatches: boolean
      /** Active plans, on the Commitments tab only; `items` may stop short. */
      commitmentPlans: {
        items: ContributionPlanRow[]
        total: number
      }
      collectionSourceBatchOptions: CollectionSourceBatchOption[]
      collectionSourceBatches: Awaited<
        ReturnType<typeof listRecentCollectionSourceBatchLinks>
      >
      contributionTableSettings?: TableSettings
      filterList?: PageFilterData[]
      loans: ContributionLoanRow[]
      members: {
        items: ContributionMemberRow[]
        /** Members with a set payment order; `items` may stop short. */
        total: number
      }
      quickFillEnabled: boolean
      selectedCollectionSourceBatch: CollectionSourceBatchView | null
      state: "ready"
    }

export async function loadContributionsPageData(
  filters: ContributionsFilterParams,
  input?: {
    selectedBatchId?: string
    stageBatch?: boolean
  }
): Promise<ContributionsPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canRecordContributions = hasAnyRole(
    context.auth.membership?.role,
    allStaffRoles
  )
  const quickFillEnabled = canShowQuickFill(context)

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      canRecordContributions,
      canUseCollectionSourceBatches: false,
      quickFillEnabled,
      state: "unavailable" as const,
    }
  }

  const requestedView = filters.view ?? "ledger"
  const [operationProfile, requestedLedgerFilters] = await Promise.all([
    getTenantOperationProfile(context.tenant.id),
    requestedView === "ledger"
      ? getContributionFilterMetadata(context.tenant.id)
      : undefined,
  ])
  const canUseCollectionSourceBatches =
    canRecordContributions &&
    operationProfile.services.collection_source_batch_posting.canStaffCreate
  const activeView =
    requestedView === "collections" && !canUseCollectionSourceBatches
      ? "ledger"
      : requestedView

  const [
    members,
    commitmentPlans,
    loans,
    collectionSourceOptions,
    collectionSourceBatches,
    selectedCollectionSourceBatch,
    filterList,
    contributionTableSettings,
  ] = await Promise.all([
    // Only the Commitments tab lists members: those whose payment order is
    // not the default (bounded, with a total). Anyone else is found by
    // search, like the forms (MemberCombobox).
    activeView === "commitments"
      ? listMembersWithPaymentOrder(context.tenant.id)
      : Promise.resolve({ items: [], total: 0 }),
    // Active plans are listed on the Commitments tab (capped, with a total).
    // The payment form loads the chosen member's plans on its own.
    activeView === "commitments"
      ? listActiveContributionPlans(context.tenant.id)
      : Promise.resolve({ items: [], total: 0 }),
    listLoanOptions(context.tenant.id),
    canUseCollectionSourceBatches &&
    (activeView === "collections" || input?.stageBatch)
      ? listActiveDeductionSources(context.tenant.id)
      : Promise.resolve([]),
    activeView === "collections"
      ? listRecentCollectionSourceBatchLinks(context.tenant.id)
      : Promise.resolve([]),
    canUseCollectionSourceBatches && input?.selectedBatchId
      ? getCollectionSourceContributionBatch(
          context.tenant.id,
          input.selectedBatchId
        )
      : Promise.resolve(null),
    activeView === "ledger"
      ? (requestedLedgerFilters ??
        getContributionFilterMetadata(context.tenant.id))
      : undefined,
    activeView === "ledger"
      ? getInitialTableSettings("contributions")
      : undefined,
  ])

  return {
    activeView,
    canRecordContributions,
    canUseCollectionSourceBatches,
    commitmentPlans: {
      items: commitmentPlans.items.map((plan) => ({
        amount: Number(plan.amount),
        id: plan.id,
        member: { fullName: plan.member.fullName },
        name: plan.name,
        startsAt: plan.startsAt,
      })),
      total: commitmentPlans.total,
    },
    collectionSourceBatchOptions: collectionSourceOptions.map((source) => ({
      externalReference: source.externalReference,
      id: source.id,
      label: source.name,
      type: source.type,
    })),
    collectionSourceBatches,
    contributionTableSettings,
    filterList,
    loans: loans.map((loan) => ({
      id: loan.id,
      loanProduct: { name: loan.loanProduct.name },
      member: { fullName: loan.member.fullName },
      status: loan.status,
    })),
    members: {
      items: members.items.map((member) => ({
        fullName: member.fullName,
        id: member.id,
        memberNumber: member.memberNumber,
        paymentAllocationPreference: member.paymentAllocationPreference,
      })),
      total: members.total,
    },
    quickFillEnabled,
    selectedCollectionSourceBatch,
    state: "ready" as const,
  }
}
