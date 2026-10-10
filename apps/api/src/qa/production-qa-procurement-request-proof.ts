import { createHash } from "node:crypto"
import {
  createProductionQaHarnessPlan,
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaJourneyExecutionAdapter,
  type ProductionQaStepAdapterResult,
} from "@halaalvest/domain"
import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

export const PRODUCTION_QA_PROCUREMENT_DRAFT = {
  itemDescription: "QA ONLY procurement request. No purchase authorization.",
  itemName: "QA ONLY T30 API sewing machine",
  requestedCost: 120000,
  requestedRepaymentMonths: 6,
  vendorName: "QA ONLY equipment vendor",
} as const

type ProcurementRequest = {
  approvedCost: number | null
  approvedRepaymentMonths: number | null
  estimatedMonthlyRepayment: number
  id: string
  itemDescription: string | null
  itemName: string
  requestedCost: number
  requestedRepaymentMonths: number
  scheduleItems: unknown[]
  status: string
  vendorName: string | null
}

export type ProductionQaProcurementCaller = {
  mobile: {
    member: {
      procurement: {
        createRequest: (input: {
          itemDescription?: string
          itemName: string
          requestedCost: number
          requestedRepaymentMonths: number
          submissionKey: string
          vendorName?: string
        }) => Promise<ProcurementRequest>
        list: () => Promise<{
          canCreateRequest: boolean
          capability: { accessMode: string; canMemberCreate: boolean }
          chargeOptions: unknown[]
          policy: { maximumPaybackMonths: number }
          restrictionReasons: string[]
          state: string
        }>
        requests: (input: { cursor?: string; pageSize: number }) => Promise<{
          data: ProcurementRequest[]
          nextCursor: string | null
          state: string
        }>
      }
    }
  }
}

export function procurementProofSubmissionKey(qaDomain: string) {
  const hash = createHash("sha256")
    .update(`ticket-30:standard-review:procurement:v1:${qaDomain}`)
    .digest("hex")
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function isExpectedPendingRequest(request: ProcurementRequest) {
  const draft = PRODUCTION_QA_PROCUREMENT_DRAFT
  return request.id.length > 0 && request.status === "submitted" &&
    request.itemName === draft.itemName &&
    request.itemDescription === draft.itemDescription &&
    request.vendorName === draft.vendorName &&
    request.requestedCost === draft.requestedCost &&
    request.requestedRepaymentMonths === draft.requestedRepaymentMonths &&
    request.estimatedMonthlyRepayment === 20000 &&
    request.approvedCost === null && request.approvedRepaymentMonths === null &&
    request.scheduleItems.length === 0
}

export function createProductionQaProcurementRequestAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaStepAdapterResult>
  caller: ProductionQaProcurementCaller
  onCreateFailure?: (failure: { code: string; readinessRequired: boolean }) => void
  submissionKey: string
}): ProductionQaJourneyExecutionAdapter {
  const procurement = input.caller.mobile.member.procurement
  let available = false
  let requestId: string | null = null
  let historyConfirmed = false
  const fail = () => ({ code: "ASSERTION_FAILED", status: "failed" } as const)

  return {
    executeStep: async ({ step }) => {
      if (step.surface === "android") {
        if (!historyConfirmed) return fail()
        return input.androidCheckpoint
          ? input.androidCheckpoint()
          : { code: "ANDROID_CHECKPOINT_UNAVAILABLE", status: "blocked" }
      }
      switch (step.contract) {
        case "mobile.member.procurement.list": {
          const snapshot = await procurement.list()
          available = snapshot.state === "available" && snapshot.canCreateRequest &&
            snapshot.capability.canMemberCreate &&
            snapshot.capability.accessMode === "member_self_service" &&
            snapshot.chargeOptions.length === 0 &&
            snapshot.restrictionReasons.length === 0 &&
            snapshot.policy.maximumPaybackMonths >= PRODUCTION_QA_PROCUREMENT_DRAFT.requestedRepaymentMonths
          return available ? { status: "passed" } : { code: "FIXTURE_MISSING", status: "blocked" }
        }
        case "mobile.member.procurement.createRequest": {
          if (!available) return fail()
          const command = { ...PRODUCTION_QA_PROCUREMENT_DRAFT, submissionKey: input.submissionKey }
          const create = async () => {
            try { return await procurement.createRequest(command) } catch (error) {
              const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN"
              input.onCreateFailure?.({
                code: ["BAD_REQUEST", "CONFLICT", "FORBIDDEN", "UNAUTHORIZED", "PRECONDITION_FAILED", "INTERNAL_SERVER_ERROR", "NOT_FOUND"].includes(code) ? code : "UNKNOWN",
                readinessRequired: error instanceof Error && error.message === "Member verification is required before financial or operational actions can continue.",
              })
              throw error
            }
          }
          const created = await create()
          const replay = await create()
          if (!isExpectedPendingRequest(created) || !isExpectedPendingRequest(replay) || created.id !== replay.id) return fail()
          requestId = created.id
          return { status: "passed" }
        }
        case "mobile.member.procurement.requests": {
          if (!requestId) return fail()
          const cursors = new Set<string>()
          let cursor: string | undefined
          let matches = 0
          for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
            const page = await procurement.requests({ cursor, pageSize: 50 })
            if (page.state !== "available") return fail()
            for (const request of page.data) {
              if (request.id !== requestId && request.itemName !== PRODUCTION_QA_PROCUREMENT_DRAFT.itemName) continue
              if (request.id !== requestId || !isExpectedPendingRequest(request)) return fail()
              matches += 1
            }
            if (!page.nextCursor) {
              historyConfirmed = matches === 1
              return historyConfirmed ? { status: "passed" } : fail()
            }
            if (cursors.has(page.nextCursor)) return fail()
            cursors.add(page.nextCursor)
            cursor = page.nextCursor
          }
          // A bounded partial scan cannot establish exactly-once history.
          return fail()
        }
        default:
          return { code: "FIXTURE_MISSING", status: "blocked" }
      }
    },
  }
}

export async function runProductionQaProcurementRequestProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  const failures: Array<{ code: string; readinessRequired: boolean }> = []
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-procurement-${plan.runId}`,
    execute: ({ caller }) => executeProductionQaPositiveJourneys({
      adapter: createProductionQaProcurementRequestAdapter({
        androidCheckpoint: input.androidCheckpoint,
        caller,
        onCreateFailure: failure => failures.push(failure),
        submissionKey: procurementProofSubmissionKey(plan.qaDomain),
      }),
      journeyKeys: ["member-procurement-request"],
      plan,
    }),
    plan,
    role: "member",
    scenarioKey: "standard-review",
    testerLabel: `Ticket 30 procurement request ${plan.runId}`,
  })
  return {
    cleanup: session.cleanup,
    failures,
    complete: session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked && session.cleanup.testerCredentialRevoked,
    receipt: session.result,
    report: createProductionQaJourneyExecutionReport(session.result),
  }
}
