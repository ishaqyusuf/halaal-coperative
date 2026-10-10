import {
  countMobileDeviceSessionRevocations,
  listMobileDeviceSessionsForAdmin,
  listQaAccessProfiles,
  revokeMobileDeviceSession,
} from "@halaalvest/db"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { ProductionQaAndroidDriver } from "../src/qa/production-qa-android-driver"

const evidenceDirectory =
  process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim()
if (!evidenceDirectory) {
  throw new Error("The rejected proof evidence directory is required.")
}

const receiptPath = path.join(evidenceDirectory, "receipt.json")
const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
  complete: boolean
  completedAt: string
  receipt: {
    journeys?: Array<{
      steps?: Array<{ key?: string; status?: string }>
      status?: string
    }>
    runId?: string
  }
  startedAt: string
}
if (
  receipt.complete !== false ||
  !/^t30-ro-proc-v\d+$/.test(receipt.receipt.runId ?? "") ||
  receipt.receipt.journeys?.[0]?.steps?.find(
    (step) => step.key === "reject-read-only-request"
  )?.status !== "passed"
) {
  throw new Error(
    "Recovery is limited to a rejected read-only Procurement proof whose API rejection passed."
  )
}

const startedAt = new Date(receipt.startedAt)
const completedAt = new Date(receipt.completedAt)
if (
  !Number.isFinite(startedAt.getTime()) ||
  !Number.isFinite(completedAt.getTime())
) {
  throw new Error("The rejected proof recovery window is invalid.")
}

const profile = (await listQaAccessProfiles("ishaq.qa.test")).find(
  (candidate) =>
    candidate.tenant.name === "QA ONLY — Enterprise Stale Cooperative" &&
    candidate.membership.role === "member"
)
if (!profile) throw new Error("The exact QA Member profile is missing.")

const driver = new ProductionQaAndroidDriver({
  evidenceDirectory,
  launchUrl:
    "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
  serial: "emulator-5554",
})
const signedOut = await driver.signOut()
const { sessions: candidates } = await listMobileDeviceSessionsForAdmin({
  tenantId: profile.tenant.id,
  userId: profile.user.id,
})
const targets = candidates.filter(
  (session) =>
    !session.revokedAt &&
    session.createdAt >= startedAt &&
    session.createdAt <= completedAt
)
if (targets.length > 1) {
  throw new Error(
    "The rejected proof recovery scope contains more than one live session."
  )
}
for (const session of targets) {
  await revokeMobileDeviceSession({
    actorUserId: profile.user.id,
    reason: "user_revoked",
    sessionId: session.id,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  })
}

const sessions = await countMobileDeviceSessionRevocations({
  createdAtOrAfter: startedAt,
  tenantId: profile.tenant.id,
  userId: profile.user.id,
})
const result = {
  complete:
    signedOut &&
    sessions.sessionCount === sessions.revokedSessionCount &&
    targets.length <= 1,
  recoveredSessions: targets.length,
  signedOut,
  ...sessions,
}
await writeFile(
  path.join(evidenceDirectory, "cleanup-recovery.json"),
  JSON.stringify(result, null, 2)
)
console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
