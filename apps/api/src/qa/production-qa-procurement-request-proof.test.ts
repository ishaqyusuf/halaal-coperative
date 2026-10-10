import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan, executeProductionQaPositiveJourneys } from "@halaalvest/domain"
import {
  createProductionQaProcurementRequestAdapter,
  procurementProofSubmissionKey,
  PRODUCTION_QA_PROCUREMENT_DRAFT,
  type ProductionQaProcurementCaller,
} from "./production-qa-procurement-request-proof"

const plan = createProductionQaHarnessPlan({
  environment: "local", qaDomain: "ishaq.qa.test", runId: "procurement-adapter",
})

function setup(options: {
  blocked?: boolean
  charges?: boolean
  noAndroid?: boolean
  badReplay?: boolean
  approved?: boolean
  schedule?: boolean
  duplicate?: boolean
  missing?: boolean
  paged?: boolean
  cursorLoop?: boolean
  transportError?: unknown
} = {}) {
  const calls: string[] = []
  const failures: Array<{ code: string; readinessRequired: boolean }> = []
  const request = {
    ...PRODUCTION_QA_PROCUREMENT_DRAFT,
    id: "private-request-id",
    approvedCost: options.approved ? 120000 : null,
    approvedRepaymentMonths: options.approved ? 6 : null,
    estimatedMonthlyRepayment: 20000,
    scheduleItems: options.schedule ? [{}] : [],
    status: options.approved ? "approved" : "submitted",
  }
  let creates = 0
  const caller: ProductionQaProcurementCaller = { mobile: { member: { procurement: {
    createRequest: async ({ submissionKey }) => {
      calls.push(`create:${submissionKey}`)
      if (options.transportError) throw options.transportError
      creates += 1
      return { ...request, id: options.badReplay && creates === 2 ? "different-id" : request.id }
    },
    list: async () => {
      calls.push("list")
      return {
        canCreateRequest: !options.blocked,
        capability: { accessMode: "member_self_service", canMemberCreate: true },
        chargeOptions: options.charges ? [{}] : [],
        policy: { maximumPaybackMonths: 12 }, restrictionReasons: [], state: "available",
      }
    },
    requests: async ({ cursor }) => {
      calls.push(`history:${cursor ?? "first"}`)
      return {
        data: options.missing || (options.paged && !cursor) ? [] : options.duplicate ? [request, request] : [request],
        nextCursor: options.cursorLoop || (options.paged && !cursor) ? "next" : null,
        state: "available",
      }
    },
  } } } }
  const run = () => executeProductionQaPositiveJourneys({
    adapter: createProductionQaProcurementRequestAdapter({
      androidCheckpoint: options.noAndroid ? undefined : async () => { calls.push("android"); return { status: "passed" } },
      caller, submissionKey: procurementProofSubmissionKey(plan.qaDomain),
      onCreateFailure: failure => failures.push(failure),
    }), journeyKeys: ["member-procurement-request"], plan,
  })
  return { calls, failures, run }
}

describe("production QA procurement proof", () => {
  test("requires an identical pending replay and complete history before Android", async () => {
    const { run, calls } = setup({ paged: true })
    const receipt = await run()
    expect(receipt.summary.passedSteps).toBe(4)
    expect(receipt.summary.passedJourneys).toBe(1)
    expect(calls).toEqual(["list", `create:${procurementProofSubmissionKey(plan.qaDomain)}`, `create:${procurementProofSubmissionKey(plan.qaDomain)}`, "history:first", "history:next", "android"])
    expect(JSON.stringify(receipt)).not.toContain("private-request-id")
    expect(JSON.stringify(receipt)).not.toContain(PRODUCTION_QA_PROCUREMENT_DRAFT.itemName)
  })
  test("stops before mutation when server capability is unavailable", async () => {
    const { run, calls } = setup({ blocked: true })
    expect((await run()).summary.blockedJourneys).toBe(1)
    expect(calls).toEqual(["list"])
  })
  test("requires a charge-free fixture instead of silently assessing charges", async () => {
    const { run, calls } = setup({ charges: true })
    expect((await run()).summary.blockedJourneys).toBe(1)
    expect(calls).toEqual(["list"])
  })
  for (const failure of ["badReplay", "approved", "schedule", "duplicate", "missing", "cursorLoop"] as const) {
    test(`rejects ${failure} instead of crediting the journey`, async () => {
      const { run, calls } = setup({ [failure]: true })
      expect((await run()).summary.failedJourneys).toBe(1)
      expect(calls).not.toContain("android")
    })
  }
  test("does not credit API-only proof as native completion", async () => {
    const receipt = await setup({ noAndroid: true }).run()
    expect(receipt.summary.passedSteps).toBe(3)
    expect(receipt.summary.blockedJourneys).toBe(1)
    expect(receipt.summary.passedJourneys).toBe(0)
  })
  test("uses a stable domain-isolated UUID across repeat runs", () => {
    const key = procurementProofSubmissionKey("ishaq.qa.test")
    expect(key).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/)
    expect(procurementProofSubmissionKey("ishaq.qa.test")).toBe(key)
    expect(procurementProofSubmissionKey("another.qa.test")).not.toBe(key)
  })
  test("retains bounded readiness diagnostics without exporting exception text", async () => {
    const error = Object.assign(new Error("Member verification is required before financial or operational actions can continue."), { code: "CONFLICT" })
    const { run, failures } = setup({ transportError: error })
    expect((await run()).summary.failedJourneys).toBe(1)
    expect(failures).toEqual([{ code: "CONFLICT", readinessRequired: true }])
    const unsafe = setup({ transportError: Object.assign(new Error("private credential"), { code: "private token" }) })
    await unsafe.run()
    expect(unsafe.failures).toEqual([{ code: "UNKNOWN", readinessRequired: false }])
  })
})
