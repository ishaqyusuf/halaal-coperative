import {
  getTenantBusinessProfitPolicy,
  getTenantInitialMigrationState,
  getTenantMigrationWriteAccess,
  type MembershipRole,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import { cache } from "react"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export {
  getNavigationLockLabel,
  initialMigrationSetupPaths,
  isInitialMigrationSetupPath,
  navigationLockedAfterSetupLabel,
  resolveInitialMigrationLayoutRedirect,
} from "./setup-gate-routing"

// One migration-state read per request: the sidebar layout's gate and page
// loaders that need the same state (for example /members) share it.
export const getRequestInitialMigrationState = cache((tenantId: string) =>
  getTenantInitialMigrationState(tenantId)
)

// The live-write gates come from one tenant row. The full migration state
// (~17 queries) is only needed while migration tools are open: during setup,
// or under an emergency unlock. A live cooperative's request skips it.
export const getRequestMigrationGateState = cache(async (tenantId: string) => {
  const writeAccess = await getTenantMigrationWriteAccess(tenantId)

  return {
    migrationState: writeAccess.canUseMigrationTools
      ? await getRequestInitialMigrationState(tenantId)
      : null,
    writeAccess,
  }
})

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

  const [{ migrationState, writeAccess }, operationProfile, businessPolicy] =
    await Promise.all([
      getRequestMigrationGateState(input.tenantId),
      getRequestTenantOperationProfile(input.tenantId),
      getTenantBusinessProfitPolicy(input.tenantId),
    ])
  const canUseLiveWorkspace = writeAccess.canUseLiveFinancialWrites
  // A live cooperative is past every setup stage; otherwise the full state
  // is loaded (migration tools are open whenever live writes are closed).
  const migrationStatus = migrationState?.snapshot.status
  const hasCompletedInitialSetup =
    (canUseLiveWorkspace ||
      (migrationStatus !== undefined &&
        [
          "member_migration_in_progress",
          "migration_review",
          "finalized",
          "live_operations",
        ].includes(migrationStatus))) &&
    Boolean(operationProfile.reviewedAt) &&
    Boolean(businessPolicy.id)
  const isWorkspaceAdmin = hasAnyRole(input.role, workspaceAdminRoles)
  const isMemberMigrationNext =
    migrationStatus === "member_migration_in_progress"
  const needsMigrationReview = migrationStatus === "migration_review"

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
