import type { ProductionQaDuplicateChargeFixtureResult } from "@halaalvest/db"
import {
  createProductionQaHarnessPlan,
  executeProductionQaPositiveJourneys,
} from "@halaalvest/domain"
import { describe, expect, test } from "bun:test"

import {
  createProductionQaAdminChargeApplicationAdapter,
  PRODUCTION_QA_ADMIN_CHARGE_ANDROID_NOTE,
  PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
} from "./production-qa-admin-charge-application-proof"
import type { ProductionQaDuplicateChargeFingerprint } from "./production-qa-duplicate-charge-proof"

const fixture = {
  chargeDefinitionId: "charge-definition",
  member: { id: "member" },
} as ProductionQaDuplicateChargeFixtureResult

function fingerprint(input: {
  applicationCount: number
  ledgerEntryCount: number
  ledgerTransactionCount: number
  memberSavings: number
}): ProductionQaDuplicateChargeFingerprint {
  return {
    ...input,
    applicationIds: input.applicationCount ? ["application"] : [],
    fingerprint: JSON.stringify(input),
  }
}

const command = {
  assessedAt: "2026-09-06T00:00:00.000Z",
  basisAmount: null,
  chargeDefinitionId: fixture.chargeDefinitionId,
  commandId: "3b8e24dc-5325-45b5-b3b2-08aed8ed21ab",
  expectedAmount: 5000,
  expectedState: "available",
  memberId: fixture.member.id,
  notes: PRODUCTION_QA_ADMIN_CHARGE_API_NOTE,
}

const plan = createProductionQaHarnessPlan({
  environment: "local",
  qaDomain: "ishaq.qa.test",
  runId: "admin-charge-adapter",
})

describe("production QA admin charge application", () => {
  test("passes only after workspace, one balanced API charge, and Android proof", async () => {
    let applied = false
    const zero = fingerprint({
      applicationCount: 0,
      ledgerEntryCount: 0,
      ledgerTransactionCount: 0,
      memberSavings: 250000,
    })
    const one = fingerprint({
      applicationCount: 1,
      ledgerEntryCount: 2,
      ledgerTransactionCount: 1,
      memberSavings: 245000,
    })

    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaAdminChargeApplicationAdapter({
        androidCheckpoint: async () => ({ status: "passed" }),
        caller: {
          applyCharge: async () => {
            applied = true
            return {
              commandId: command.commandId,
              entityId: "application",
              replayed: false,
              state: "posted",
            }
          },
          formOptions: async () => ({
            definitions: [
              { id: fixture.chargeDefinitionId, rate: command.expectedAmount },
            ],
            members: [{ id: fixture.member.id }],
          }),
          workspace: async () => ({
            capabilities: { manage: true, view: true },
            currencyCode: "NGN",
            lane: "applications",
          }),
        },
        command,
        fixture,
        prepareAndroidCheckpoint: async () => true,
        readFingerprint: async (notes) =>
          notes === PRODUCTION_QA_ADMIN_CHARGE_ANDROID_NOTE
            ? one
            : applied
              ? one
              : zero,
      }),
      journeyKeys: ["admin-charge-application"],
      plan,
    })

    expect(receipt.journeys[0]?.status).toBe("passed")
    expect(receipt.summary).toMatchObject({
      passedJourneys: 1,
      passedSteps: 3,
      totalJourneys: 1,
      totalSteps: 3,
    })
  })

  test("blocks before mutation when the fixture is not manageable", async () => {
    let applyCalls = 0
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaAdminChargeApplicationAdapter({
        caller: {
          applyCharge: async () => {
            applyCalls += 1
            throw new Error("must not run")
          },
          formOptions: async () => ({
            definitions: [],
            members: [],
          }),
          workspace: async () => ({
            capabilities: { manage: false, view: true },
            currencyCode: "NGN",
            lane: "applications",
          }),
        },
        command,
        fixture,
        prepareAndroidCheckpoint: async () => false,
        readFingerprint: async () =>
          fingerprint({
            applicationCount: 0,
            ledgerEntryCount: 0,
            ledgerTransactionCount: 0,
            memberSavings: 250000,
          }),
      }),
      journeyKeys: ["admin-charge-application"],
      plan,
    })

    expect(receipt.journeys[0]?.status).toBe("blocked")
    expect(receipt.journeys[0]?.steps.map(({ status }) => status)).toEqual([
      "blocked",
      "skipped",
      "skipped",
    ])
    expect(applyCalls).toBe(0)
  })
})
