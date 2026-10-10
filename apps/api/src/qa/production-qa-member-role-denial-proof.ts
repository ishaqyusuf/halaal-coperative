import {
  createProductionQaHarnessPlan,
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
  type ProductionQaNegativeStepAdapterResult,
} from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"
import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const JOURNEY = "member-admin-finance-denial"

export function createProductionQaMemberRoleDenialAdapter(input: {
  cooperativeRole: string | null | undefined
  caller: { mobile: { admin: { finance: { overview: () => Promise<unknown> } } } }
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
}): ProductionQaNegativeJourneyExecutionAdapter {
  let serverDenied = false
  return {
    verifySuppressedStep: async () => ({ status: "blocked", code: "TRANSPORT_UNAVAILABLE" }),
    executeInvokedStep: async ({ journey, step }) => {
      if (journey.key !== JOURNEY || input.cooperativeRole !== "member") {
        return { status: "failed", code: "AUTHORIZATION_REQUIRED" }
      }
      if (step.surface === "android") {
        if (!serverDenied) return { status: "failed", code: "ASSERTION_FAILED" }
        return input.androidCheckpoint ? input.androidCheckpoint() : {
          status: "blocked", code: "ANDROID_CHECKPOINT_UNAVAILABLE",
        }
      }
      if (step.contract !== "mobile.admin.finance.overview") {
        return { status: "blocked", code: "TRANSPORT_UNAVAILABLE" }
      }
      try {
        await input.caller.mobile.admin.finance.overview()
        // A successful response (including an empty queue) is a security failure.
        return { status: "failed", code: "OUTCOME_MISMATCH" }
      } catch (error) {
        if (!(error instanceof TRPCError) || error.code !== "FORBIDDEN") {
          // Network, validation and signed-out failures are not role-denial proof.
          return { status: "failed", code: "OUTCOME_MISMATCH" }
        }
        serverDenied = true
        return { status: "observed", observedOutcome: "PERMISSION_DENIED" }
      }
    },
  }
}

export async function runProductionQaMemberRoleDenialProof(input: {
  environment: string
  qaDomain: string
  runId: string
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
}) {
  const plan = createProductionQaHarnessPlan(input)
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-role-denial-${plan.runId}`,
    execute: async ({ caller, cooperativeRole }) => executeProductionQaNegativeJourneys({
      adapter: createProductionQaMemberRoleDenialAdapter({
        caller, cooperativeRole, androidCheckpoint: input.androidCheckpoint,
      }),
      journeyKeys: [JOURNEY],
      plan,
    }),
    plan,
    role: "member",
    scenarioKey: "starter-healthy",
    testerLabel: `Ticket 30 Member role denial ${plan.runId}`,
  })
  return {
    cleanup: session.cleanup,
    complete: session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked && session.cleanup.testerCredentialRevoked,
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
  }
}
