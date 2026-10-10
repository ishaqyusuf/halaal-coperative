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
import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const JOURNEY = "member-capacity-limit"

type MemberDirectory = RouterOutputs["mobile"]["admin"]["members"]["list"]
type MemberCreateInput = RouterInputs["mobile"]["admin"]["members"]["create"]

export type ProductionQaMemberCapacityCaller = {
  create: (input: MemberCreateInput) => Promise<unknown>
  list: () => Promise<MemberDirectory>
}

function memberNumber(qaDomain: string) {
  return `CAP-${createHash("sha256")
    .update(`ticket-30:starter-capacity:v1:${qaDomain}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase()}`
}

function isAtCapacity(directory: MemberDirectory) {
  const expansion = directory.memberExpansion
  return (
    expansion.status === "at_capacity" &&
    expansion.activeMemberLimit !== null &&
    expansion.activeMemberCount >= expansion.activeMemberLimit
  )
}

function fingerprint(directory: MemberDirectory) {
  return JSON.stringify({
    activeMemberCount: directory.memberExpansion.activeMemberCount,
    ids: directory.members.map(({ id }) => id).sort(),
    total: directory.total,
  })
}

export function createProductionQaMemberCapacityAdapter(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  caller: ProductionQaMemberCapacityCaller
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
      if (journey.key !== JOURNEY || input.cooperativeRole !== "tenant_admin") {
        return { status: "failed", code: "AUTHORIZATION_REQUIRED" }
      }

      if (step.surface === "android") {
        if (!rejectionVerified) {
          return { status: "failed", code: "ASSERTION_FAILED" }
        }
        return input.androidCheckpoint
          ? input.androidCheckpoint()
          : { status: "blocked", code: "ANDROID_CHECKPOINT_UNAVAILABLE" }
      }

      if (step.contract !== "mobile.admin.members.create") {
        return { status: "blocked", code: "TRANSPORT_UNAVAILABLE" }
      }

      const before = await input.caller.list()
      const beforeFingerprint = fingerprint(before)
      if (!isAtCapacity(before)) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      try {
        await input.caller.create({
          fullName: "Capacity rejection proof",
          joinedAt: new Date().toISOString(),
          memberNumber: memberNumber(input.qaDomain),
          memberType: "individual",
        })
        input.onCreateOutcome?.("SUCCESS")
        return { status: "failed", code: "OUTCOME_MISMATCH" }
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "UNKNOWN"
        input.onCreateOutcome?.(code)
        if (!(error instanceof TRPCError) || code !== "FORBIDDEN") {
          return { status: "failed", code: "OUTCOME_MISMATCH" }
        }
      }

      const after = await input.caller.list()
      if (!isAtCapacity(after) || fingerprint(after) !== beforeFingerprint) {
        return { status: "failed", code: "ASSERTION_FAILED" }
      }

      rejectionVerified = true
      return { status: "observed", observedOutcome: "PERMISSION_DENIED" }
    },
  }
}

export async function runProductionQaMemberCapacityProof(input: {
  androidCheckpoint?: () => Promise<ProductionQaNegativeStepAdapterResult>
  environment: string
  qaDomain: string
  runId: string
}) {
  const plan = createProductionQaHarnessPlan(input)
  let observedCreateOutcome = "NOT_ATTEMPTED"
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-member-capacity-${plan.runId}`,
    execute: async ({ caller, cooperativeRole }) =>
      executeProductionQaNegativeJourneys({
        adapter: createProductionQaMemberCapacityAdapter({
          androidCheckpoint: input.androidCheckpoint,
          caller: caller.mobile.admin.members,
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
    role: "tenant_admin",
    scenarioKey: "starter-capacity",
    testerLabel: `Ticket 30 member capacity ${plan.runId}`,
  })

  return {
    cleanup: session.cleanup,
    complete:
      session.result.journeys[0]?.status === "passed" &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
    observedCreateOutcome,
    receipt: session.result,
    report: createProductionQaNegativeJourneyExecutionReport(session.result),
  }
}
