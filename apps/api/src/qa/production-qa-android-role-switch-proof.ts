import {
  countMobileDeviceSessionRevocations,
  listQaAccessProfiles,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import path from "node:path"

import {
  hasWorkspaceScreenshotCoverage,
  ProductionQaAndroidDriver,
} from "./production-qa-android-driver"
import { runProductionQaRoleSwitchProof } from "./production-qa-role-switch-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"
import { resolveWorkspaceSessionEvidence } from "./production-qa-workspace-evidence"

export async function runProductionQaAndroidRoleSwitchProof(input: {
  adbPath?: string
  accessibilityMatrix?: boolean
  environment: string
  evidenceDirectory: string
  launchUrl?: string | null
  packageName?: string
  qaDomain: string
  runId: string
  serial: string
}) {
  const startedAt = new Date()
  const plan = createProductionQaHarnessPlan({
    environment: input.environment,
    qaDomain: input.qaDomain,
    runId: input.runId,
  })
  const scenario = plan.scenarios.find(({ key }) => key === "starter-healthy")
  if (!scenario) throw new Error("The Starter healthy QA scenario is missing.")

  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario.name &&
      candidate.membership.role === "tenant_admin"
  )
  if (!profile) {
    throw new Error("The Starter healthy Tenant Admin profile is missing.")
  }

  const driver = new ProductionQaAndroidDriver({
    adbPath: input.adbPath,
    evidenceDirectory: input.evidenceDirectory,
    launchUrl: input.launchUrl,
    packageName: input.packageName,
    serial: input.serial,
  })
  let androidSignedOut = false
  let androidCheckpointFailure: string | null = null
  let screenshots: string[] = []
  let displayRestored = !input.accessibilityMatrix

  const androidCredential = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({
          credential,
          expectedRole: profile.membership.role,
          expectedShell: "admin",
          identityLabel: profile.user.fullName,
          qaDomain: plan.qaDomain,
        })
        return await runProductionQaRoleSwitchProof({
          androidCheckpoint: async () => {
            try {
              if (input.accessibilityMatrix) {
                for (const fontScale of [1, 2] as const) {
                  for (const theme of ["light", "dark"] as const) {
                    await driver.prepareWorkspaceDisplay({ fontScale, theme })
                    screenshots.push(
                      ...(await driver.captureWorkspaceRoleSwitchScreens(
                        `${theme}-${fontScale * 100}-`
                      ))
                    )
                  }
                }
              } else {
                screenshots = await driver.captureWorkspaceRoleSwitchScreens()
              }
              return { status: "passed" }
            } catch (error) {
              try {
                await driver.captureWorkspaceFailure()
              } catch {
                // Preserve the original failure even if Android cannot capture.
              }
              androidCheckpointFailure =
                error instanceof Error
                  ? error.message
                  : "The Android role-switch checkpoint failed."
              throw error
            }
          },
          environment: input.environment,
          qaDomain: plan.qaDomain,
          runId: input.runId,
        })
      } finally {
        if (input.accessibilityMatrix) {
          try {
            await driver.restoreWorkspaceDisplay()
            displayRestored = true
          } catch {
            displayRestored = false
          }
        }
        try {
          androidSignedOut = await driver.signOut()
        } catch {
          androidSignedOut = false
        }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android workspace role switch ${plan.runId}`,
  })

  const sessionEvidence = await countMobileDeviceSessionRevocations({
    createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
  const { mobileSessionsRevoked, minimumSessionEvidencePassed } =
    resolveWorkspaceSessionEvidence({
      ...sessionEvidence,
      accessibilityMatrix: Boolean(input.accessibilityMatrix),
    })
  const screenshotNames = screenshots.map((screenshot) =>
    path.basename(screenshot)
  )

  return {
    android: {
      checkpointFailure: androidCheckpointFailure,
      packageName: input.packageName ?? "com.halaalvest.mobile",
      serial: input.serial,
      signedOut: androidSignedOut,
      displayRestored,
    },
    cleanup: {
      androidCredentialRevoked:
        androidCredential.cleanup.testerCredentialRevoked,
      apiSession: androidCredential.result.cleanup,
      mobileSessionCount: sessionEvidence.sessionCount,
      revokedSessionCount: sessionEvidence.revokedSessionCount,
      mobileSessionsRevoked,
    },
    complete:
      androidCredential.result.complete &&
      androidSignedOut &&
      androidCredential.cleanup.testerCredentialRevoked &&
      mobileSessionsRevoked &&
      minimumSessionEvidencePassed &&
      displayRestored &&
      hasWorkspaceScreenshotCoverage(
        screenshotNames,
        Boolean(input.accessibilityMatrix)
      ),
    completedAt: new Date().toISOString(),
    minimumSessionEvidencePassed,
    evidenceDirectory: input.evidenceDirectory,
    receipt: androidCredential.result.receipt,
    report: androidCredential.result.report,
    screenshots: screenshotNames,
    startedAt: startedAt.toISOString(),
  }
}
