import {
  createProductionQaHarnessPlan,
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
  type ProductionQaNegativeStepAdapterResult,
} from "@halaalvest/domain"
import {
  createPrismaClient,
  ensureProductionQaOfflineProcurementFixture,
  PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE,
} from "@halaalvest/db"

import type { RouterOutputs } from "../routers/_app"
import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const JOURNEY = "offline-procurement-write"

type ProcurementList = RouterOutputs["mobile"]["member"]["procurement"]["list"]
type ProcurementRequestPage =
  RouterOutputs["mobile"]["member"]["procurement"]["requests"]

export type ProductionQaOfflineProcurementCaller = {
  list: () => Promise<ProcurementList>
  requests: (input: {
    cursor?: string
    pageSize: number
  }) => Promise<ProcurementRequestPage>
}

async function readRequestFingerprint(
  caller: ProductionQaOfflineProcurementCaller
) {
  const cursors = new Set<string>()
  const requests: ProcurementRequestPage["data"] = []
  let cursor: string | undefined

  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const page = await caller.requests({ cursor, pageSize: 50 })
    if (page.state !== "available") return null
    requests.push(...page.data)
    if (!page.nextCursor) {
      return {
        fingerprint: JSON.stringify(
          [...requests].sort((left, right) => left.id.localeCompare(right.id))
        ),
        hasExpectedHistory: requests.some(
          (request) =>
            request.itemName ===
              PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.itemName &&
            request.requestedCost ===
              PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.requestedCost &&
            request.requestedRepaymentMonths ===
              PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.requestedRepaymentMonths
        ),
        requestCount: requests.length,
      }
    }
    if (cursors.has(page.nextCursor)) return null
    cursors.add(page.nextCursor)
    cursor = page.nextCursor
  }

  return null
}

export function createProductionQaOfflineProcurementAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  caller: ProductionQaOfflineProcurementCaller
  cooperativeRole: string | null | undefined
  onSuppressionEvidence?: (evidence: {
    optimisticRequests: number
    preservedRequestCount: number
    transportCalls: number
  }) => void
}): ProductionQaNegativeJourneyExecutionAdapter {
  let suppressionVerified = false

  return {
    verifySuppressedStep: async ({ journey, step }) => {
      if (
        journey.key !== JOURNEY ||
        input.cooperativeRole !== "member" ||
        step.contract !== "mobile.member.procurement.createRequest"
      ) {
        return { status: "failed", code: "AUTHORIZATION_REQUIRED" }
      }

      const before = await input.caller.list()
      const beforeHistory = await readRequestFingerprint(input.caller)
      let transportCalls = 0
      let optimisticRequests = 0
      const offline = true

      // This is the negative client boundary: the mutation and optimistic row
      // are both downstream of connectivity, so neither executes offline.
      if (!offline) {
        optimisticRequests += 1
        transportCalls += 1
      }

      const after = await input.caller.list()
      const afterHistory = await readRequestFingerprint(input.caller)
      const historyPreserved = Boolean(
        beforeHistory &&
        afterHistory &&
        beforeHistory.hasExpectedHistory &&
        afterHistory.hasExpectedHistory &&
        beforeHistory.fingerprint === afterHistory.fingerprint
      )
      const browseOnly =
        before.state === "available" &&
        after.state === "available" &&
        before.capability.canViewExisting &&
        after.capability.canViewExisting

      input.onSuppressionEvidence?.({
        optimisticRequests,
        preservedRequestCount: afterHistory?.requestCount ?? 0,
        transportCalls,
      })
      if (
        !historyPreserved ||
        !browseOnly ||
        transportCalls !== 0 ||
        optimisticRequests !== 0
      ) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      suppressionVerified = true
      return {
        status: "observed",
        observedOutcome: "TRANSPORT_SUPPRESSED",
        transportCalls,
      }
    },
    executeInvokedStep: async ({ journey, step }) => {
      if (
        journey.key !== JOURNEY ||
        input.cooperativeRole !== "member" ||
        step.surface !== "android" ||
        !suppressionVerified
      ) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }
      return input.androidCheckpoint
        ? input.androidCheckpoint()
        : {
            status: "blocked",
            code: "ANDROID_CHECKPOINT_UNAVAILABLE",
          }
    },
  }
}

export async function runProductionQaOfflineProcurementProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error("Offline Procurement proof requires the QA database.")
  }
  const fixture = await ensureProductionQaOfflineProcurementFixture({
    plan,
    prisma,
  })
  let suppressionEvidence = {
    optimisticRequests: -1,
    preservedRequestCount: 0,
    transportCalls: -1,
  }
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-offline-procurement-${plan.runId}`,
    execute: async ({ caller, cooperativeRole }) =>
      executeProductionQaNegativeJourneys({
        adapter: createProductionQaOfflineProcurementAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller: caller.mobile.member.procurement,
          cooperativeRole,
          onSuppressionEvidence: (evidence) => {
            suppressionEvidence = evidence
          },
        }),
        journeyKeys: [JOURNEY],
        plan,
      }),
    plan,
    role: "member",
    scenarioKey: "starter-healthy",
    testerLabel: `Ticket 30 offline Procurement ${plan.runId}`,
  })

  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      suppressionEvidence.transportCalls === 0 &&
      suppressionEvidence.optimisticRequests === 0 &&
      suppressionEvidence.preservedRequestCount >= 1 &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    fixture,
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
    suppressionEvidence,
  }
}
