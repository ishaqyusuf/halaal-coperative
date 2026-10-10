import { createHash } from "node:crypto"

import {
  createProductionQaHarnessPlan,
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
  type ProductionQaNegativeStepAdapterResult,
} from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"

import type { RouterInputs, RouterOutputs } from "../routers/_app"
import { PRODUCTION_QA_PROCUREMENT_DRAFT } from "./production-qa-procurement-request-proof"
import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const JOURNEY = "read-only-procurement-command"
const READ_ONLY_REASON =
  "Procurement is currently read-only. Existing requests remain available."
const BOUNDED_ERROR_CODES = new Set([
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
  "PRECONDITION_FAILED",
  "UNAUTHORIZED",
])

type ProcurementList = RouterOutputs["mobile"]["member"]["procurement"]["list"]
type ProcurementRequestPage =
  RouterOutputs["mobile"]["member"]["procurement"]["requests"]
type ProcurementRequestInput =
  RouterInputs["mobile"]["member"]["procurement"]["createRequest"]
type ProcurementRequestsInput =
  RouterInputs["mobile"]["member"]["procurement"]["requests"]

export type ProductionQaReadOnlyProcurementCaller = {
  createRequest: (input: ProcurementRequestInput) => Promise<unknown>
  list: () => Promise<ProcurementList>
  requests: (input: ProcurementRequestsInput) => Promise<ProcurementRequestPage>
}

function submissionKey(qaDomain: string) {
  const hash = createHash("sha256")
    .update(`ticket-30:enterprise-stale:read-only-procurement:v1:${qaDomain}`)
    .digest("hex")

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function isReadOnlySnapshot(snapshot: ProcurementList) {
  return (
    snapshot.state === "available" &&
    snapshot.capability.accessMode === "read_only" &&
    snapshot.capability.canViewExisting &&
    !snapshot.capability.canMemberCreate &&
    !snapshot.canCreateRequest &&
    snapshot.restrictionReasons.includes(READ_ONLY_REASON)
  )
}

async function readRequestFingerprint(
  caller: ProductionQaReadOnlyProcurementCaller
) {
  const cursors = new Set<string>()
  const requests: ProcurementRequestPage["data"] = []
  let cursor: string | undefined

  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const page = await caller.requests({ cursor, pageSize: 50 })
    if (page.state !== "available") return null
    requests.push(...page.data)
    if (!page.nextCursor) {
      return JSON.stringify(
        [...requests].sort((left, right) => left.id.localeCompare(right.id))
      )
    }
    if (cursors.has(page.nextCursor)) return null
    cursors.add(page.nextCursor)
    cursor = page.nextCursor
  }

  return null
}

export function createProductionQaReadOnlyProcurementAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  caller: ProductionQaReadOnlyProcurementCaller
  cooperativeRole: string | null | undefined
  onCreateOutcome?: (outcome: string) => void
  qaDomain: string
}): ProductionQaNegativeJourneyExecutionAdapter {
  let rejectionVerified = false

  return {
    verifySuppressedStep: async () => ({
      status: "blocked",
      code: "TRANSPORT_UNAVAILABLE",
    }),
    executeInvokedStep: async ({ journey, step }) => {
      if (journey.key !== JOURNEY || input.cooperativeRole !== "member") {
        return { status: "failed", code: "AUTHORIZATION_REQUIRED" }
      }

      if (step.surface === "android") {
        if (!rejectionVerified) {
          return { status: "failed", code: "ASSERTION_FAILED" }
        }
        return input.androidCheckpoint
          ? input.androidCheckpoint()
          : {
              status: "blocked",
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
            }
      }

      if (step.contract !== "mobile.member.procurement.createRequest") {
        return { status: "blocked", code: "TRANSPORT_UNAVAILABLE" }
      }

      const before = await input.caller.list()
      const beforeFingerprint = await readRequestFingerprint(input.caller)
      if (!isReadOnlySnapshot(before) || beforeFingerprint === null) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      try {
        await input.caller.createRequest({
          ...PRODUCTION_QA_PROCUREMENT_DRAFT,
          submissionKey: submissionKey(input.qaDomain),
        })
        input.onCreateOutcome?.("SUCCESS")
        return { status: "failed", code: "OUTCOME_MISMATCH" }
      } catch (error) {
        const rawCode =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "UNKNOWN"
        const code = BOUNDED_ERROR_CODES.has(rawCode) ? rawCode : "UNKNOWN"
        input.onCreateOutcome?.(code)
        if (!(error instanceof TRPCError) || code !== "PRECONDITION_FAILED") {
          return { status: "failed", code: "OUTCOME_MISMATCH" }
        }
      }

      const after = await input.caller.list()
      const afterFingerprint = await readRequestFingerprint(input.caller)
      if (
        !isReadOnlySnapshot(after) ||
        afterFingerprint === null ||
        afterFingerprint !== beforeFingerprint
      ) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      rejectionVerified = true
      return {
        status: "observed",
        observedOutcome: "PRECONDITION_FAILED",
      }
    },
  }
}

export async function runProductionQaReadOnlyProcurementProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  let observedCreateOutcome = "NOT_ATTEMPTED"
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-read-only-procurement-${plan.runId}`,
    execute: async ({ caller, cooperativeRole }) =>
      executeProductionQaNegativeJourneys({
        adapter: createProductionQaReadOnlyProcurementAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller: caller.mobile.member.procurement,
          cooperativeRole,
          onCreateOutcome: (outcome) => {
            observedCreateOutcome = outcome
          },
          qaDomain: plan.qaDomain,
        }),
        journeyKeys: [JOURNEY],
        plan,
      }),
    plan,
    role: "member",
    scenarioKey: "enterprise-stale",
    testerLabel: `Ticket 30 read-only Procurement ${plan.runId}`,
  })

  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
    observedCreateOutcome,
  }
}
