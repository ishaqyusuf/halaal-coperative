import {
  getTenantBusinessProfitPolicy,
  getTenantInitialMigrationState,
  getTenantOperationProfile,
  type MembershipRole,
} from "@halaalvest/db"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export {
  getNavigationLockLabel,
  initialMigrationSetupPaths,
  isInitialMigrationSetupPath,
  navigationLockedAfterSetupLabel,
  resolveInitialMigrationLayoutRedirect,
} from "./setup-gate-routing"

export function shouldOpenFirstRunOnboarding(input: {
  alreadyInOnboarding: boolean
  canUseLiveWorkspace: boolean
  isQaAuthorized: boolean
  isWorkspaceAdmin: boolean
}) {
  return (
    input.canUseLiveWorkspace &&
    input.isWorkspaceAdmin &&
    !input.isQaAuthorized &&
    !input.alreadyInOnboarding
  )
}

export async function resolveInitialMigrationSetupGate(input: {
  role: MembershipRole | null | undefined
  tenantId: string | null | undefined
}) {
  if (!input.tenantId) {
    return {
      canUseLiveWorkspace: true,
      hasCompletedInitialSetup: true,
      isWorkspaceAdmin: false,
      migrationState: null,
      operationProfile: null,
      shouldRedirectAdminToSetup: false,
      shouldRedirectAdminToSuccess: false,
    }
  }

  const [migrationState, operationProfile, businessPolicy] = await Promise.all([
    getTenantInitialMigrationState(input.tenantId),
    getTenantOperationProfile(input.tenantId),
    getTenantBusinessProfitPolicy(input.tenantId),
  ])
  const canUseLiveWorkspace = migrationState.snapshot.canUseLiveFinancialWrites
  const hasCompletedInitialSetup =
    [
      "member_migration_in_progress",
      "migration_review",
      "finalized",
      "live_operations",
    ].includes(migrationState.snapshot.status) &&
    Boolean(operationProfile.reviewedAt) &&
    Boolean(businessPolicy.id)
  const isWorkspaceAdmin = hasAnyRole(input.role, workspaceAdminRoles)
  const isMemberMigrationNext =
    migrationState.snapshot.status === "member_migration_in_progress"
  const needsMigrationReview =
    migrationState.snapshot.status === "migration_review"

  return {
    canUseLiveWorkspace,
    hasCompletedInitialSetup,
    isWorkspaceAdmin,
    migrationState,
    // Returned so callers (the members checklist) reuse it instead of a
    // second identical query.
    operationProfile,
    shouldRedirectAdminToSetup:
      isWorkspaceAdmin &&
      !canUseLiveWorkspace &&
      (!hasCompletedInitialSetup || needsMigrationReview),
    shouldRedirectAdminToSuccess:
      isWorkspaceAdmin && !canUseLiveWorkspace && isMemberMigrationNext,
  }
}
