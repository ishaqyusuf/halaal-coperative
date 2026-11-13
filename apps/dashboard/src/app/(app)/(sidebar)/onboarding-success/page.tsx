import {
  getMemberRegistrySummary,
  getTenantFinanceSetup,
  listMembers,
} from "@halaalvest/db"
import { MembersChecklistView } from "@/components/members-checklist-view"
import {
  buildOnePathRailSteps,
  isGettingStartedStepComplete,
  toGettingStartedProgressInput,
} from "@/lib/getting-started/getting-started-step-model"
import { getMemberMigrationStartHref } from "@/lib/members/member-migration-routing"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  getNavigationLockLabel,
  resolveInitialMigrationSetupGate,
} from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"

const memberImportHref = "/settings/imports/members"
const financeOfficerInviteHref = "/settings/roles?roleSettingsSheetType=assign"

// Step 10 of One Path: the members checklist. Stays the post-login
// recommendation during member migration and offers step 11 once every member
// is ready (`migration_review`).
export default async function OnboardingSuccessPage() {
  const context = await getDashboardServerContext()
  const tenant = context.tenant
  const membership = context.auth.membership

  if (!tenant || !membership) {
    await tenantRedirect("/")
    return null
  }

  const setupGate = await resolveInitialMigrationSetupGate({
    role: membership.role,
    tenantId: tenant.id,
  })

  const migrationState = setupGate.migrationState

  if (
    !setupGate.isWorkspaceAdmin ||
    setupGate.canUseLiveWorkspace ||
    !migrationState
  ) {
    await tenantRedirect("/")
    return null
  }

  const [financeSetup, members, registrySummary] = await Promise.all([
    getTenantFinanceSetup(tenant.id),
    listMembers(tenant.id, { page: 1, pageSize: 200 }),
    // One batched readiness read; the registry's own migration-completion rule.
    getMemberRegistrySummary(tenant.id),
  ])
  const adminMember =
    members.items.find((member) => member.user?.id === context.auth.user?.id) ??
    members.items.find(
      (member) =>
        member.user?.email && member.user.email === context.auth.user?.email
    ) ??
    null

  // Only an incomplete One Path setup (steps 5–9) goes back. The derived
  // migration status can still read `historical_setup_in_progress` here (for
  // example legacy loans are reviewed during member migration), so it is not
  // used for this check; Getting Started sends those tenants here.
  const progress = toGettingStartedProgressInput({
    financeSetup,
    operationProfileReviewedAt: setupGate.operationProfile?.reviewedAt,
    snapshot: migrationState.snapshot,
  })

  if (!isGettingStartedStepComplete("review-setup", progress)) {
    await tenantRedirect("/getting-started")
    return null
  }

  const migrationMode = financeSetup.migrationSetup.mode
  const canGoLive = migrationState.snapshot.status === "migration_review"

  return (
    <MembersChecklistView
      railSteps={buildOnePathRailSteps({
        ...progress,
        activeStep: "admin-member",
      })}
      adminMember={
        adminMember
          ? {
              fullName: adminMember.fullName,
              id: adminMember.id,
              kycStatus: adminMember.kycStatus,
              memberNumber: adminMember.memberNumber,
            }
          : null
      }
      adminMemberHref={
        adminMember
          ? getMemberMigrationStartHref(adminMember.id, migrationMode)
          : memberImportHref
      }
      financeOfficerInvite={{
        href: financeOfficerInviteHref,
        lockLabel: getNavigationLockLabel({
          href: financeOfficerInviteHref,
          shouldRedirectAdminToSetup: setupGate.shouldRedirectAdminToSetup,
        }),
      }}
      goLiveHref={canGoLive ? "/getting-started?step=review" : null}
      memberImportHref={memberImportHref}
      membersHref="/members"
      migrationMode={migrationMode}
      readiness={{
        ready: registrySummary.migrationFinalizedCount,
        total: registrySummary.totalCount,
      }}
    />
  )
}
