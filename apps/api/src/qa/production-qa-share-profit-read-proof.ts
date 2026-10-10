import {
  createProductionQaHarnessPlan,
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaJourneyExecutionAdapter,
  type ProductionQaStepAdapterResult,
} from "@halaalvest/domain"

import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const SHARE_PROFIT_READ_JOURNEY = "share-profit-governance-read"

type PublishedPeriod = {
  id: string
  name: string
  status: string
}

type ProductionQaShareProfitCaller = {
  mobile: {
    admin: {
      shareProfitGovernance: {
        profitDetail: (input: { dividendPeriodId: string }) => Promise<{
          period: PublishedPeriod
          periodAllocations: unknown[]
          profitEntries: { status: string }[]
        }>
        workspace: (input: { book: "profit" }) => Promise<{
          profit: object | null
        }>
      }
    }
  }
}

export function createProductionQaShareProfitReadAdapter(input: {
  androidCheckpoint?: (evidence: {
    periodName: string
  }) => Promise<ProductionQaStepAdapterResult>
  caller: ProductionQaShareProfitCaller
}): ProductionQaJourneyExecutionAdapter {
  let publishedPeriod: PublishedPeriod | null = null

  return {
    executeStep: async ({ step }) => {
      if (step.surface === "android") {
        if (!publishedPeriod) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }
        return input.androidCheckpoint
          ? input.androidCheckpoint({ periodName: publishedPeriod.name })
          : {
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
              status: "blocked",
            }
      }

      if (step.contract === "mobile.admin.shareProfitGovernance.workspace") {
        const workspace =
          await input.caller.mobile.admin.shareProfitGovernance.workspace({
            book: "profit",
          })
        const periods =
          workspace.profit &&
          "periods" in workspace.profit &&
          Array.isArray(workspace.profit.periods)
            ? (workspace.profit.periods as PublishedPeriod[])
            : []
        publishedPeriod =
          periods.find((period) => period.status === "published") ?? null
        return publishedPeriod
          ? { status: "passed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      if (step.contract === "mobile.admin.shareProfitGovernance.profitDetail") {
        if (!publishedPeriod) {
          return { code: "FIXTURE_MISSING", status: "blocked" }
        }
        const detail =
          await input.caller.mobile.admin.shareProfitGovernance.profitDetail({
            dividendPeriodId: publishedPeriod.id,
          })
        const reconciled =
          detail.period.id === publishedPeriod.id &&
          detail.period.status === "published" &&
          detail.periodAllocations.length > 0 &&
          detail.profitEntries.some((entry) => entry.status === "completed")
        return reconciled
          ? { status: "passed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      return { code: "FIXTURE_MISSING", status: "blocked" }
    },
  }
}

export async function runProductionQaShareProfitReadProof(input: {
  androidCheckpoint?: (evidence: {
    periodName: string
  }) => Promise<ProductionQaStepAdapterResult>
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
    deviceId: `ticket-30-share-profit-${plan.runId}`,
    execute: async ({ caller }) =>
      executeProductionQaPositiveJourneys({
        adapter: createProductionQaShareProfitReadAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller,
        }),
        journeyKeys: [SHARE_PROFIT_READ_JOURNEY],
        plan,
      }),
    plan,
    role: "tenant_admin",
    scenarioKey: "enterprise-profit",
    testerLabel: `Ticket 30 share profit read proof ${plan.runId}`,
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
