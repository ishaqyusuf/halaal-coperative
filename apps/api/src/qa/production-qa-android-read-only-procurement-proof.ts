import {
  countMobileDeviceSessionRevocations,
  listQaAccessProfiles,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runProductionQaReadOnlyProcurementProof } from "./production-qa-read-only-procurement-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidReadOnlyProcurementProof(input: {
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
  const plan = createProductionQaHarnessPlan(input)
  const scenario = plan.scenarios.find(
    (candidate) => candidate.key === "enterprise-stale"
  )
  const identity = scenario?.identities.find(
    (candidate) => candidate.role === "member"
  )
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario?.name &&
      candidate.membership.role === "member"
  )
  if (!scenario || !identity?.memberNumber || !profile) {
    throw new Error("The exact Enterprise stale QA Member profile is missing.")
  }
  const expectedMemberNumber = identity.memberNumber

  await mkdir(input.evidenceDirectory, { recursive: true })
  const driver = new ProductionQaAndroidDriver(input)
  let androidSignedOut = false
  let checkpointFailure: string | null = null
  let screenshots: string[] = []

  const androidCredential = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({
          credential,
          expectedMemberNumber,
          expectedRole: "member",
          expectedShell: "member",
          identityLabel: profile.user.fullName,
          qaDomain: plan.qaDomain,
        })

        return await runProductionQaReadOnlyProcurementProof({
          androidCheckpoint: async () => {
            try {
              screenshots = await driver.captureReadOnlyProcurement()
              return {
                status: "observed",
                observedOutcome: "PRECONDITION_FAILED",
              }
            } catch (error) {
              checkpointFailure =
                error instanceof Error
                  ? error.message
                  : "The Android read-only Procurement checkpoint failed."
              try {
                screenshots.push(await driver.captureProcurementFailure())
              } catch {
                // Preserve the bounded checkpoint failure without native output.
              }
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
    testerLabel: `Ticket 30 Android read-only Procurement ${plan.runId}`,
  })

  const sessions = await countMobileDeviceSessionRevocations({
    createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
  const screenshotNames = screenshots.map((file) => path.basename(file))
  const result = {
    android: {
      checkpointFailure,
      packageName: input.packageName ?? "com.halaalvest.mobile",
      serial: input.serial,
      signedOut: androidSignedOut,
    },
    cleanup: {
      androidCredentialRevoked:
        androidCredential.cleanup.testerCredentialRevoked,
      apiSession: androidCredential.result.cleanup,
      ...sessions,
    },
    complete:
      androidCredential.result.complete &&
      androidCredential.result.observedCreateOutcome ===
        "PRECONDITION_FAILED" &&
      androidSignedOut &&
      androidCredential.cleanup.testerCredentialRevoked &&
      sessions.sessionCount >= 2 &&
      sessions.sessionCount === sessions.revokedSessionCount &&
      screenshotNames.length >= 1 &&
      screenshotNames.length <= 2,
    completedAt: new Date().toISOString(),
    evidenceDirectory: input.evidenceDirectory,
    observedCreateOutcome: androidCredential.result.observedCreateOutcome,
    receipt: androidCredential.result.receipt,
    report: androidCredential.result.report,
    screenshots: screenshotNames,
    startedAt: startedAt.toISOString(),
  }

  await writeFile(
    path.join(input.evidenceDirectory, "receipt.json"),
    JSON.stringify(result, null, 2)
  )
  return result
}
