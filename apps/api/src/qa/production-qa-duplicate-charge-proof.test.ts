import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaNegativeJourneys,
} from "@halaalvest/domain"

import {
  createProductionQaDuplicateChargeAdapter,
  PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
  PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
  type ProductionQaDuplicateChargeFingerprint,
} from "./production-qa-duplicate-charge-proof"

const plan = createProductionQaHarnessPlan({
  environment: "local",
  qaDomain: "ishaq.qa.test",
  runId: "duplicate-charge-test",
})

function fingerprint(input: {
  applications: number
  ledgerEntries: number
  ledgerTransactions: number
  savings?: number
}): ProductionQaDuplicateChargeFingerprint {
  const applicationIds = Array.from(
    { length: input.applications },
    (_, index) => `application-${index + 1}`
  )
  const value = {
    applicationIds,
    ledgerEntries: input.ledgerEntries,
    ledgerTransactions: input.ledgerTransactions,
    memberSavings: input.savings ?? 95_000,
  }
  return {
    applicationCount: input.applications,
    applicationIds,
    fingerprint: JSON.stringify(value),
    ledgerEntryCount: input.ledgerEntries,
    ledgerTransactionCount: input.ledgerTransactions,
    memberSavings: value.memberSavings,
  }
}

function execute(input?: {
  androidFingerprint?: ProductionQaDuplicateChargeFingerprint
  includeAndroid?: boolean
  replayedOnSecondCall?: boolean
  role?: string
  firstFingerprint?: ProductionQaDuplicateChargeFingerprint
}) {
  const empty = fingerprint({
    applications: 0,
    ledgerEntries: 0,
    ledgerTransactions: 0,
    savings: 100_000,
  })
  const one =
    input?.firstFingerprint ??
    fingerprint({ applications: 1, ledgerEntries: 2, ledgerTransactions: 1 })
  const android = input?.androidFingerprint ?? one
  let apiApplied = false
  let androidApplied = false
  let calls = 0

  return executeProductionQaNegativeJourneys({
    adapter: createProductionQaDuplicateChargeAdapter({
      androidCheckpoint:
        input?.includeAndroid === false
          ? undefined
          : async () => {
              androidApplied = true
              return {
                observedOutcome: "IDEMPOTENT_REPLAY",
                status: "observed",
              }
            },
      androidNotes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
      caller: {
        applyCharge: async ({ commandId }) => {
          calls += 1
          apiApplied = true
          return {
            commandId,
            entityId: "application-1",
            replayed:
              calls === 2 ? input?.replayedOnSecondCall !== false : false,
            state: "posted",
          }
        },
      },
      command: {
        assessedAt: "2026-09-06T12:00:00.000Z",
        basisAmount: null,
        chargeDefinitionId: "definition-1",
        commandId: "11111111-1111-4111-8111-111111111111",
        expectedAmount: 5_000,
        expectedState: "available",
        memberId: "member-1",
        notes: PRODUCTION_QA_DUPLICATE_CHARGE_API_NOTE,
      },
      cooperativeRole: input?.role ?? "finance_officer",
      prepareAndroidCheckpoint: async () => {
        apiApplied = false
        return true
      },
      readFingerprint: async (notes) => {
        if (notes === PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE) {
          return androidApplied ? android : empty
        }
        return apiApplied ? one : empty
      },
    }),
    journeyKeys: ["duplicate-charge-command"],
    plan,
  })
}

describe("duplicate charge production proof", () => {
  test("requires one API effect, exact replay, and one Android effect", async () => {
    const receipt = await execute()
    expect(receipt.summary.passedJourneys).toBe(1)
    expect(receipt.summary.passedSteps).toBe(3)
  })

  test("rejects a second response that is not an idempotent replay", async () => {
    const receipt = await execute({ replayedOnSecondCall: false })
    expect(receipt.journeys[0]?.status).toBe("failed")
    expect(receipt.journeys[0]?.steps[1]?.code).toBe("ASSERTION_FAILED")
    expect(receipt.journeys[0]?.steps[2]?.status).toBe("skipped")
  })

  test("rejects duplicate API charge or ledger effects", async () => {
    const receipt = await execute({
      firstFingerprint: fingerprint({
        applications: 2,
        ledgerEntries: 4,
        ledgerTransactions: 2,
      }),
    })
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("ASSERTION_FAILED")
  })

  test("does not pass without an Android checkpoint", async () => {
    const receipt = await execute({ includeAndroid: false })
    expect(receipt.journeys[0]?.status).toBe("blocked")
    expect(receipt.journeys[0]?.steps[2]?.code).toBe(
      "ANDROID_CHECKPOINT_UNAVAILABLE"
    )
  })

  test("rejects Android output without exactly one ledger transaction", async () => {
    const receipt = await execute({
      androidFingerprint: fingerprint({
        applications: 1,
        ledgerEntries: 0,
        ledgerTransactions: 0,
      }),
    })
    expect(receipt.journeys[0]?.steps[2]?.code).toBe("ASSERTION_FAILED")
  })

  test("does not invoke charge transport for the wrong role", async () => {
    const receipt = await execute({ role: "tenant_admin" })
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("AUTHORIZATION_REQUIRED")
  })
})
