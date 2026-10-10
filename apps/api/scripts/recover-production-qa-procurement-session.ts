import {
  countMobileDeviceSessionRevocations,
  createPrismaClient,
  listQaAccessProfiles,
  revokeMobileDeviceSession,
} from "@halaalvest/db"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { writeFile } from "node:fs/promises"

// One-time recovery of the failed, already signed-out baseline. Never widen this window.
const startedAt = new Date("2026-09-05T11:39:23.884Z")
const endedAt = new Date("2026-09-05T11:44:28.081Z")
const plan = createProductionQaHarnessPlan({ environment: "local", qaDomain: "ishaq.qa.test", runId: "procurement-baseline-recovery" })
const scenario = plan.scenarios.find(item => item.key === "standard-review")!
const profile = (await listQaAccessProfiles(plan.qaDomain)).find(item => item.tenant.name === scenario.name && item.membership.role === "member")
if (!profile) throw new Error("The isolated QA Member is missing.")
const prisma = createPrismaClient()
if (!prisma) throw new Error("Database unavailable.")
const sessions = await prisma.mobileDeviceSession.findMany({
  where: {
    tenantId: profile.tenant.id, userId: profile.user.id,
    createdAt: { gte: startedAt, lte: endedAt }, revokedAt: null,
  }, select: { id: true },
})
if (sessions.length > 1) throw new Error("Unexpected recovery scope; refusing revocation.")
for (const session of sessions) await revokeMobileDeviceSession({
  actorUserId: profile.user.id, reason: "signed_out", sessionId: session.id,
  tenantId: profile.tenant.id, userId: profile.user.id,
})
const evidence = await countMobileDeviceSessionRevocations({ createdAtOrAfter: startedAt, tenantId: profile.tenant.id, userId: profile.user.id })
const result = { recoveredSessions: sessions.length, ...evidence, complete: evidence.sessionCount === evidence.revokedSessionCount }
await writeFile(new URL("../../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/baseline-v1/recovery-receipt.json", import.meta.url), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
process.exitCode = result.complete ? 0 : 1
