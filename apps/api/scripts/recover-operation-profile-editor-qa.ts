import { countMobileDeviceSessionRevocations, listMobileDeviceSessionsForAdmin, listQaAccessProfiles, revokeMobileDeviceSession } from "@halaalvest/db"
import { ProductionQaAndroidDriver } from "../src/qa/production-qa-android-driver"
import { readFile, writeFile } from "node:fs/promises"

const evidenceDirectory = process.env.PRODUCTION_QA_ANDROID_EVIDENCE_DIRECTORY?.trim()
if (!evidenceDirectory) throw new Error("The existing run evidence directory is required.")
const receipt = JSON.parse(await readFile(`${evidenceDirectory}/baseline-receipt.json`, "utf8"))
if (receipt.mode !== "baseline-only" || receipt.complete !== false || receipt.draftInteractionRequested !== true) {
  throw new Error("Recovery is limited to an incomplete Operation Profile draft run.")
}
const startedAt = new Date(receipt.startedAt)
const completedAt = new Date(receipt.completedAt)
if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(completedAt.getTime())) throw new Error("Invalid run window.")
const driver = new ProductionQaAndroidDriver({
  evidenceDirectory,
  serial: "emulator-5554",
  launchUrl: "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A1443",
})
await driver.discardOperationProfileTestDraft()
const signedOut = await driver.signOut()
const profile = (await listQaAccessProfiles("ishaq.qa.test")).find(item =>
  item.tenant.name === "QA ONLY — Enterprise Stale Cooperative" && item.membership.role === "tenant_admin")
if (!profile) throw new Error("Exact QA profile missing.")
let serverRecoveryCount = 0
const { sessions: candidates } = await listMobileDeviceSessionsForAdmin({ tenantId: profile.tenant.id, userId: profile.user.id })
const targets = candidates.filter(session => !session.revokedAt && session.createdAt >= startedAt && session.createdAt <= completedAt)
if (targets.length > 1) throw new Error("Expected at most one exact failed-run session.")
for (const session of targets) {
  await revokeMobileDeviceSession({
    actorUserId: profile.user.id, reason: "user_revoked", sessionId: session.id,
    tenantId: profile.tenant.id, userId: profile.user.id,
  })
  serverRecoveryCount += 1
}
const sessions = await countMobileDeviceSessionRevocations({
  createdAtOrAfter: startedAt,
  tenantId: profile.tenant.id,
  userId: profile.user.id,
})
const result = { signedOut, serverRecoveryCount, ...sessions, recoveredAt: new Date().toISOString() }
await writeFile(`${evidenceDirectory}/cleanup-recovery-server.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
process.exitCode = signedOut && sessions.sessionCount === sessions.revokedSessionCount ? 0 : 1
