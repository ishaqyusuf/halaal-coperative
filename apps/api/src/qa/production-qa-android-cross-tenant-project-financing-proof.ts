import {
  countMobileDeviceSessionRevocations,
  createPrismaClient,
  ensureProductionQaForeignProjectFinancingFixture,
  ensureProductionQaLocalProjectFinancingFixture,
  listQaAccessProfiles,
  PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE,
  PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runProductionQaCrossTenantProjectFinancingProof } from "./production-qa-cross-tenant-project-financing-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidCrossTenantProjectFinancingProof(input: {
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
    (candidate) => candidate.key === "standard-review"
  )
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario?.name &&
      candidate.membership.role === "finance_officer"
  )
  if (!scenario || !profile) {
    throw new Error(
      "The exact Standard review QA Finance Officer profile is missing."
    )
  }
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error("The Android cross-tenant proof requires the QA database.")
  }
  const [foreignFixture] = await Promise.all([
    ensureProductionQaForeignProjectFinancingFixture({ plan, prisma }),
    ensureProductionQaLocalProjectFinancingFixture({ plan, prisma }),
  ])

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

        return await runProductionQaCrossTenantProjectFinancingProof({
          androidCheckpoint: async () => {
            try {
              screenshots =
                await driver.captureCrossTenantProjectFinancingDenial({
                  foreignBusinessName:
                    PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE.businessName,
                  foreignRequestId: foreignFixture.recordId,
                  localBusinessName:
                    PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE.businessName,
                })
              return { status: "observed", observedOutcome: "NOT_FOUND" }
            } catch (error) {
              checkpointFailure =
                error instanceof Error
                  ? error.message
                  : "The Android cross-tenant checkpoint failed."
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
    testerLabel: `Ticket 30 Android cross-tenant project financing ${plan.runId}`,
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
      screenshotNames.length === 3,
    completedAt: new Date().toISOString(),
    denialEvidence: androidCredential.result.denialEvidence,
    evidenceDirectory: input.evidenceDirectory,
    fixtures: androidCredential.result.fixtures,
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
