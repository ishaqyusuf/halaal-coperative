import {
  createProductionQaPositiveJourneyPlan,
  PRODUCTION_QA_JOURNEY_CONTRACT_VERSION,
  type ProductionQaJourneyPlanItem,
  type ProductionQaJourneyStep,
} from "./production-qa-journeys"
import type { ProductionQaHarnessPlan } from "./production-qa-harness"

export const PRODUCTION_QA_EXECUTION_CODES = [
  "ASSERTION_FAILED",
  "AUTHORIZATION_REQUIRED",
  "FIXTURE_MISSING",
  "TRANSPORT_UNAVAILABLE",
  "ANDROID_CHECKPOINT_UNAVAILABLE",
] as const

export type ProductionQaExecutionCode =
  (typeof PRODUCTION_QA_EXECUTION_CODES)[number]

export type ProductionQaStepAdapterResult =
  | { status: "passed" }
  | {
      code: ProductionQaExecutionCode
      status: "blocked" | "failed"
    }

export type ProductionQaJourneyExecutionAdapter = {
  executeStep: (input: {
    journey: ProductionQaJourneyPlanItem
    step: ProductionQaJourneyStep
    stepIndex: number
  }) => Promise<ProductionQaStepAdapterResult>
}

export type ProductionQaStepExecutionReceipt = {
  code?: ProductionQaExecutionCode
  contract: string
  key: string
  status: "blocked" | "failed" | "passed" | "skipped"
  surface: ProductionQaJourneyStep["surface"]
}

export type ProductionQaJourneyExecutionReceipt = {
  key: string
  productArea: ProductionQaJourneyPlanItem["productArea"]
  role: ProductionQaJourneyPlanItem["role"]
  scenarioKey: string
  status: "blocked" | "failed" | "passed"
  steps: ProductionQaStepExecutionReceipt[]
}

export type ProductionQaExecutionReceipt = {
  completedAt: string
  contractVersion: number
  environment: ProductionQaHarnessPlan["environment"]
  harnessContractVersion: number
  journeys: ProductionQaJourneyExecutionReceipt[]
  runId: string
  startedAt: string
  summary: {
    blockedJourneys: number
    failedJourneys: number
    passedJourneys: number
    passedSteps: number
    skippedSteps: number
    totalJourneys: number
    totalSteps: number
  }
}

function resolveSelectedJourneys(input: {
  journeyKeys?: readonly string[]
  plan: ProductionQaHarnessPlan
}) {
  const available = createProductionQaPositiveJourneyPlan(input.plan)
  if (!input.journeyKeys) return available

  const selected = new Set<string>()
  const availableByKey = new Map(
    available.map((journey) => [journey.key, journey])
  )

  return input.journeyKeys.map((key) => {
    if (selected.has(key)) {
      throw new Error(`Duplicate production QA journey selection: ${key}.`)
    }
    selected.add(key)

    const journey = availableByKey.get(key)
    if (!journey) {
      throw new Error(`Unknown production QA journey: ${key}.`)
    }
    return journey
  })
}

async function executeJourney(input: {
  adapter: ProductionQaJourneyExecutionAdapter
  journey: ProductionQaJourneyPlanItem
}): Promise<ProductionQaJourneyExecutionReceipt> {
  const steps: ProductionQaStepExecutionReceipt[] = []
  let terminalStatus: "blocked" | "failed" | null = null

  for (const [stepIndex, step] of input.journey.steps.entries()) {
    if (terminalStatus) {
      steps.push({
        contract: step.contract,
        key: step.key,
        status: "skipped",
        surface: step.surface,
      })
      continue
    }

    let result: ProductionQaStepAdapterResult
    try {
      result = await input.adapter.executeStep({
        journey: input.journey,
        step,
        stepIndex,
      })
    } catch {
      result = { code: "TRANSPORT_UNAVAILABLE", status: "failed" }
    }

    if (result.status === "passed") {
      steps.push({
        contract: step.contract,
        key: step.key,
        status: "passed",
        surface: step.surface,
      })
      continue
    }

    terminalStatus = result.status
    steps.push({
      code: result.code,
      contract: step.contract,
      key: step.key,
      status: result.status,
      surface: step.surface,
    })
  }

  return {
    key: input.journey.key,
    productArea: input.journey.productArea,
    role: input.journey.role,
    scenarioKey: input.journey.scenarioKey,
    status: terminalStatus ?? "passed",
    steps,
  }
}

export async function executeProductionQaPositiveJourneys(input: {
  adapter: ProductionQaJourneyExecutionAdapter
  journeyKeys?: readonly string[]
  now?: () => Date
  plan: ProductionQaHarnessPlan
}): Promise<ProductionQaExecutionReceipt> {
  const journeys = resolveSelectedJourneys(input)
  const now = input.now ?? (() => new Date())
  const startedAt = now().toISOString()
  const results: ProductionQaJourneyExecutionReceipt[] = []

  for (const journey of journeys) {
    results.push(await executeJourney({ adapter: input.adapter, journey }))
  }

  const steps = results.flatMap((journey) => journey.steps)
  return {
    completedAt: now().toISOString(),
    contractVersion: PRODUCTION_QA_JOURNEY_CONTRACT_VERSION,
    environment: input.plan.environment,
    harnessContractVersion: input.plan.contractVersion,
    journeys: results,
    runId: input.plan.runId,
    startedAt,
    summary: {
      blockedJourneys: results.filter(({ status }) => status === "blocked")
        .length,
      failedJourneys: results.filter(({ status }) => status === "failed")
        .length,
      passedJourneys: results.filter(({ status }) => status === "passed")
        .length,
      passedSteps: steps.filter(({ status }) => status === "passed").length,
      skippedSteps: steps.filter(({ status }) => status === "skipped").length,
      totalJourneys: results.length,
      totalSteps: steps.length,
    },
  }
}

export function createProductionQaJourneyExecutionReport(
  receipt: ProductionQaExecutionReceipt
) {
  const lines = [
    "# Production-contract journey execution",
    "",
    `- Contract: v${receipt.contractVersion}`,
    `- Harness contract: v${receipt.harnessContractVersion}`,
    `- Environment: ${receipt.environment}`,
    `- Run: ${receipt.runId}`,
    `- Started: ${receipt.startedAt}`,
    `- Completed: ${receipt.completedAt}`,
    `- Total journeys: ${receipt.summary.totalJourneys}`,
    `- Passed journeys: ${receipt.summary.passedJourneys}`,
    `- Failed journeys: ${receipt.summary.failedJourneys}`,
    `- Blocked journeys: ${receipt.summary.blockedJourneys}`,
    "",
    "| Journey | Area | Status | Passed steps | Skipped steps | Terminal code |",
    "| --- | --- | --- | ---: | ---: | --- |",
  ]

  for (const journey of receipt.journeys) {
    const terminalCode = journey.steps.find(
      ({ status }) => status === "blocked" || status === "failed"
    )?.code
    lines.push(
      `| ${journey.key} | ${journey.productArea} | ${journey.status} | ${journey.steps.filter(({ status }) => status === "passed").length} | ${journey.steps.filter(({ status }) => status === "skipped").length} | ${terminalCode ?? "none"} |`
    )
  }

  lines.push(
    "",
    "The report contains bounded contract outcomes only. Private account, challenge, tester, session, provider, notification, and command material is omitted."
  )

  return lines.join("\n")
}
