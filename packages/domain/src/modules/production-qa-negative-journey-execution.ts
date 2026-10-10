import type { ProductionQaHarnessPlan } from "./production-qa-harness"
import {
  createProductionQaNegativeJourneyPlan,
  PRODUCTION_QA_NEGATIVE_JOURNEY_CONTRACT_VERSION,
  type ProductionQaNegativeExpectation,
  type ProductionQaNegativeJourneyPlanItem,
  type ProductionQaNegativeJourneyStep,
} from "./production-qa-negative-journeys"

export const PRODUCTION_QA_NEGATIVE_EXECUTION_CODES = [
  "ASSERTION_FAILED",
  "AUTHORIZATION_REQUIRED",
  "FIXTURE_MISSING",
  "TRANSPORT_UNAVAILABLE",
  "ANDROID_CHECKPOINT_UNAVAILABLE",
  "OUTCOME_MISMATCH",
  "TRANSPORT_WAS_CALLED",
] as const

export type ProductionQaNegativeExecutionCode =
  (typeof PRODUCTION_QA_NEGATIVE_EXECUTION_CODES)[number]

export type ProductionQaNegativeStepAdapterResult =
  | {
      observedOutcome: ProductionQaNegativeExpectation
      status: "observed"
    }
  | {
      code: ProductionQaNegativeExecutionCode
      status: "blocked" | "failed"
    }

export type ProductionQaSuppressedStepAdapterResult =
  | {
      observedOutcome: "TRANSPORT_SUPPRESSED"
      status: "observed"
      transportCalls: number
    }
  | {
      code: ProductionQaNegativeExecutionCode
      status: "blocked" | "failed"
    }

type ProductionQaNegativeAdapterInput = {
  journey: ProductionQaNegativeJourneyPlanItem
  step: ProductionQaNegativeJourneyStep
  stepIndex: number
}

export type ProductionQaNegativeJourneyExecutionAdapter = {
  executeInvokedStep: (
    input: ProductionQaNegativeAdapterInput
  ) => Promise<ProductionQaNegativeStepAdapterResult>
  verifySuppressedStep: (
    input: ProductionQaNegativeAdapterInput
  ) => Promise<ProductionQaSuppressedStepAdapterResult>
}

export type ProductionQaNegativeStepExecutionReceipt = {
  code?: ProductionQaNegativeExecutionCode
  contract: string
  expectedOutcome: ProductionQaNegativeExpectation
  invocation: ProductionQaNegativeJourneyStep["invocation"]
  key: string
  observedOutcome?: ProductionQaNegativeExpectation
  status: "blocked" | "failed" | "passed" | "skipped"
  surface: ProductionQaNegativeJourneyStep["surface"]
}

export type ProductionQaNegativeJourneyExecutionReceipt = {
  category: ProductionQaNegativeJourneyPlanItem["category"]
  key: string
  role: ProductionQaNegativeJourneyPlanItem["role"]
  scenarioKey: string
  status: "blocked" | "failed" | "passed"
  steps: ProductionQaNegativeStepExecutionReceipt[]
}

export type ProductionQaNegativeExecutionReceipt = {
  completedAt: string
  contractVersion: number
  environment: ProductionQaHarnessPlan["environment"]
  harnessContractVersion: number
  journeys: ProductionQaNegativeJourneyExecutionReceipt[]
  runId: string
  startedAt: string
  summary: {
    blockedJourneys: number
    failedJourneys: number
    passedJourneys: number
    passedSteps: number
    skippedSteps: number
    suppressedSteps: number
    totalJourneys: number
    totalSteps: number
  }
}

function resolveSelectedJourneys(input: {
  journeyKeys?: readonly string[]
  plan: ProductionQaHarnessPlan
}) {
  const available = createProductionQaNegativeJourneyPlan(input.plan)
  if (!input.journeyKeys) return available

  const selected = new Set<string>()
  const availableByKey = new Map(
    available.map((journey) => [journey.key, journey])
  )

  return input.journeyKeys.map((key) => {
    if (selected.has(key)) {
      throw new Error(
        `Duplicate production QA negative journey selection: ${key}.`
      )
    }
    selected.add(key)

    const journey = availableByKey.get(key)
    if (!journey) {
      throw new Error(`Unknown production QA negative journey: ${key}.`)
    }
    return journey
  })
}

function skippedReceipt(
  step: ProductionQaNegativeJourneyStep
): ProductionQaNegativeStepExecutionReceipt {
  return {
    contract: step.contract,
    expectedOutcome: step.expectation,
    invocation: step.invocation,
    key: step.key,
    status: "skipped",
    surface: step.surface,
  }
}

async function executeJourney(input: {
  adapter: ProductionQaNegativeJourneyExecutionAdapter
  journey: ProductionQaNegativeJourneyPlanItem
}): Promise<ProductionQaNegativeJourneyExecutionReceipt> {
  const steps: ProductionQaNegativeStepExecutionReceipt[] = []
  let terminalStatus: "blocked" | "failed" | null = null

  for (const [stepIndex, step] of input.journey.steps.entries()) {
    if (terminalStatus) {
      steps.push(skippedReceipt(step))
      continue
    }

    let result: ProductionQaNegativeStepAdapterResult
    let transportCalls: number | undefined
    try {
      if (step.invocation === "suppress") {
        const suppression = await input.adapter.verifySuppressedStep({
          journey: input.journey,
          step,
          stepIndex,
        })
        if (suppression.status === "observed") {
          transportCalls = suppression.transportCalls
        }
        result = suppression
      } else {
        result = await input.adapter.executeInvokedStep({
          journey: input.journey,
          step,
          stepIndex,
        })
      }
    } catch {
      result = {
        code:
          step.invocation === "suppress"
            ? "ASSERTION_FAILED"
            : step.surface === "android"
              ? "ANDROID_CHECKPOINT_UNAVAILABLE"
              : "TRANSPORT_UNAVAILABLE",
        status: "failed",
      }
    }

    if (result.status === "observed") {
      const code =
        transportCalls !== undefined && transportCalls !== 0
          ? "TRANSPORT_WAS_CALLED"
          : result.observedOutcome !== step.expectation
            ? "OUTCOME_MISMATCH"
            : null

      if (!code) {
        steps.push({
          contract: step.contract,
          expectedOutcome: step.expectation,
          invocation: step.invocation,
          key: step.key,
          observedOutcome: result.observedOutcome,
          status: "passed",
          surface: step.surface,
        })
        continue
      }

      terminalStatus = "failed"
      steps.push({
        code,
        contract: step.contract,
        expectedOutcome: step.expectation,
        invocation: step.invocation,
        key: step.key,
        observedOutcome: result.observedOutcome,
        status: "failed",
        surface: step.surface,
      })
      continue
    }

    terminalStatus = result.status
    steps.push({
      code: result.code,
      contract: step.contract,
      expectedOutcome: step.expectation,
      invocation: step.invocation,
      key: step.key,
      status: result.status,
      surface: step.surface,
    })
  }

  return {
    category: input.journey.category,
    key: input.journey.key,
    role: input.journey.role,
    scenarioKey: input.journey.scenarioKey,
    status: terminalStatus ?? "passed",
    steps,
  }
}

export async function executeProductionQaNegativeJourneys(input: {
  adapter: ProductionQaNegativeJourneyExecutionAdapter
  journeyKeys?: readonly string[]
  now?: () => Date
  plan: ProductionQaHarnessPlan
}): Promise<ProductionQaNegativeExecutionReceipt> {
  const journeys = resolveSelectedJourneys(input)
  const now = input.now ?? (() => new Date())
  const startedAt = now().toISOString()
  const results: ProductionQaNegativeJourneyExecutionReceipt[] = []

  for (const journey of journeys) {
    results.push(await executeJourney({ adapter: input.adapter, journey }))
  }

  const steps = results.flatMap((journey) => journey.steps)
  return {
    completedAt: now().toISOString(),
    contractVersion: PRODUCTION_QA_NEGATIVE_JOURNEY_CONTRACT_VERSION,
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
      suppressedSteps: steps.filter(
        ({ invocation, status }) =>
          invocation === "suppress" && status === "passed"
      ).length,
      totalJourneys: results.length,
      totalSteps: steps.length,
    },
  }
}

export function createProductionQaNegativeJourneyExecutionReport(
  receipt: ProductionQaNegativeExecutionReceipt
) {
  const lines = [
    "# Production-contract negative journey execution",
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
    `- Verified suppressed steps: ${receipt.summary.suppressedSteps}`,
    "",
    "| Journey | Category | Status | Passed steps | Skipped steps | Terminal code |",
    "| --- | --- | --- | ---: | ---: | --- |",
  ]

  for (const journey of receipt.journeys) {
    const terminalCode = journey.steps.find(
      ({ status }) => status === "blocked" || status === "failed"
    )?.code
    lines.push(
      `| ${journey.key} | ${journey.category} | ${journey.status} | ${journey.steps.filter(({ status }) => status === "passed").length} | ${journey.steps.filter(({ status }) => status === "skipped").length} | ${terminalCode ?? "none"} |`
    )
  }

  lines.push(
    "",
    "The report contains bounded contract outcomes only. Private execution material is omitted."
  )

  return lines.join("\n")
}
