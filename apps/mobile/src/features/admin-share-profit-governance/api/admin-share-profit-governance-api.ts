import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
import type {
  ProfitPeriodDetail,
  ShareApplicationDetail,
  ShareProfitBook,
  ShareProfitCommandResult,
  ShareProfitSummary,
  ShareProfitWorkspace,
} from "../model/admin-share-profit-governance-types"

/** Both books' stats, policy and currency: once per visit and after writes. */
export function getShareProfitSummary() {
  return readCachedMobileQuery("admin.share-profit-governance.summary", () =>
    createMobileTrpcClient().mobile.admin.shareProfitGovernance.summary.query()
  ) as Promise<ShareProfitSummary>
}

/** One cursor page of a book, without the stats (read in the summary). */
export function getShareProfitWorkspace(input: {
  book: ShareProfitBook
  cursor?: string
  search?: string
}) {
  const request = { ...input, includeSummary: false }
  return readCachedMobileQuery(
    `admin.share-profit-governance.${JSON.stringify(request)}`,
    () =>
      createMobileTrpcClient().mobile.admin.shareProfitGovernance.workspace.query(
        request
      ),
    { persist: isPersistableReadInput(input) }
  ) as Promise<ShareProfitWorkspace>
}

export function getShareApplicationDetail(memberShareApplicationId: string) {
  return readCachedMobileQuery(
    `admin.share-profit-governance.share.${memberShareApplicationId}`,
    () =>
      createMobileTrpcClient().mobile.admin.shareProfitGovernance.shareDetail.query(
        { memberShareApplicationId }
      )
  ) as Promise<ShareApplicationDetail>
}

export function getProfitPeriodDetail(dividendPeriodId: string) {
  return readCachedMobileQuery(
    `admin.share-profit-governance.period.${dividendPeriodId}`,
    () =>
      createMobileTrpcClient().mobile.admin.shareProfitGovernance.profitDetail.query(
        { dividendPeriodId }
      )
  ) as Promise<ProfitPeriodDetail>
}

export function reviewShareApplication(input: {
  approvedUnits?: number
  commandId: string
  decision: "approved" | "rejected"
  expectedState: "pending"
  memberShareApplicationId: string
  reviewNotes: string
}) {
  return createMobileTrpcClient().mobile.admin.shareProfitGovernance.reviewShare.mutate(
    input
  ) as Promise<ShareProfitCommandResult>
}

export function approveProfitEntry(input: {
  commandId: string
  expectedState: "reviewed"
  notes: string
  profitEntryId: string
}) {
  return createMobileTrpcClient().mobile.admin.shareProfitGovernance.approveProfit.mutate(
    input
  ) as Promise<ShareProfitCommandResult>
}

export function publishProfitEntry(input: {
  commandId: string
  expectedState: "approved"
  profitEntryId: string
}) {
  return createMobileTrpcClient().mobile.admin.shareProfitGovernance.publishProfit.mutate(
    input
  ) as Promise<ShareProfitCommandResult>
}
