import {
  getTenantInitialMigrationState,
  type MembershipRole,
} from "@halaalvest/db"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export const initialMigrationSetupPaths = [
  "/getting-started",
  "/settings/operation-profile",
  "/settings/finance/migration",
  "/settings/imports",
  "/settings/profile",
]

export function isInitialMigrationSetupPath(pathname: string) {
  return initialMigrationSetupPaths.some(
    (setupPath) =>
      pathname === setupPath || pathname.startsWith(`${setupPath}/`)
  )
}

export async function resolveInitialMigrationSetupGate(input: {
  role: MembershipRole | null | undefined
  tenantId: string | null | undefined
}) {
  if (!input.tenantId) {
    return {
      canUseLiveWorkspace: true,
      isWorkspaceAdmin: false,
      migrationState: null,
      shouldRedirectAdminToSetup: false,
    }
  }

  const migrationState = await getTenantInitialMigrationState(input.tenantId)
  const canUseLiveWorkspace =
    migrationState.snapshot.canUseLiveFinancialWrites
  const isWorkspaceAdmin = hasAnyRole(input.role, workspaceAdminRoles)

  return {
    canUseLiveWorkspace,
    isWorkspaceAdmin,
    migrationState,
    shouldRedirectAdminToSetup: isWorkspaceAdmin && !canUseLiveWorkspace,
  }
}
