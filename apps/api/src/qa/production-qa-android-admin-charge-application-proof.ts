import {
  countMobileDeviceSessionRevocations,
  createPrismaClient,
  ensureProductionQaDuplicateChargeFixture,
  listQaAccessProfiles,
  PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { runProductionQaAdminChargeApplicationProof } from "./production-qa-admin-charge-application-proof"
import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

type RuntimeWarningEvidence = {
  code: string | null
  name: string
}

export async function runProductionQaAndroidAdminChargeApplicationProof(input: {
  adbPath?: string
  environment: string
  evidenceDirectory: string
  launchUrl?: string | null
  packageName?: string
  qaDomain: string
  runId: string
  serial: string
}) {
  const runtimeWarnings: RuntimeWarningEvidence[] = []
  const recordRuntimeWarning = (warning: Error & { code?: string }) => {
    runtimeWarnings.push({
      code: warning.code ?? null,
      name: warning.name,
    })
  }
  process.on("warning", recordRuntimeWarning)

  try {
    return await executeProductionQaAndroidAdminChargeApplicationProof(
      input,
      runtimeWarnings
    )
  } finally {
    process.off("warning", recordRuntimeWarning)
  }
}

async function executeProductionQaAndroidAdminChargeApplicationProof(
  input: {
    adbPath?: string
    environment: string
    evidenceDirectory: string
    launchUrl?: string | null
    packageName?: string
    qaDomain: string
    runId: string
    serial: string
  },
  runtimeWarnings: RuntimeWarningEvidence[]
) {
  const startedAt = new Date()
  const plan = createProductionQaHarnessPlan(input)
  const scenario = plan.scenarios.find(
    (candidate) => candidate.key === "starter-healthy"
  )
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario?.name &&
      candidate.membership.role === "finance_officer"
  )
  if (!scenario || !profile) {
    throw new Error(
      "The exact Starter healthy QA Finance Officer profile is missing."
    )
  }
  const prisma = createPrismaClient()
  if (!prisma)
    throw new Error("The Android charge proof requires the QA database.")
  const fixture = await ensureProductionQaDuplicateChargeFixture({
    plan,
    prisma,
  })

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
          expectedRole: "finance_officer",
          expectedShell: "admin",
          identityLabel: profile.user.fullName,
          qaDomain: plan.qaDomain,
        })

        return await runProductionQaAdminChargeApplicationProof({
          androidCheckpoint: async () => {
            try {
              screenshots = await driver.captureAdminChargeApplication({
                memberName: fixture.member.fullName,
                memberNumber: fixture.member.memberNumber,
                ruleName: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.name,
              })
              return { status: "passed" }
            } catch (error) {
              checkpointFailure =
                error instanceof Error
                  ? error.message
                  : "The Android admin-charge checkpoint failed."
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
    testerLabel: `Ticket 30 Android admin charge ${plan.runId}`,
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
      androidSignedOut &&
      androidCredential.cleanup.testerCredentialRevoked &&
      sessions.sessionCount >= 2 &&
      sessions.sessionCount === sessions.revokedSessionCount &&
      screenshotNames.length === 16 &&
      runtimeWarnings.length === 0,
    completedAt: new Date().toISOString(),
    evidence: androidCredential.result.evidence,
    evidenceDirectory: input.evidenceDirectory,
    finalCleanupRestored: androidCredential.result.finalCleanupRestored,
    fixture: androidCredential.result.fixture,
    receipt: androidCredential.result.receipt,
    report: androidCredential.result.report,
    runtimeWarnings,
    screenshots: screenshotNames,
    startedAt: startedAt.toISOString(),
  }

  await writeFile(
    path.join(input.evidenceDirectory, "receipt.json"),
    JSON.stringify(result, null, 2)
  )
  return result
}
