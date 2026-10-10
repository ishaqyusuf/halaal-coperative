import { describe, expect, test } from "bun:test"

import {
  createProductionQaHarnessPlan,
  executeProductionQaNegativeJourneys,
} from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"

import {
  createProductionQaReadOnlyProcurementAdapter,
  type ProductionQaReadOnlyProcurementCaller,
} from "./production-qa-read-only-procurement-proof"

const plan = createProductionQaHarnessPlan({
  environment: "local",
  qaDomain: "ishaq.qa.test",
  runId: "read-only-procurement-test",
})

const request = {
  approvedCost: null,
  approvedMonthlyRepayment: null,
  approvedRepaymentMonths: null,
  estimatedMonthlyRepayment: 20_000,
  id: "11111111-1111-4111-a111-111111111111",
  itemDescription: "Existing request",
  itemName: "Existing equipment",
  outstandingAmount: 120_000,
  purchasedAt: null,
  purchaseReference: null,
  requestedAt: "2026-09-01T00:00:00.000Z",
  requestedCost: 120_000,
  requestedRepaymentMonths: 6,
  reviewNotes: null,
  scheduleItems: [],
  status: "submitted",
  vendorName: "Existing vendor",
}

const snapshot = {
  cache: undefined,
  canCreateRequest: false,
  capability: {
    accessMode: "read_only" as const,
    canMemberCreate: false,
    canSettleExisting: true,
    canStaffCreate: false,
    canViewExisting: true,
    serviceKey: "procurement" as const,
    shouldShowInMemberNav: true,
    shouldShowInStaffNav: true,
  },
  chargeOptions: [],
  generatedAt: "2026-09-05T00:00:00.000Z",
  member: {
    id: "22222222-2222-4222-a222-222222222222",
    memberNumber: "QSH-0001",
    name: "QA Member",
  },
  policy: {
    activeFinancingBlocksProcurement: false,
    allowsCommitmentReductionDuringPayback: false,
    maximumActiveObligationsPerMember: 1,
    maximumPaybackMonths: 12,
  },
  requestNextCursor: null,
  requests: [request],
  restrictionReasons: [
    "Procurement is currently read-only. Existing requests remain available.",
  ],
  state: "available" as const,
  summary: {
    activeRequests: 0,
    approvedRequests: 0,
    dueScheduleItems: 0,
    outstandingAmount: 0,
    overdueScheduleItems: 0,
    pendingRequests: 1,
    totalRequests: 1,
  },
}

function caller(
  overrides: Partial<ProductionQaReadOnlyProcurementCaller> = {}
): ProductionQaReadOnlyProcurementCaller {
  return {
    createRequest: async () => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "private read-only detail",
      })
    },
    list: async () => snapshot,
    requests: async () => ({
      data: [request],
      nextCursor: null,
      state: "available",
    }),
    ...overrides,
  }
}

function execute(
  input: {
    android?: boolean
    caller?: ProductionQaReadOnlyProcurementCaller
    role?: string
  } = {}
) {
  return executeProductionQaNegativeJourneys({
    adapter: createProductionQaReadOnlyProcurementAdapter({
      androidCheckpoint: input.android
        ? async () => ({
            status: "observed",
            observedOutcome: "PRECONDITION_FAILED",
          })
        : undefined,
      caller: input.caller ?? caller(),
      cooperativeRole: input.role ?? "member",
      qaDomain: plan.qaDomain,
    }),
    journeyKeys: ["read-only-procurement-command"],
    plan,
  })
}

describe("read-only Procurement proof", () => {
  test("proves the production rejection and unchanged request history", async () => {
    let listReads = 0
    let historyReads = 0
    let commands = 0
    const receipt = await execute({
      android: true,
      caller: caller({
        createRequest: async () => {
          commands += 1
          throw new TRPCError({ code: "PRECONDITION_FAILED" })
        },
        list: async () => {
          listReads += 1
          return snapshot
        },
        requests: async () => {
          historyReads += 1
          return { data: [request], nextCursor: null, state: "available" }
        },
      }),
    })

    expect(commands).toBe(1)
    expect(listReads).toBe(2)
    expect(historyReads).toBe(2)
    expect(receipt.summary.passedJourneys).toBe(1)
    expect(receipt.journeys[0]?.steps[0]?.observedOutcome).toBe(
      "PRECONDITION_FAILED"
    )
  })

  test("does not claim completion without the independent Android checkpoint", async () => {
    const receipt = await execute()
    expect(receipt.summary.passedSteps).toBe(1)
    expect(receipt.journeys[0]?.status).toBe("blocked")
    expect(receipt.journeys[0]?.steps[1]?.code).toBe(
      "ANDROID_CHECKPOINT_UNAVAILABLE"
    )
    expect(JSON.stringify(receipt)).not.toContain("private read-only detail")
  })

  for (const outcome of [
    "success",
    "FORBIDDEN",
    "UNAUTHORIZED",
    "CONFLICT",
  ] as const) {
    test(`rejects ${outcome} as read-only enforcement evidence`, async () => {
      const receipt = await execute({
        caller: caller({
          createRequest: async () => {
            if (outcome !== "success") throw new TRPCError({ code: outcome })
          },
        }),
      })
      expect(receipt.journeys[0]?.steps[0]?.code).toBe("OUTCOME_MISMATCH")
      expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
    })
  }

  test("rejects a wrong role or a write-enabled capability before invoking creation", async () => {
    for (const variant of ["role", "mode"] as const) {
      let commands = 0
      const testCaller = caller({
        createRequest: async () => {
          commands += 1
        },
        list: async () =>
          variant === "mode"
            ? {
                ...snapshot,
                canCreateRequest: true,
                capability: {
                  ...snapshot.capability,
                  accessMode: "member_self_service",
                  canMemberCreate: true,
                },
                restrictionReasons: [],
              }
            : snapshot,
      })
      const receipt = await execute({
        caller: testCaller,
        role: variant === "role" ? "tenant_admin" : "member",
      })
      expect(commands).toBe(0)
      expect(receipt.journeys[0]?.status).toBe("failed")
    }
  })

  test("fails when the rejected command changes durable request history", async () => {
    let historyReads = 0
    const receipt = await execute({
      android: true,
      caller: caller({
        requests: async () => ({
          data: ++historyReads === 1 ? [request] : [],
          nextCursor: null,
          state: "available",
        }),
      }),
    })
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("ASSERTION_FAILED")
    expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
  })

  test("fails closed on cyclic history pagination", async () => {
    const receipt = await execute({
      caller: caller({
        requests: async () => ({
          data: [request],
          nextCursor: "repeat",
          state: "available",
        }),
      }),
    })
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("ASSERTION_FAILED")
  })
})
