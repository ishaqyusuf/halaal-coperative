import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import {
  getDevContributionBatch,
  getDevContributionMember,
  getDevContributionWorkspace,
  runDevContributionCommand,
  stageDevContributionBatch,
} from "./admin-contribution-dev-fixtures"
import type {
  CollectionBatchDetail,
  ContributionCommandBase,
  ContributionCommandResult,
  ContributionLane,
  ContributionMemberWorkspace,
  ContributionWorkspace,
} from "../model/admin-contribution-operations-types"

export async function getContributionWorkspace(input: {
  cursor?: string | null
  lane: ContributionLane
  search?: string
}) {
  if (isMobileDevFixtureSession())
    return getDevContributionWorkspace(input.lane, input.search)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(
    `admin.contributions.${JSON.stringify(input)}`,
    () => client.mobile.admin.contributions.workspace.query(input)
  ) as Promise<ContributionWorkspace>
}

export async function getContributionMember(memberId: string) {
  if (isMobileDevFixtureSession()) return getDevContributionMember(memberId)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(`admin.contributions.member.${memberId}`, () =>
    client.mobile.admin.contributions.member.query({ memberId })
  ) as Promise<ContributionMemberWorkspace>
}

export async function getContributionBatch(batchId: string) {
  if (isMobileDevFixtureSession()) return getDevContributionBatch(batchId)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(`admin.contributions.batch.${batchId}`, () =>
    client.mobile.admin.contributions.batch.query({ batchId })
  ) as Promise<CollectionBatchDetail>
}

export async function setContributionPlan(
  input: ContributionCommandBase & {
    amount: number
    memberId: string
    name?: string
    startsAt: string
  }
) {
  if (isMobileDevFixtureSession())
    return runDevContributionCommand({
      commandId: input.commandId,
      entityId: input.memberId,
      state: "active",
    })
  return createMobileTrpcClient().mobile.admin.contributions.setPlan.mutate(
    input
  ) as Promise<ContributionCommandResult>
}

export async function closeContributionPlan(
  input: ContributionCommandBase & { endsAt: string; planId: string }
) {
  if (isMobileDevFixtureSession())
    return runDevContributionCommand({
      commandId: input.commandId,
      entityId: input.planId,
      state: "closed",
    })
  return createMobileTrpcClient().mobile.admin.contributions.closePlan.mutate(
    input
  ) as Promise<ContributionCommandResult>
}

export async function updateAllocationPreference(
  input: ContributionCommandBase & {
    memberId: string
    preference: "manual_split" | "savings_first" | "loan_first"
  }
) {
  if (isMobileDevFixtureSession())
    return runDevContributionCommand({
      commandId: input.commandId,
      entityId: input.memberId,
      state: input.preference,
    })
  return createMobileTrpcClient().mobile.admin.contributions.updateAllocationPreference.mutate(
    input
  ) as Promise<ContributionCommandResult>
}

export async function recordContributionPayment(
  input: ContributionCommandBase & {
    channel: "payroll" | "transfer" | "cash" | "manual"
    committedSavingsAmount: number
    contributionPlanId?: string
    extraLoanPaymentAmount?: number
    extraSavingsAmount?: number
    loanId?: string
    memberId: string
    periodLabel?: string
    postedAt: string
    reference?: string
    scheduledLoanServicingAmount?: number
    totalAmount?: number
  }
) {
  if (isMobileDevFixtureSession())
    return runDevContributionCommand({
      commandId: input.commandId,
      entityId: input.memberId,
      state: "posted",
    })
  return createMobileTrpcClient().mobile.admin.contributions.recordPayment.mutate(
    input
  ) as Promise<ContributionCommandResult>
}

export async function stageContributionBatch(
  input: ContributionCommandBase & {
    deductionSourceId: string
    month: number
    notes?: string | null
    reference?: string | null
    year: number
  }
) {
  if (isMobileDevFixtureSession()) return stageDevContributionBatch(input)
  return createMobileTrpcClient().mobile.admin.contributions.stageBatch.mutate(
    input
  ) as Promise<ContributionCommandResult>
}

export async function updateContributionBatchRows(
  input: ContributionCommandBase & {
    batchId: string
    rows: {
      exceptionReason?: string | null
      paidAmount?: number | null
      rowId: string
      status: "collected" | "exception" | "skipped" | "staged"
    }[]
  }
) {
  if (isMobileDevFixtureSession())
    return runDevContributionCommand({
      commandId: input.commandId,
      entityId: input.batchId,
      state: "staged",
    })
  return createMobileTrpcClient().mobile.admin.contributions.updateBatchRows.mutate(
    input
  ) as Promise<ContributionCommandResult>
}

export async function postContributionBatchRows(
  input: ContributionCommandBase & {
    batchId: string
    notes?: string | null
    postedAt?: string
    reference?: string | null
    rowIds: string[]
  }
) {
  if (isMobileDevFixtureSession())
    return runDevContributionCommand({
      commandId: input.commandId,
      entityId: input.batchId,
      state: "partially_posted",
    })
  return createMobileTrpcClient().mobile.admin.contributions.postBatchRows.mutate(
    input
  ) as Promise<ContributionCommandResult>
}
