import { inspectProductionQaInvitationProof } from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"

import { runWithProductionQaMobileSession } from "./production-qa-mobile-session"

function invitationEmail(runId: string, qaDomain: string) {
  const localRun = runId.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  return `ticket30-admin-${localRun}@${qaDomain}`
}

export async function runProductionQaInvitationProof(input: {
  confirmed: boolean
  environment: string
  now?: Date
  qaDomain: string
  runId: string
}) {
  if (!input.confirmed) {
    throw new Error(
      "Production QA invitation proof requires explicit confirmation."
    )
  }

  const startedAt = input.now ?? new Date()
  const plan = createProductionQaHarnessPlan({
    environment: input.environment,
    now: startedAt,
    qaDomain: input.qaDomain,
    runId: input.runId,
  })
  const session = await runWithProductionQaMobileSession({
    deviceId: `ticket-30-invitation-${plan.runId}`,
    execute: async ({ caller, cooperativeRole, tenantId }) => {
      const expectedEmail = invitationEmail(plan.runId, plan.qaDomain)
      const invitation = await caller.mobile.admin.access.invite({
        email: expectedEmail,
        fullName: "QA ONLY Ticket 30 Invited Admin",
        makeDefault: true,
        role: "tenant_admin",
      })
      const proof = await inspectProductionQaInvitationProof({
        expectedEmail,
        expectedRole: "tenant_admin",
        membershipId: invitation.id,
        startedAt,
        tenantId,
      })
      const setupUrl = new URL(invitation.setupUrl)
      const setupHandoff = {
        cooperativeNumberMatches:
          setupUrl.searchParams.get("cooperativeNumber") ===
          invitation.cooperativeNumber,
        emailMatches: setupUrl.searchParams.get("email") === expectedEmail,
        routeStatusInvited: invitation.status === "invited",
      }
      const delivery = {
        ...proof.delivery,
        routeStatusMatchesAudit:
          invitation.deliveryStatus === proof.delivery.status,
      }
      const identity = {
        ...proof.identity,
        routeRoleMatches: invitation.role === "tenant_admin",
        sessionRoleMatches: cooperativeRole === "tenant_admin",
      }

      return {
        complete:
          proof.complete &&
          Object.values(setupHandoff).every(Boolean) &&
          delivery.routeStatusMatchesAudit &&
          identity.routeRoleMatches &&
          identity.sessionRoleMatches,
        contractVersion: 1 as const,
        delivery,
        environment: plan.environment,
        identity,
        membershipAuditFound: proof.membershipAuditFound,
        runId: plan.runId,
        setupHandoff,
      }
    },
    plan,
    role: "tenant_admin",
    scenarioKey: "starter-healthy",
    testerLabel: `Ticket 30 invitation proof ${plan.runId}`,
  })

  return {
    ...session.result,
    cleanup: session.cleanup,
    complete:
      session.result.complete &&
      session.cleanup.mobileSessionRevoked &&
      session.cleanup.testerCredentialRevoked,
  }
}
