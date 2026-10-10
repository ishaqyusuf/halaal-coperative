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

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import {
  cleanupProductionQaDuplicateChargeArtifacts,
  PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
  readProductionQaDuplicateChargeFingerprint,
  type ProductionQaDuplicateChargeFingerprint,
} from "./production-qa-duplicate-charge-proof"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidDuplicateChargeBaseline(input: {
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
  if (!prisma) throw new Error("The charge baseline requires the QA database.")
  const fixture = await ensureProductionQaDuplicateChargeFixture({
    plan,
    prisma,
  })

  await mkdir(input.evidenceDirectory, { recursive: true })
  const driver = new ProductionQaAndroidDriver(input)
  let signedOut = false
  let screenshots: string[] = []
  let fingerprint: ProductionQaDuplicateChargeFingerprint | null = null
  let finalCleanupRestored = false

  await cleanupProductionQaDuplicateChargeArtifacts({
    fixture,
    notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
    prisma,
  })
  const baseline = await readProductionQaDuplicateChargeFingerprint({
    fixture,
    notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
    prisma,
  })

  let authorization:
    | Awaited<ReturnType<typeof runWithProductionQaTesterCredential<void>>>
    | undefined
  try {
    authorization = await runWithProductionQaTesterCredential({
      execute: async ({ credential }) => {
        try {
          await driver.enterQaProfile({
            credential,
            expectedRole: "finance_officer",
            expectedShell: "admin",
            identityLabel: profile.user.fullName,
            qaDomain: plan.qaDomain,
          })
          screenshots = await driver.captureDuplicateChargeBaseline({
            memberName: fixture.member.fullName,
            memberNumber: fixture.member.memberNumber,
            ruleName: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.name,
          })
          fingerprint = await readProductionQaDuplicateChargeFingerprint({
            fixture,
            notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
            prisma,
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
      testerLabel: `Ticket 30 Android duplicate charge baseline ${plan.runId}`,
    })
  } finally {
    await cleanupProductionQaDuplicateChargeArtifacts({
      fixture,
      notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
      prisma,
    })
    const finalState = await readProductionQaDuplicateChargeFingerprint({
      fixture,
      notes: PRODUCTION_QA_DUPLICATE_CHARGE_ANDROID_NOTE,
      prisma,
    })
    finalCleanupRestored =
      finalState.applicationCount === 0 &&
      finalState.ledgerTransactionCount === 0 &&
      finalState.ledgerEntryCount === 0 &&
      finalState.memberSavings === baseline.memberSavings
  }
  if (!authorization) throw new Error("The charge baseline did not run.")
  const capturedFingerprint =
    fingerprint as ProductionQaDuplicateChargeFingerprint | null

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
      screenshots.length === 5 &&
      capturedFingerprint?.applicationCount === 1 &&
      capturedFingerprint.ledgerTransactionCount === 1 &&
      capturedFingerprint.ledgerEntryCount === 2 &&
      finalCleanupRestored &&
      signedOut &&
      authorization.cleanup.testerCredentialRevoked &&
      sessions.sessionCount >= 1 &&
      sessions.sessionCount === sessions.revokedSessionCount,
    completedAt: new Date().toISOString(),
    finalCleanupRestored,
    fingerprint: capturedFingerprint,
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
