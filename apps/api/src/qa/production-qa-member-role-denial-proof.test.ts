import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan, executeProductionQaNegativeJourneys } from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"
import { createProductionQaMemberRoleDenialAdapter } from "./production-qa-member-role-denial-proof"

const plan = createProductionQaHarnessPlan({ environment: "local", qaDomain: "ishaq.qa.test", runId: "role-denial-test" })
const denied = () => Promise.reject(new TRPCError({ code: "FORBIDDEN", message: "private text" }))
const execute = (overview: () => Promise<unknown>, role = "member", android = false) =>
  executeProductionQaNegativeJourneys({
    plan,
    journeyKeys: ["member-admin-finance-denial"],
    adapter: createProductionQaMemberRoleDenialAdapter({
      cooperativeRole: role,
      caller: { mobile: { admin: { finance: { overview } } } },
      androidCheckpoint: android ? async () => ({ status: "observed", observedOutcome: "PERMISSION_DENIED" }) : undefined,
    }),
  })

describe("Member finance role-denial proof", () => {
  test("records API denial without pretending missing native proof passes", async () => {
    const receipt = await execute(denied)
    expect(receipt.summary.passedSteps).toBe(1)
    expect(receipt.journeys[0]?.status).toBe("blocked")
    expect(receipt.journeys[0]?.steps[1]?.code).toBe("ANDROID_CHECKPOINT_UNAVAILABLE")
    expect(JSON.stringify(receipt)).not.toContain("private text")
  })
  test("requires both server and Android denial", async () => {
    expect((await execute(denied, "member", true)).summary.passedJourneys).toBe(1)
  })
  test("successful empty staff data is still a failed boundary", async () => {
    const receipt = await execute(async () => ({ queue: [] }), "member", true)
    expect(receipt.journeys[0]?.status).toBe("failed")
    expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
  })
  for (const code of ["UNAUTHORIZED", "BAD_REQUEST", "INTERNAL_SERVER_ERROR"] as const) {
    test(`does not mistake ${code} for permission denial`, async () => {
      const receipt = await execute(() => Promise.reject(new TRPCError({ code })))
      expect(receipt.journeys[0]?.steps[0]?.code).toBe("OUTCOME_MISMATCH")
    })
  }
  test("does not invoke the staff API with an unintended role", async () => {
    let calls = 0
    const receipt = await execute(async () => { calls += 1 }, "tenant_admin")
    expect(calls).toBe(0)
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("AUTHORIZATION_REQUIRED")
  })
})
