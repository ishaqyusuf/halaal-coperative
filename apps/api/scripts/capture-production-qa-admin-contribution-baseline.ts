import { createPrismaClient, listQaAccessProfiles } from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "../src/qa/production-qa-android-driver"
import { runWithProductionQaTesterCredential } from "../src/qa/production-qa-tester-credential"

const evidenceDirectory =
  process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim()
const runId = process.env.PRODUCTION_QA_RUN_ID?.trim()
if (!evidenceDirectory || !runId) {
  throw new Error("An explicit evidence directory and run ID are required.")
}

const plan = createProductionQaHarnessPlan({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId,
})
const scenario = plan.scenarios.find(
  (candidate) => candidate.key === "starter-healthy"
)
const profile = (await listQaAccessProfiles(plan.qaDomain)).find(
  (candidate) =>
    candidate.tenant.name === scenario?.name &&
    candidate.membership.role === "finance_officer"
)
if (!scenario || !profile) {
  throw new Error("The Starter healthy QA Finance Officer profile is missing.")
}
const prisma = createPrismaClient()
if (!prisma)
  throw new Error("The contribution baseline requires the QA database.")
const member = profile.member
  ? { fullName: profile.user.fullName, memberNumber: profile.member.code }
  : await prisma.member.findFirst({
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      select: { fullName: true, memberNumber: true },
      where: { status: "active", tenantId: profile.tenant.id },
    })
if (!member) throw new Error("The Starter healthy QA member is missing.")

await mkdir(evidenceDirectory, { recursive: true })
const driver = new ProductionQaAndroidDriver({
  evidenceDirectory,
  launchUrl:
    process.env.PRODUCTION_QA_ANDROID_LAUNCH_URL?.trim() ||
    "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
  serial: process.env.PRODUCTION_QA_ANDROID_SERIAL?.trim() || "emulator-5554",
})

let androidSignedOut = false
let authorizationCheckpoint = driver.getAuthorizationCheckpoint()
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
      const screenshots = [await driver.captureAdminContributionBaseline()]
      screenshots.push(
        await driver.captureAdminContributionFormBaseline({
          memberName: member.fullName,
          memberNumber: member.memberNumber,
        })
      )
      authorizationCheckpoint = driver.getAuthorizationCheckpoint()
      return screenshots
    } catch (error) {
      authorizationCheckpoint = driver.getAuthorizationCheckpoint()
      throw error
    } finally {
      androidSignedOut = await driver.signOut().catch(() => false)
    }
  },
  qaDomain: plan.qaDomain,
  testerLabel: `Ticket 30 contribution baseline ${plan.runId}`,
})

const result = {
  androidSignedOut,
  authorizationCheckpoint,
  complete: androidSignedOut && authorization.cleanup.testerCredentialRevoked,
  credentialRevoked: authorization.cleanup.testerCredentialRevoked,
  qaDomain: plan.qaDomain,
  runId: plan.runId,
  screenshots: authorization.result.map((file) => path.basename(file)),
}
await writeFile(
  path.join(evidenceDirectory, "baseline-receipt.json"),
  JSON.stringify(result, null, 2)
)

console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
