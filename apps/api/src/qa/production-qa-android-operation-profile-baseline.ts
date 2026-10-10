import { countMobileDeviceSessionRevocations, listQaAccessProfiles } from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

type OperationProfileAuditStage = "authorization" | "display-preparation" | "draft-interaction"

/** Captures the existing UI only; this cannot satisfy the stale-command journey. */
export async function runProductionQaAndroidOperationProfileBaseline(input: {
  environment: string; evidenceDirectory: string; launchUrl: string
  qaDomain: string; runId: string; serial: string
  exerciseDraft?: boolean
  accessibilityMatrix?: boolean
}) {
  if (input.accessibilityMatrix && !input.exerciseDraft) {
    throw new Error("Operation Profile display matrix requires the draft-interaction audit.")
  }
  if (input.accessibilityMatrix && !input.serial.startsWith("emulator-")) {
    throw new Error("Operation Profile display matrix is restricted to Android emulators.")
  }
  const startedAt = new Date()
  const plan = createProductionQaHarnessPlan(input)
  const scenario = plan.scenarios.find(item => item.key === "enterprise-stale")
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(item =>
    item.tenant.name === scenario?.name && item.membership.role === "tenant_admin")
  if (!profile) throw new Error("The exact Enterprise stale QA Admin profile is missing.")
  await mkdir(input.evidenceDirectory, { recursive: true })
  let driver = new ProductionQaAndroidDriver(input)
  let signedOut = false
  let displayRestored = !input.accessibilityMatrix
  let checkpointPassed = false
  let entered = false
  let stage: OperationProfileAuditStage = "authorization"
  let failureStage: OperationProfileAuditStage | null = null
  let authorizationFailureCheckpoint: ReturnType<ProductionQaAndroidDriver["getAuthorizationCheckpoint"]> | null = null
  let screenshots: string[] = []
  const displayCheckpoints: { theme: "light" | "dark"; fontScale: 1 | 2; passed: boolean }[] = []
  const authorization = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({ credential, expectedRole: "tenant_admin", expectedShell: "admin",
          identityLabel: profile.user.fullName, qaDomain: plan.qaDomain })
        entered = true
        if (input.accessibilityMatrix) {
          for (const display of [
            { theme: "light", fontScale: 1 }, { theme: "dark", fontScale: 1 },
            { theme: "light", fontScale: 2 }, { theme: "dark", fontScale: 2 },
          ] as const) {
            const checkpoint = { ...display, passed: false }
            displayCheckpoints.push(checkpoint)
            const evidenceDirectory = path.join(input.evidenceDirectory, `${display.theme}-${display.fontScale * 100}`)
            await mkdir(evidenceDirectory, { recursive: true })
            driver = new ProductionQaAndroidDriver({ ...input, evidenceDirectory })
            console.log(`Operation Profile presentation: ${display.theme}/${display.fontScale * 100} started`)
            stage = "display-preparation"
            await driver.prepareWorkspaceDisplay({ ...display, expectedShell: "admin" })
            stage = "draft-interaction"
            screenshots.push(...await driver.captureOperationProfileBaseline(true))
            checkpoint.passed = true
            console.log(`Operation Profile presentation: ${display.theme}/${display.fontScale * 100} checkpoints passed`)
          }
        } else {
          stage = "draft-interaction"
          screenshots = await driver.captureOperationProfileBaseline(input.exerciseDraft)
        }
        checkpointPassed = true
      } catch {
        failureStage = stage
        if (stage === "authorization") {
          authorizationFailureCheckpoint = driver.getAuthorizationCheckpoint()
        }
        // Do not capture an interrupted credential-entry screen.
        if (entered) {
          try { screenshots.push(await driver.captureOperationProfileFailure()) } catch { /* Preserve failure without an image. */ }
        }
      } finally {
        if (entered) {
          try { await driver.discardOperationProfileTestDraft() } catch { /* Sign-out remains independently attempted. */ }
          if (input.accessibilityMatrix) {
            try { await driver.restoreWorkspaceDisplay("admin"); displayRestored = true } catch { displayRestored = false }
          }
        }
        try { signedOut = await driver.signOut() } catch { signedOut = false }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android Operation Profile baseline ${plan.runId}`,
  })
  const sessions = await countMobileDeviceSessionRevocations({ createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id, userId: profile.user.id })
  const result = {
    mode: "baseline-only", runId: plan.runId, journeyComplete: false,
    draftInteractionRequested: input.exerciseDraft === true,
    displayMatrixRequested: input.accessibilityMatrix === true,
    displayCheckpoints,
    checkpointPassed,
    failureStage,
    authorizationFailureCheckpoint,
    cleanup: { signedOut, displayRestored, credentialRevoked: authorization.cleanup.testerCredentialRevoked, ...sessions },
    screenshots: screenshots.map(file => path.relative(input.evidenceDirectory, file)),
    complete: checkpointPassed && signedOut && displayRestored && authorization.cleanup.testerCredentialRevoked &&
      sessions.sessionCount >= 1 && sessions.sessionCount === sessions.revokedSessionCount,
    startedAt: startedAt.toISOString(), completedAt: new Date().toISOString(),
  }
  await writeFile(path.join(input.evidenceDirectory, "baseline-receipt.json"), JSON.stringify(result, null, 2))
  return result
}
