import {
  getTenantBusinessProfitPolicy,
  getTenantInitialMigrationState,
  getTenantOperationProfile,
  type MembershipRole,
} from "@halaalvest/db"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export const initialMigrationSetupPaths = [
  "/getting-started",
  "/onboarding-success",
  "/settings/operation-profile",
  "/settings/finance/migration",
  "/settings/imports",
  "/settings/profile",
]

function isMemberMigrationSetupPath(pathname: string) {
  return (
    pathname === "/members" ||
    /^\/members\/[^/]+$/.test(pathname) ||
    /^\/members\/[^/]+\/backfill(?:\/|$)/.test(pathname)
  )
}

export function isInitialMigrationSetupPath(pathname: string) {
  return (
    isMemberMigrationSetupPath(pathname) ||
    initialMigrationSetupPaths.some(
      (setupPath) =>
        pathname === setupPath || pathname.startsWith(`${setupPath}/`)
    )
  )
}

export function resolveInitialMigrationLayoutRedirect(input: {
  pathname: string
  shouldRedirectAdminToSetup: boolean
  shouldRedirectAdminToSuccess: boolean
}) {
  if (
    input.shouldRedirectAdminToSetup &&
    !isInitialMigrationSetupPath(input.pathname)
  ) {
    return "/getting-started"
  }

  return null
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
      shouldRedirectAdminToSetup: false,
      shouldRedirectAdminToSuccess: false,
    }
  }

  const [migrationState, operationProfile, businessPolicy] = await Promise.all([
    getTenantInitialMigrationState(input.tenantId),
    getTenantOperationProfile(input.tenantId),
    getTenantBusinessProfitPolicy(input.tenantId),
  ])
  const canUseLiveWorkspace =
    migrationState.snapshot.canUseLiveFinancialWrites
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
    shouldRedirectAdminToSetup:
      isWorkspaceAdmin &&
      !canUseLiveWorkspace &&
      (!hasCompletedInitialSetup || needsMigrationReview),
    shouldRedirectAdminToSuccess:
      isWorkspaceAdmin && !canUseLiveWorkspace && isMemberMigrationNext,
  }
}
