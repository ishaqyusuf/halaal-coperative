import {
  createProductionQaHarnessPlan,
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaJourneyExecutionAdapter,
  type ProductionQaStepAdapterResult,
} from "@halaalvest/domain"

import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

const WORKSPACE_ROLE_SWITCH_JOURNEY = "workspace-role-switch"

type AvailableRole = {
  id: string
  role: string
  workspaceRole: string
}

type RoleSwitchProfile = {
  activeMembershipId: string
  cooperativeRole: string | null
  role: string
  token: string
}

type ProductionQaRoleSwitchCaller = {
  auth: {
    mobile: {
      me: () => Promise<{ profile: RoleSwitchProfile }>
      switchRole: (input: {
        membershipId: string
      }) => Promise<{ profile: RoleSwitchProfile }>
    }
  }
}

type RoleSwitchEvidence = {
  currentRole: "member"
  previousRole: "tenant_admin"
}

export function createProductionQaRoleSwitchAdapter(input: {
  activateReplacementSession: (profile: { token: string }) => Promise<{
    caller: ProductionQaRoleSwitchCaller
    previousSessionRevoked: true
  }>
  androidCheckpoint?: (
    evidence: RoleSwitchEvidence
  ) => Promise<ProductionQaStepAdapterResult>
  availableRoles: AvailableRole[]
  caller: ProductionQaRoleSwitchCaller
}): ProductionQaJourneyExecutionAdapter {
  const memberRole = input.availableRoles.find(
    ({ workspaceRole }) => workspaceRole === "member"
  )
  let activeCaller = input.caller
  let replacementConfirmed = false

  return {
    executeStep: async ({ step }) => {
      if (step.surface === "android") {
        if (!replacementConfirmed) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }
        return input.androidCheckpoint
          ? input.androidCheckpoint({
              currentRole: "member",
              previousRole: "tenant_admin",
            })
          : {
              code: "ANDROID_CHECKPOINT_UNAVAILABLE",
              status: "blocked",
            }
      }

      if (step.contract === "auth.mobile.switchRole") {
        if (!memberRole) {
          return { code: "FIXTURE_MISSING", status: "blocked" }
        }
        const switched = await activeCaller.auth.mobile.switchRole({
          membershipId: memberRole.id,
        })
        const profileIsMember =
          switched.profile.activeMembershipId === memberRole.id &&
          switched.profile.role === "member" &&
          switched.profile.cooperativeRole === "member" &&
          switched.profile.token.length > 0
        if (!profileIsMember) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }

        const replacement = await input.activateReplacementSession(
          switched.profile
        )
        activeCaller = replacement.caller
        replacementConfirmed = replacement.previousSessionRevoked
        return replacementConfirmed
          ? { status: "passed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      if (step.contract === "auth.mobile.me") {
        if (!memberRole || !replacementConfirmed) {
          return { code: "ASSERTION_FAILED", status: "failed" }
        }
        const resumed = await activeCaller.auth.mobile.me()
        const sessionIsMember =
          resumed.profile.activeMembershipId === memberRole.id &&
          resumed.profile.role === "member" &&
          resumed.profile.cooperativeRole === "member"
        return sessionIsMember
          ? { status: "passed" }
          : { code: "ASSERTION_FAILED", status: "failed" }
      }

      return { code: "FIXTURE_MISSING", status: "blocked" }
    },
  }
}

export async function runProductionQaRoleSwitchProof(input: {
  androidCheckpoint?: (
    evidence: RoleSwitchEvidence
  ) => Promise<ProductionQaStepAdapterResult>
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
    deviceId: `ticket-30-role-switch-${plan.runId}`,
    execute: async ({ activateReplacementSession, availableRoles, caller }) =>
      executeProductionQaPositiveJourneys({
        adapter: createProductionQaRoleSwitchAdapter({
          activateReplacementSession,
          androidCheckpoint: input.androidCheckpoint,
          availableRoles,
          caller,
        }),
        journeyKeys: [WORKSPACE_ROLE_SWITCH_JOURNEY],
        plan,
      }),
    plan,
    role: "tenant_admin",
    scenarioKey: "starter-healthy",
    testerLabel: `Ticket 30 workspace role switch proof ${plan.runId}`,
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
