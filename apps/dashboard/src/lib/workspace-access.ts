import type { MembershipRole } from "@halaal-vest/db"

export const memberManagementRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "operations_officer",
]

export const financeManagementRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
]

export const allStaffRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
]

export const workspaceConfigurationRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "operations_officer",
]

export const workspaceAdminRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
]

export function hasAnyRole(
  role: MembershipRole | null | undefined,
  allowedRoles: MembershipRole[],
) {
  if (!role) {
    return false
  }

  return allowedRoles.includes(role)
}
