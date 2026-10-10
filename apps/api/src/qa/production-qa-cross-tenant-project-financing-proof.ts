import {
  createProductionQaHarnessPlan,
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
  type ProductionQaNegativeStepAdapterResult,
} from "@halaalvest/domain"
import {
  createPrismaClient,
  ensureProductionQaForeignProjectFinancingFixture,
  ensureProductionQaLocalProjectFinancingFixture,
  PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"

import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const JOURNEY = "cross-tenant-project-financing-detail"
const LANES = ["needs_action", "active", "closed"] as const

type ProjectFinancingWorkspace = {
  attention: Array<{ id: string }>
  nextCursor: string | null
  projects: Array<{
    businessName: string
    id: string
    status: string
    updatedAt: string
  }>
  summary: {
    blockedCount: number
    closedCount: number
    outstandingPrincipal: number
    readyCount: number
    totalProjects: number
  }
  total: number
}

export type ProductionQaCrossTenantProjectFinancingCaller = {
  detail: (input: { projectFinancingRequestId: string }) => Promise<unknown>
  workspace: (input: {
    cursor?: string
    lane: (typeof LANES)[number]
    search?: string
  }) => Promise<ProjectFinancingWorkspace>
}

async function readWorkspaceFingerprint(input: {
  caller: ProductionQaCrossTenantProjectFinancingCaller
  foreignRequestId: string
}) {
  const projects: ProjectFinancingWorkspace["projects"] = []
  const lanes: Array<{
    lane: (typeof LANES)[number]
    summary: ProjectFinancingWorkspace["summary"]
    total: number
  }> = []
  let hasLocalFixture = false

  for (const lane of LANES) {
    const cursors = new Set<string>()
    let cursor: string | undefined

    for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
      const page = await input.caller.workspace({ cursor, lane })
      if (pageNumber === 0) {
        lanes.push({ lane, summary: page.summary, total: page.total })
      }
      if (
        page.projects.some(
          ({ businessName }) =>
            businessName ===
            PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE.businessName
        )
      ) {
        hasLocalFixture = true
      }
      if (
        page.projects.some(({ id }) => id === input.foreignRequestId) ||
        page.attention.some(({ id }) => id === input.foreignRequestId)
      ) {
        return null
      }
      projects.push(...page.projects)
      if (!page.nextCursor) break
      if (cursors.has(page.nextCursor)) return null
      cursors.add(page.nextCursor)
      cursor = page.nextCursor
      if (pageNumber === 19) return null
    }
  }

  return {
    fingerprint: JSON.stringify({
      lanes,
      projects: projects
        .map(({ id, status, updatedAt }) => ({ id, status, updatedAt }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    }),
    hasLocalFixture,
    projectCount: projects.length,
  }
}

export function createProductionQaCrossTenantProjectFinancingAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  caller: ProductionQaCrossTenantProjectFinancingCaller
  cooperativeRole: string | null | undefined
  foreignRequestId: string
  onDenialEvidence?: (evidence: {
    observedOutcome: string
    preservedProjectCount: number
  }) => void
}): ProductionQaNegativeJourneyExecutionAdapter {
  let denialVerified = false

  return {
    verifySuppressedStep: async () => ({
      status: "blocked",
      code: "TRANSPORT_UNAVAILABLE",
    }),
    executeInvokedStep: async ({ journey, step }) => {
      if (
        journey.key !== JOURNEY ||
        input.cooperativeRole !== "finance_officer"
      ) {
        return { status: "failed", code: "AUTHORIZATION_REQUIRED" }
      }

      if (step.surface === "android") {
        if (!denialVerified) {
          return { status: "failed", code: "ASSERTION_FAILED" }
        }
        return input.androidCheckpoint
          ? input.androidCheckpoint()
          : {
              status: "blocked",
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
            }
      }

      if (step.contract !== "mobile.admin.projectFinancingOperations.detail") {
        return { status: "blocked", code: "TRANSPORT_UNAVAILABLE" }
      }

      const before = await readWorkspaceFingerprint(input)
      if (!before?.hasLocalFixture) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      let observedOutcome = "SUCCESS"
      try {
        await input.caller.detail({
          projectFinancingRequestId: input.foreignRequestId,
        })
        input.onDenialEvidence?.({
          observedOutcome,
          preservedProjectCount: before.projectCount,
        })
        return { status: "failed", code: "OUTCOME_MISMATCH" }
      } catch (error) {
        observedOutcome =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "UNKNOWN"
        if (!(error instanceof TRPCError) || observedOutcome !== "NOT_FOUND") {
          input.onDenialEvidence?.({
            observedOutcome,
            preservedProjectCount: before.projectCount,
          })
          return { status: "failed", code: "OUTCOME_MISMATCH" }
        }
      }

      const after = await readWorkspaceFingerprint(input)
      if (!after?.hasLocalFixture || after.fingerprint !== before.fingerprint) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      denialVerified = true
      input.onDenialEvidence?.({
        observedOutcome,
        preservedProjectCount: after.projectCount,
      })
      return { status: "observed", observedOutcome: "NOT_FOUND" }
    },
  }
}

export async function runProductionQaCrossTenantProjectFinancingProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Cross-tenant project-financing proof requires the QA database."
    )
  }
  const [foreignFixture, localFixture] = await Promise.all([
    ensureProductionQaForeignProjectFinancingFixture({ plan, prisma }),
    ensureProductionQaLocalProjectFinancingFixture({ plan, prisma }),
  ])
  let denialEvidence = {
    observedOutcome: "NOT_ATTEMPTED",
    preservedProjectCount: 0,
  }
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-cross-tenant-project-financing-${plan.runId}`,
    execute: async ({ caller, cooperativeRole }) =>
      executeProductionQaNegativeJourneys({
        adapter: createProductionQaCrossTenantProjectFinancingAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller: caller.mobile.admin.projectFinancingOperations,
          cooperativeRole,
          foreignRequestId: foreignFixture.recordId,
          onDenialEvidence: (evidence) => {
            denialEvidence = evidence
          },
        }),
        journeyKeys: [JOURNEY],
        plan,
      }),
    plan,
    role: "finance_officer",
    scenarioKey: "standard-review",
    testerLabel: `Ticket 30 cross-tenant project financing ${plan.runId}`,
  })

  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      denialEvidence.observedOutcome === "NOT_FOUND" &&
      denialEvidence.preservedProjectCount >= 1 &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    denialEvidence,
    fixtures: { foreign: foreignFixture, local: localFixture },
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
  }
}
