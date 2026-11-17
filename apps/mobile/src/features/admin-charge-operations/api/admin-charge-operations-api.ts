import {
  isMobileDevFixtureSession,
  isMobileQaClientBuild,
} from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
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
  ChargeApplicationRow,
  ChargeMemberOption,
  ChargePage,
  ChargeRuleOption,
  ChargeRuleRow,
  ChargeSummary,
  ChargeLane,
} from "../model/admin-charge-operations-types"
import { throwCommittedChargeResponseLoss } from "../model/admin-charge-response-loss"

type PickerInput = { cursor?: string | null; search?: string }

export async function getChargeSummary(): Promise<ChargeSummary> {
  if (isMobileDevFixtureSession()) return getDevChargeWorkspace("applications")
  return readCachedMobileQuery("admin.charges.summary", () =>
    createMobileTrpcClient().mobile.admin.charges.summary.query()
  )
}

export async function getChargePage(
  input: PickerInput & {
    filters?: ChargeFilters
    lane: ChargeLane
  }
): Promise<ChargePage<ChargeApplicationRow | ChargeRuleRow>> {
  if (isMobileDevFixtureSession())
    return getDevChargeWorkspace(input.lane, input.search, input.filters)
  return readCachedMobileQuery(
    `admin.charges.page.${JSON.stringify(input)}`,
    () => createMobileTrpcClient().mobile.admin.charges.page.query(input),
    { persist: isPersistableReadInput(input) }
  )
}

export async function getChargeApplication(applicationId: string) {
  if (isMobileDevFixtureSession()) return getDevChargeApplication(applicationId)
  return readCachedMobileQuery(`admin.charges.detail.${applicationId}`, () =>
    createMobileTrpcClient().mobile.admin.charges.detail.query({
      applicationId,
    })
  ) as Promise<ChargeApplicationDetail>
}

export async function getChargeMembers(
  input: PickerInput
): Promise<ChargePage<ChargeMemberOption>> {
  if (isMobileDevFixtureSession()) {
    const options = await getDevChargeFormOptions(input.search)
    return { data: options.members, nextCursor: null }
  }
  return createMobileTrpcClient().mobile.admin.charges.members.query(input)
}

export async function getChargeRulesForApply(
  input: PickerInput & { assessedAt: string }
): Promise<ChargePage<ChargeRuleOption>> {
  if (isMobileDevFixtureSession()) {
    const options = await getDevChargeFormOptions(input.search)
    return { data: options.definitions, nextCursor: null }
  }
  return createMobileTrpcClient().mobile.admin.charges.rulesForApply.query(
    input
  )
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
  let result: ChargeCommandResult
  if (isMobileDevFixtureSession()) {
    const options = await getDevChargeFormOptions()
    const rule = options.definitions.find(
      (definition) => definition.id === input.chargeDefinitionId
    )
    result = await runDevChargeCommand(
      input.commandId,
      input.memberId,
      rule?.collectionMode === "pay_separately" ? "pending" : "posted"
    )
  } else {
    result =
      await createMobileTrpcClient().mobile.admin.charges.applyCharge.mutate(
        input
      )
  }
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
