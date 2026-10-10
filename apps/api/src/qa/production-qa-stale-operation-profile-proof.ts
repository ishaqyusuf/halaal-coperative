import {
  createProductionQaHarnessPlan,
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
  type ProductionQaNegativeStepAdapterResult,
} from "@halaalvest/domain"
import { TRPCError } from "@trpc/server"
import type { RouterInputs } from "../routers/_app"
import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

export type ProductionQaOperationProfileObservation = {
  reviewedAt: string | null
  reviewedByUserId: string | null
  services: readonly { serviceKey: string; accessMode: string }[]
  subscription: { accessEnabled: boolean }
}

type UpdateInput =
  RouterInputs["mobile"]["admin"]["operationProfile"]["updateService"]

export type ProductionQaOperationProfileCaller = {
  overview: () => Promise<ProductionQaOperationProfileObservation>
  updateService: (command: UpdateInput) => Promise<unknown>
}

function governedState(snapshot: ProductionQaOperationProfileObservation) {
  // Only compare durable state; overview.updatedAt is the request timestamp.
  // This private comparison is never included in a persisted proof receipt.
  return JSON.stringify([
    snapshot.reviewedAt,
    snapshot.reviewedByUserId,
    snapshot.services
      .map((service) => [service.serviceKey, service.accessMode])
      .sort(([left], [right]) => (left ?? "").localeCompare(right ?? "")),
  ])
}

export function createProductionQaStaleOperationProfileAdapter(input: {
  cooperativeRole: string | null | undefined
  caller: ProductionQaOperationProfileCaller
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
}): ProductionQaNegativeJourneyExecutionAdapter {
  let conflictVerified = false
  return {
    verifySuppressedStep: async () => ({
      status: "blocked",
      code: "TRANSPORT_UNAVAILABLE",
    }),
    executeInvokedStep: async ({ journey, step }) => {
      if (
        journey.key !== "stale-operation-profile-command" ||
        input.cooperativeRole !== "tenant_admin"
      ) {
        return { status: "failed", code: "AUTHORIZATION_REQUIRED" }
      }
      if (step.surface === "android") {
        if (!conflictVerified)
          return { status: "failed", code: "ASSERTION_FAILED" }
        return input.androidCheckpoint
          ? input.androidCheckpoint()
          : {
              status: "blocked",
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
            }
      }
      if (step.contract !== "mobile.admin.operationProfile.updateService") {
        return { status: "blocked", code: "TRANSPORT_UNAVAILABLE" }
      }
      const before = await input.caller.overview()
      const service = before.services.find(
        (item) => item.serviceKey === "procurement"
      )
      if (
        service?.accessMode !== "read_only" ||
        !before.subscription.accessEnabled
      ) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }
      const previous = governedState(before)
      try {
        await input.caller.updateService({
          serviceKey: "procurement",
          expectedAccessMode: "member_self_service",
          nextAccessMode: "office_only",
          changeReason: "QA ONLY — stale expected-state verification.",
        })
        return { status: "failed", code: "OUTCOME_MISMATCH" }
      } catch (error) {
        if (!(error instanceof TRPCError) || error.code !== "CONFLICT") {
          return { status: "failed", code: "OUTCOME_MISMATCH" }
        }
      }
      const after = await input.caller.overview()
      if (governedState(after) !== previous) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }
      conflictVerified = true
      return { status: "observed", observedOutcome: "CONFLICT" }
    },
  }
}

export async function runProductionQaStaleOperationProfileProof(input: {
  environment: string
  qaDomain: string
  runId: string
  androidCheckpoint?: (context: {
    caller: ProductionQaOperationProfileCaller
  }) => Promise<ProductionQaNegativeStepAdapterResult>
}) {
  const plan = createProductionQaHarnessPlan(input)
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-stale-mode-${plan.runId}`,
    execute: async ({ caller, cooperativeRole }) =>
      executeProductionQaNegativeJourneys({
        adapter: createProductionQaStaleOperationProfileAdapter({
          caller: caller.mobile.admin.operationProfile,
          cooperativeRole,
          androidCheckpoint: input.androidCheckpoint
            ? () =>
                input.androidCheckpoint!({
                  caller: caller.mobile.admin.operationProfile,
                })
            : undefined,
        }),
        journeyKeys: ["stale-operation-profile-command"],
        plan,
      }),
    plan,
    role: "tenant_admin",
    scenarioKey: "enterprise-stale",
    testerLabel: `Ticket 30 stale Operation Profile ${plan.runId}`,
  })
  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
  }
}
