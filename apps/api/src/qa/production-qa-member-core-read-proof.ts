import {
  createProductionQaHarnessPlan,
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaJourneyExecutionAdapter,
  type ProductionQaStepAdapterResult,
} from "@halaalvest/domain"

import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const MEMBER_CORE_READ_JOURNEY = "member-core-reads"

type ProductionQaMemberCoreCaller = {
  mobile: {
    member: {
      commitments: () => Promise<unknown>
      home: () => Promise<unknown>
      shares: { list: () => Promise<unknown> }
      statement: () => Promise<unknown>
    }
  }
}

export function createProductionQaMemberCoreReadAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaStepAdapterResult>
  caller: ProductionQaMemberCoreCaller
}): ProductionQaJourneyExecutionAdapter {
  return {
    executeStep: async ({ step }) => {
      if (step.surface === "android") {
        return input.androidCheckpoint
          ? input.androidCheckpoint()
          : {
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
              status: "blocked",
            }
      }

      switch (step.contract) {
        case "mobile.member.home":
          await input.caller.mobile.member.home()
          break
        case "mobile.member.commitments":
          await input.caller.mobile.member.commitments()
          break
        case "mobile.member.shares.list":
          await input.caller.mobile.member.shares.list()
          break
        case "mobile.member.statement":
          await input.caller.mobile.member.statement()
          break
        default:
          return { code: "FIXTURE_MISSING", status: "blocked" }
      }

      return { status: "passed" }
    },
  }
}

export async function runProductionQaMemberCoreReadProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan({
    environment: input.environment,
    qaDomain: input.qaDomain,
    runId: input.runId,
  })
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-member-core-${plan.runId}`,
    execute: async ({ caller }) => {
      return executeProductionQaPositiveJourneys({
        adapter: createProductionQaMemberCoreReadAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller,
        }),
        journeyKeys: [MEMBER_CORE_READ_JOURNEY],
        plan,
      })
    },
    plan,
    role: "member",
    scenarioKey: "starter-healthy",
    testerLabel: `Ticket 30 member core read proof ${plan.runId}`,
  })

  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    receipt: session.result,
    report: createProductionQaJourneyExecutionReport(session.result),
  }
}
