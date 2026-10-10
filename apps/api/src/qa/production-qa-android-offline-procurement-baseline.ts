import {
  countMobileDeviceSessionRevocations,
  listQaAccessProfiles,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "./production-qa-android-driver"
import { runWithProductionQaTesterCredential } from "./production-qa-tester-credential"

export async function runProductionQaAndroidOfflineProcurementBaseline(input: {
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
  const identity = scenario?.identities.find(
    (candidate) => candidate.role === "member"
  )
  const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
    (candidate) =>
      candidate.tenant.name === scenario?.name &&
      candidate.membership.role === "member"
  )
  if (!scenario || !identity?.memberNumber || !profile) {
    throw new Error("The exact Starter healthy QA Member profile is missing.")
  }
  const expectedMemberNumber = identity.memberNumber

  await mkdir(input.evidenceDirectory, { recursive: true })
  const driver = new ProductionQaAndroidDriver(input)
  let signedOut = false
  let screenshots: string[] = []

  const authorization = await runWithProductionQaTesterCredential({
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
        screenshots = await driver.captureOfflineProcurementBaseline()
      } finally {
        try {
          signedOut = await driver.signOut()
        } catch {
          signedOut = false
        }
      }
    },
    qaDomain: plan.qaDomain,
    testerLabel: `Ticket 30 Android offline Procurement baseline ${plan.runId}`,
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
