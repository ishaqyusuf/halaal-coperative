import { countMobileDeviceSessionRevocations, listQaAccessProfiles } from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

/** Baseline is deliberately read-only; it cannot claim the submission journey. */
export async function runProductionQaAndroidProcurementBaseline(input: {
  environment: string
  evidenceDirectory: string
  launchUrl: string
  qaDomain: string
  runId: string
  serial: string
  presentationOnly?: boolean
  exerciseInputs?: boolean
  accessibilityMatrix?: boolean
  inspectFooter?: boolean
}) {
  const startedAt = new Date()
  if (input.inspectFooter && (!input.presentationOnly || !input.exerciseInputs)) {
    throw new Error("Footer diagnostics require a presentation-only input audit.")
  }
  // Single-screen audits write measurements before their first screenshot.
  await mkdir(input.evidenceDirectory, { recursive: true })
  const plan = createProductionQaHarnessPlan(input)
  const scenario = plan.scenarios.find(item => item.key === "standard-review")
  const identity = scenario?.identities.find(item => item.role === "member")
  if (!scenario || !identity?.memberNumber) throw new Error("The procurement scenario is missing.")
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(candidate =>
    candidate.tenant.name === scenario.name && candidate.membership.role === "member"
  )
  if (!profile) throw new Error("The procurement Member profile is missing.")
  const driver = new ProductionQaAndroidDriver(input)
  let signedOut = false
  let checkpointPassed = false
  let displayRestored = !input.accessibilityMatrix
  let screenshots: string[] = []
  const authorization = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({
          credential,
          expectedMemberNumber: identity.memberNumber!,
          expectedRole: "member",
          expectedShell: "member",
          identityLabel: profile.user.fullName,
          qaDomain: plan.qaDomain,
        })
        if (input.accessibilityMatrix) {
          if (!input.presentationOnly || !input.exerciseInputs) throw new Error("Matrix requires the presentation-only input audit.")
          for (const display of [
            { theme: "light", fontScale: 1 }, { theme: "dark", fontScale: 1 },
            { theme: "light", fontScale: 2 }, { theme: "dark", fontScale: 2 },
          ] as const) {
            console.log(`Procurement presentation: ${display.theme}/${display.fontScale * 100} started`)
            await driver.prepareWorkspaceDisplay({ ...display, expectedShell: "member" })
            screenshots.push(...await driver.captureProcurementBaseline(true, true, `${display.theme}-${display.fontScale * 100}-`, input.inspectFooter))
            console.log(`Procurement presentation: ${display.theme}/${display.fontScale * 100} checkpoints passed`)
          }
        } else {
          screenshots = await driver.captureProcurementBaseline(input.presentationOnly, input.exerciseInputs, "", input.inspectFooter)
        }
        checkpointPassed = true
      } catch {
        try { screenshots.push(await driver.captureProcurementFailure()) } catch { /* Receipt still records failure. */ }
      } finally {
        if (input.accessibilityMatrix) {
          try { await driver.restoreWorkspaceDisplay("member"); displayRestored = true } catch {
            displayRestored = false
            try { screenshots.push(await driver.captureProcurementFailure()) } catch { /* Keep cleanup failure in receipt even without an image. */ }
          }
        }
        try { signedOut = await driver.signOut() } catch { signedOut = false }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 procurement baseline ${plan.runId}`,
  })
  const sessions = await countMobileDeviceSessionRevocations({
    createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
  const result = {
    mode: input.presentationOnly ? "development-presentation-only" : "baseline-only",
    runId: plan.runId,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    checkpointPassed,
    journeyComplete: false,
    cleanup: {
      signedOut,
      displayRestored,
      credentialRevoked: authorization.cleanup.testerCredentialRevoked,
      sessionCount: sessions.sessionCount,
      revokedSessionCount: sessions.revokedSessionCount,
    },
    complete: checkpointPassed && signedOut && displayRestored && authorization.cleanup.testerCredentialRevoked &&
      sessions.sessionCount >= 1 && sessions.sessionCount === sessions.revokedSessionCount,
    screenshots: screenshots.map(file => path.basename(file)),
  }
  await mkdir(input.evidenceDirectory, { recursive: true })
  await writeFile(path.join(input.evidenceDirectory, "baseline-receipt.json"), JSON.stringify(result, null, 2))
  return result
}
