import { countMobileDeviceSessionRevocations, listQaAccessProfiles } from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runProductionQaMemberRoleDenialProof } from "./production-qa-member-role-denial-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidMemberRoleDenialProof(input: {
  environment: string; evidenceDirectory: string; launchUrl: string
  qaDomain: string; runId: string; serial: string
}) {
  const startedAt = new Date()
  const plan = createProductionQaHarnessPlan(input)
  const scenario = plan.scenarios.find(item => item.key === "starter-healthy")
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(item =>
    item.tenant.name === scenario?.name && item.membership.role === "member")
  if (!profile) throw new Error("The exact Starter QA Member profile is missing.")
  await mkdir(input.evidenceDirectory, { recursive: true })
  const driver = new ProductionQaAndroidDriver(input)
  let signedOut = false
  let screenshots: string[] = []
  const authorization = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({ credential, expectedRole: "member", expectedShell: "member",
          identityLabel: profile.user.fullName, qaDomain: plan.qaDomain })
        return await runProductionQaMemberRoleDenialProof({
          ...input,
          androidCheckpoint: async () => {
            screenshots = await driver.captureMemberRoleDenial()
            return { status: "observed", observedOutcome: "PERMISSION_DENIED" }
          },
        })
      } catch {
        // Entry may fail before the domain executor can create a receipt. Keep
        // the ordinary cleanup path and persist a bounded incomplete result;
        // never serialize native command output or private auth errors.
        return null
      } finally {
        try { signedOut = await driver.signOut() } catch { signedOut = false }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android Member role denial ${plan.runId}`,
  })
  const sessions = await countMobileDeviceSessionRevocations({ createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id, userId: profile.user.id })
  const result = {
    ...(authorization.result ?? {
      cleanup: null,
      receipt: null,
      report: "Member role-denial execution did not produce a journey receipt. API cleanup requires independent verification.",
      failureCode: "EXECUTION_INCOMPLETE",
    }),
    android: { signedOut, screenshots: screenshots.map(file => path.basename(file)) },
    androidCleanup: { credentialRevoked: authorization.cleanup.testerCredentialRevoked, ...sessions },
    complete: Boolean(authorization.result?.complete) && signedOut && screenshots.length === 2 &&
      authorization.cleanup.testerCredentialRevoked && sessions.sessionCount >= 2 &&
      sessions.sessionCount === sessions.revokedSessionCount,
    startedAt: startedAt.toISOString(), completedAt: new Date().toISOString(),
  }
  await writeFile(path.join(input.evidenceDirectory, "receipt.json"), JSON.stringify(result, null, 2))
  return result
}
