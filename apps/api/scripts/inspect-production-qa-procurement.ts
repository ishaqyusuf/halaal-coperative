import {
  countMobileDeviceSessionRevocations,
  createPrismaClient,
  getMemberOperationalReadiness,
  getMobileMemberProcurementService,
  listQaAccessProfiles,
  getTenantInitialMigrationState,
  buildBackfillDraftInputForMember,
} from "@halaalvest/db"
import { buildBackfillDraft } from "@halaalvest/backfill"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"

const plan = createProductionQaHarnessPlan({ environment: "local", qaDomain: "ishaq.qa.test", runId: "procurement-readiness-inspection" })
const scenario = plan.scenarios.find(item => item.key === "standard-review")!
const profile = (await listQaAccessProfiles(plan.qaDomain)).find(item => item.tenant.name === scenario.name && item.membership.role === "member")
if (!profile) throw new Error("The isolated QA Member is missing.")
const prisma = createPrismaClient()
if (!prisma) throw new Error("Database unavailable.")
const member = await prisma.member.findFirstOrThrow({ where: { tenantId: profile.tenant.id, userId: profile.user.id }, select: { id: true } })
const readiness = await getMemberOperationalReadiness({ memberId: member.id, tenantId: profile.tenant.id })
const procurement = await getMobileMemberProcurementService({ tenantId: profile.tenant.id, userId: profile.user.id })
const migration = await getTenantInitialMigrationState(profile.tenant.id)
// Preview only. Never save/apply a ledger merely to turn readiness green.
const draft = buildBackfillDraft(await buildBackfillDraftInputForMember({
  tenantId: profile.tenant.id, memberId: member.id,
}))
const sessions = await countMobileDeviceSessionRevocations({ createdAtOrAfter: new Date("2026-09-05T11:39:23.884Z"), tenantId: profile.tenant.id, userId: profile.user.id })
console.log(JSON.stringify({
  readiness: readiness ? {
    isReady: readiness.isReady, issues: readiness.issues,
    migrationMode: readiness.migration.mode, migrationState: readiness.migration.state,
    appliedMonthCount: readiness.migration.appliedMonthCount,
  } : null,
  procurement: { canCreateRequest: procurement.canCreateRequest, restrictionReasons: procurement.restrictionReasons, chargeCount: procurement.chargeOptions.length, requestCount: procurement.summary.totalRequests },
  migrationPreflight: {
    canUseMigrationTools: migration.snapshot.canUseMigrationTools,
    missingStepKeys: migration.snapshot.missingStepKeys,
    previewRowCount: draft.rows.length,
    previewWarningCount: draft.warnings.length,
    previewOnly: true,
  },
  sessions,
}, null, 2))
