import {
  countMobileDeviceSessionRevocations,
  createPrismaClient,
  ensureProductionQaForeignProjectFinancingFixture,
  listQaAccessProfiles,
  PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidCrossTenantProjectFinancingBaseline(input: {
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
  const identity = scenario?.identities.find(
    (candidate) => candidate.role === "finance_officer"
  )
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario?.name &&
      candidate.membership.role === "finance_officer"
  )
  const prisma = createPrismaClient()
  if (!scenario || !identity || !profile || !prisma) {
    throw new Error(
      "The exact Standard review QA Finance Officer profile is missing."
    )
  }
  const fixture = await ensureProductionQaForeignProjectFinancingFixture({
    plan,
    prisma,
  })

  await mkdir(input.evidenceDirectory, { recursive: true })
  const driver = new ProductionQaAndroidDriver(input)
  let signedOut = false
  let screenshots: string[] = []

  const authorization = await runWithProductionQaTesterCredential({
    execute: async ({ credential }) => {
      try {
        await driver.enterQaProfile({
          credential,
          expectedRole: "finance_officer",
          expectedShell: "admin",
          identityLabel: profile.user.fullName,
          qaDomain: plan.qaDomain,
        })
        screenshots = await driver.captureCrossTenantProjectFinancingBaseline({
          foreignBusinessName:
            PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE.businessName,
          foreignRequestId: fixture.recordId,
        })
      } finally {
        try {
          signedOut = await driver.signOut()
        } catch {
          signedOut = false
        }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android cross-tenant project financing baseline ${plan.runId}`,
  })

  const sessions = await countMobileDeviceSessionRevocations({
    createdAtOrAfter: startedAt,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
  const result = {
    cleanup: {
      credentialRevoked: authorization.cleanup.testerCredentialRevoked,
      ...sessions,
    },
    complete:
      screenshots.length === 1 &&
      signedOut &&
      authorization.cleanup.testerCredentialRevoked &&
      sessions.sessionCount >= 1 &&
      sessions.sessionCount === sessions.revokedSessionCount,
    completedAt: new Date().toISOString(),
    fixture,
    screenshots: screenshots.map((file) => path.basename(file)),
    signedOut,
    startedAt: startedAt.toISOString(),
  }

  await writeFile(
    path.join(input.evidenceDirectory, "baseline-receipt.json"),
    JSON.stringify(result, null, 2)
  )
  return result
}
