import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaNegativeJourneys,
} from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"

import {
  createProductionQaMemberCapacityAdapter,
  type ProductionQaMemberCapacityCaller,
} from "./production-qa-member-capacity-proof"

const plan = createProductionQaHarnessPlan({
  environment: "local",
  qaDomain: "ishaq.qa.test",
  runId: "member-capacity-test",
})

const directory = {
  generatedAt: "2026-09-06T00:00:00.000Z",
  memberExpansion: {
    activeMemberCount: 1,
    activeMemberLimit: 1,
    planCode: "starter",
    planName: "Starter",
    reason: "active_member_limit_reached",
    status: "at_capacity" as const,
  },
  members: [],
  onboardingRequests: [],
  page: 1,
  pageSize: 25,
  reviewQueues: [],
  summary: {
    activeCount: 1,
    kycPendingCount: 0,
    linkedUsersCount: 0,
    pageCount: 0,
    totalCount: 1,
  },
  total: 1,
}

function execute(input: {
  android?: boolean
  caller: ProductionQaMemberCapacityCaller
  role?: string
}) {
  return executeProductionQaNegativeJourneys({
    adapter: createProductionQaMemberCapacityAdapter({
      androidCheckpoint: input.android
        ? async () => ({
            status: "observed",
            observedOutcome: "PERMISSION_DENIED",
          })
        : undefined,
      caller: input.caller,
      cooperativeRole: input.role ?? "tenant_admin",
      qaDomain: plan.qaDomain,
    }),
    journeyKeys: ["member-capacity-limit"],
    plan,
  })
}

describe("member capacity proof", () => {
  test("proves exact rejection, unchanged directory, and Android recovery", async () => {
    let creates = 0
    const receipt = await execute({
      android: true,
      caller: {
        create: async () => {
          creates += 1
          throw new TRPCError({ code: "FORBIDDEN" })
        },
        list: async () => directory,
      },
    })

    expect(creates).toBe(1)
    expect(receipt.journeys[0]?.status).toBe("passed")
    expect(receipt.journeys[0]?.steps[0]?.observedOutcome).toBe(
      "PERMISSION_DENIED"
    )
  })

  test("does not claim completion without Android evidence", async () => {
    const receipt = await execute({
      caller: {
        create: async () => {
          throw new TRPCError({ code: "FORBIDDEN" })
        },
        list: async () => directory,
      },
    })

    expect(receipt.journeys[0]?.status).toBe("blocked")
    expect(receipt.journeys[0]?.steps[1]?.code).toBe(
      "ANDROID_CHECKPOINT_UNAVAILABLE"
    )
  })

  test("rejects success, wrong denial, mutation, and wrong role", async () => {
    const variants = ["success", "wrong-code", "changed", "role"] as const
    for (const variant of variants) {
      let reads = 0
      const receipt = await execute({
        android: true,
        caller: {
          create: async () => {
            if (variant === "success") return
            throw new TRPCError({
              code: variant === "wrong-code" ? "CONFLICT" : "FORBIDDEN",
            })
          },
          list: async () =>
            variant === "changed" && ++reads === 2
              ? { ...directory, total: 2 }
              : directory,
        },
        role: variant === "role" ? "member" : "tenant_admin",
      })
      expect(receipt.journeys[0]?.status).toBe("failed")
    }
  })
})
