import {
  countMobileDeviceSessionRevocations,
  listQaAccessProfiles,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import path from "node:path"

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runProductionQaShareProfitReadProof } from "./production-qa-share-profit-read-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidShareProfitProof(input: {
  adbPath?: string
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
  const scenario = plan.scenarios.find(({ key }) => key === "enterprise-profit")
  if (!scenario)
    throw new Error("The Enterprise profit QA scenario is missing.")

  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario.name &&
      candidate.membership.role === "tenant_admin"
  )
  if (!profile) {
    throw new Error("The Enterprise profit Tenant Admin profile is missing.")
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
        return await runProductionQaShareProfitReadProof({
          androidCheckpoint: async ({ periodName }) => {
            try {
              screenshots =
                await driver.captureShareProfitGovernanceScreens(periodName)
              return { status: "passed" }
            } catch (error) {
              androidCheckpointFailure =
                error instanceof Error
                  ? error.message
                  : "The Android share/profit checkpoint failed."
              throw error
            }
          },
          environment: input.environment,
          qaDomain: plan.qaDomain,
          runId: input.runId,
        })
      } finally {
        try {
          androidSignedOut = await driver.signOut()
        } catch {
          androidSignedOut = false
        }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android share profit ${plan.runId}`,
  })

  const sessionEvidence = await countMobileDeviceSessionRevocations({
    createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
  const mobileSessionsRevoked =
    sessionEvidence.sessionCount >= 2 &&
    sessionEvidence.sessionCount === sessionEvidence.revokedSessionCount
  const screenshotNames = screenshots.map((screenshot) =>
    path.basename(screenshot)
  )

  return {
    android: {
      checkpointFailure: androidCheckpointFailure,
      packageName: input.packageName ?? "com.halaalvest.mobile",
      serial: input.serial,
      signedOut: androidSignedOut,
    },
    cleanup: {
      androidCredentialRevoked:
        androidCredential.cleanup.testerCredentialRevoked,
      apiSession: androidCredential.result.cleanup,
      mobileSessionCount: sessionEvidence.sessionCount,
      mobileSessionsRevoked,
    },
    complete:
      androidCredential.result.complete &&
      androidSignedOut &&
      androidCredential.cleanup.testerCredentialRevoked &&
      mobileSessionsRevoked &&
      screenshotNames.length === 2,
    completedAt: new Date().toISOString(),
    evidenceDirectory: input.evidenceDirectory,
    receipt: androidCredential.result.receipt,
    report: androidCredential.result.report,
    screenshots: screenshotNames,
    startedAt: startedAt.toISOString(),
  }
}
