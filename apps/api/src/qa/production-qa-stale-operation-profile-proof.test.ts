import { expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaNegativeJourneys,
} from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"
import { createProductionQaStaleOperationProfileAdapter } from "./production-qa-stale-operation-profile-proof"

const plan = createProductionQaHarnessPlan({
  environment: "local",
  qaDomain: "ishaq.qa.test",
  runId: "stale-mode-test",
})
const snapshot = {
  reviewedAt: "2026-09-04T00:00:00.000Z",
  reviewedByUserId: "qa-reviewer",
  services: [{ serviceKey: "procurement", accessMode: "read_only" }],
  subscription: { accessEnabled: true },
}

test("proves a stale conflict and unchanged readback without accepting missing Android evidence", async () => {
  let reads = 0
  const commands: unknown[] = []
  const receipt = await executeProductionQaNegativeJourneys({
    plan,
    journeyKeys: ["stale-operation-profile-command"],
    adapter: createProductionQaStaleOperationProfileAdapter({
      cooperativeRole: "tenant_admin",
      caller: {
        overview: async () => {
          reads += 1
          return snapshot
        },
        updateService: async (input) => {
          commands.push(input)
          throw new TRPCError({ code: "CONFLICT", message: "private details" })
        },
      },
    }),
  })
  expect(reads).toBe(2)
  expect(commands).toEqual([
    {
      serviceKey: "procurement",
      expectedAccessMode: "member_self_service",
      nextAccessMode: "office_only",
      changeReason: "QA ONLY — stale expected-state verification.",
    },
  ])
  expect(receipt.summary.passedSteps).toBe(1)
  expect(receipt.journeys[0]?.status).toBe("blocked")
  expect(receipt.journeys[0]?.steps[1]?.code).toBe(
    "ANDROID_CHECKPOINT_UNAVAILABLE"
  )
  expect(JSON.stringify(receipt)).not.toContain("private details")
})

for (const drift of ["mode", "review-time", "reviewer"] as const) {
  test(`rejects CONFLICT when ${drift} changed in the subsequent read`, async () => {
    let reads = 0
    let nativeCalls = 0
    const receipt = await executeProductionQaNegativeJourneys({
      plan,
      journeyKeys: ["stale-operation-profile-command"],
      adapter: createProductionQaStaleOperationProfileAdapter({
        cooperativeRole: "tenant_admin",
        caller: {
          overview: async () =>
            ++reads === 1
              ? snapshot
              : {
                  ...snapshot,
                  ...(drift === "mode"
                    ? {
                        services: [
                          {
                            serviceKey: "procurement",
                            accessMode: "office_only",
                          },
                        ],
                      }
                    : {}),
                  ...(drift === "review-time"
                    ? { reviewedAt: "2026-09-05T00:00:00.000Z" }
                    : {}),
                  ...(drift === "reviewer"
                    ? { reviewedByUserId: "another-reviewer" }
                    : {}),
                },
          updateService: async () => {
            throw new TRPCError({ code: "CONFLICT" })
          },
        },
        androidCheckpoint: async () => {
          nativeCalls += 1
          return { status: "observed", observedOutcome: "CONFLICT" }
        },
      }),
    })
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("ASSERTION_FAILED")
    expect(nativeCalls).toBe(0)
  })
}

for (const outcome of [
  "success",
  "FORBIDDEN",
  "UNAUTHORIZED",
  "INTERNAL_SERVER_ERROR",
] as const) {
  test(`does not accept ${outcome} as a stale-state conflict`, async () => {
    const receipt = await executeProductionQaNegativeJourneys({
      plan,
      journeyKeys: ["stale-operation-profile-command"],
      adapter: createProductionQaStaleOperationProfileAdapter({
        cooperativeRole: "tenant_admin",
        caller: {
          overview: async () => snapshot,
          updateService: async () => {
            if (outcome !== "success") throw new TRPCError({ code: outcome })
            return snapshot
          },
        },
      }),
    })
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("OUTCOME_MISMATCH")
    expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
  })
}

test("requires the intended role and read-only entitled fixture before sending any command", async () => {
  for (const variant of ["role", "mode", "entitlement"] as const) {
    let writes = 0
    const receipt = await executeProductionQaNegativeJourneys({
      plan,
      journeyKeys: ["stale-operation-profile-command"],
      adapter: createProductionQaStaleOperationProfileAdapter({
        cooperativeRole: variant === "role" ? "member" : "tenant_admin",
        caller: {
          overview: async () => ({
            ...snapshot,
            services: [
              {
                serviceKey: "procurement",
                accessMode:
                  variant === "mode" ? "member_self_service" : "read_only",
              },
            ],
            subscription: { accessEnabled: variant !== "entitlement" },
          }),
          updateService: async () => {
            writes += 1
          },
        },
      }),
    })
    expect(writes).toBe(0)
    expect(receipt.journeys[0]?.status).toBe("failed")
  }
})

test("accepts both independent API and native checkpoints without serializing private state", async () => {
  const caller = {
    overview: async () => snapshot,
    updateService: async () => {
      throw new TRPCError({ code: "CONFLICT" })
    },
  }
  const receipt = await executeProductionQaNegativeJourneys({
    plan,
    journeyKeys: ["stale-operation-profile-command"],
    adapter: createProductionQaStaleOperationProfileAdapter({
      cooperativeRole: "tenant_admin",
      caller,
      androidCheckpoint: async () => ({
        status: "observed",
        observedOutcome: "CONFLICT",
      }),
    }),
  })
  expect(receipt.summary.passedJourneys).toBe(1)
  expect(JSON.stringify(receipt)).not.toContain("qa-reviewer")
})
