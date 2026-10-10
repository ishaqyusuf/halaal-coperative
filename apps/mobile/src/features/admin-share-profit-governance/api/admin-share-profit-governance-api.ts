import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  ProfitPeriodDetail,
  ShareApplicationDetail,
  ShareProfitBook,
  ShareProfitCommandResult,
  ShareProfitWorkspace,
} from "../model/admin-share-profit-governance-types"

export function getShareProfitWorkspace(input: {
  book: ShareProfitBook
  cursor?: string
  search?: string
}) {
  return readCachedMobileQuery(
    `admin.share-profit-governance.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.shareProfitGovernance.workspace.query(
        input
      )
  ) as Promise<ShareProfitWorkspace>
}

export function getShareApplicationDetail(memberShareApplicationId: string) {
  return createMobileTrpcClient().mobile.admin.shareProfitGovernance.shareDetail.query(
    { memberShareApplicationId }
  ) as Promise<ShareApplicationDetail>
}

export function getProfitPeriodDetail(dividendPeriodId: string) {
  return createMobileTrpcClient().mobile.admin.shareProfitGovernance.profitDetail.query(
    { dividendPeriodId }
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
