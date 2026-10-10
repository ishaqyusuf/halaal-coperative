import {
  isMobileDevFixtureSession,
  isMobileQaClientBuild,
} from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import {
  getDevChargeApplication,
  getDevChargeFormOptions,
  getDevChargeWorkspace,
  runDevChargeCommand,
} from "./admin-charge-dev-fixtures"
import type {
  ChargeApplicationDetail,
  ChargeCommandBase,
  ChargeCommandResult,
  ChargeFilters,
  ChargeFormOptions,
  ChargeLane,
  ChargeWorkspace,
} from "../model/admin-charge-operations-types"
import { throwCommittedChargeResponseLoss } from "../model/admin-charge-response-loss"

export async function getChargeWorkspace(input: {
  cursor?: string | null
  filters?: ChargeFilters
  lane: ChargeLane
  search?: string
}) {
  if (isMobileDevFixtureSession())
    return getDevChargeWorkspace(input.lane, input.search, input.filters)
  return readCachedMobileQuery(`admin.charges.${JSON.stringify(input)}`, () =>
    createMobileTrpcClient().mobile.admin.charges.workspace.query(input)
  ) as Promise<ChargeWorkspace>
}

export async function getChargeApplication(applicationId: string) {
  if (isMobileDevFixtureSession()) return getDevChargeApplication(applicationId)
  return readCachedMobileQuery(`admin.charges.detail.${applicationId}`, () =>
    createMobileTrpcClient().mobile.admin.charges.detail.query({
      applicationId,
    })
  ) as Promise<ChargeApplicationDetail>
}

export async function getChargeFormOptions(search?: string) {
  if (isMobileDevFixtureSession()) return getDevChargeFormOptions(search)
  return readCachedMobileQuery(`admin.charges.options.${search ?? ""}`, () =>
    createMobileTrpcClient().mobile.admin.charges.formOptions.query({ search })
  ) as Promise<ChargeFormOptions>
}

export async function applyChargeApplication(
  input: ChargeCommandBase & {
    assessedAt: string
    basisAmount?: number | null
    chargeDefinitionId: string
    expectedAmount: number
    memberId: string
    notes?: string | null
  },
  qa?: { simulateResponseLossAfterCommit?: boolean }
) {
  if (isMobileDevFixtureSession())
    return runDevChargeCommand(input.commandId, input.memberId, "posted")
  const result =
    (await createMobileTrpcClient().mobile.admin.charges.applyCharge.mutate(
      input
    )) as ChargeCommandResult
  throwCommittedChargeResponseLoss({
    enabled: qa?.simulateResponseLossAfterCommit === true,
    qaClientEnabled: isMobileQaClientBuild,
  })
  return result
}

export async function settleChargeApplication(
  input: ChargeCommandBase & {
    applicationId: string
    notes?: string | null
    paidAt: string
    reference: string
  }
) {
  if (isMobileDevFixtureSession())
    return runDevChargeCommand(input.commandId, input.applicationId, "posted")
  return createMobileTrpcClient().mobile.admin.charges.settle.mutate(
    input
  ) as Promise<ChargeCommandResult>
}

export async function waiveChargeApplication(
  input: ChargeCommandBase & { applicationId: string; reason: string }
) {
  if (isMobileDevFixtureSession())
    return runDevChargeCommand(input.commandId, input.applicationId, "waived")
  return createMobileTrpcClient().mobile.admin.charges.waive.mutate(
    input
  ) as Promise<ChargeCommandResult>
}

export async function reverseChargeApplication(
  input: ChargeCommandBase & { applicationId: string; reason: string }
) {
  if (isMobileDevFixtureSession())
    return runDevChargeCommand(input.commandId, input.applicationId, "reversed")
  return createMobileTrpcClient().mobile.admin.charges.reverse.mutate(
    input
  ) as Promise<ChargeCommandResult>
}
