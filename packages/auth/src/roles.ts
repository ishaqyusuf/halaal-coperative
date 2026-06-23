export const cooperativeRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const

export type CooperativeRole = (typeof cooperativeRoles)[number]

const roleRank: Record<CooperativeRole, number> = {
  super_admin: 99,
  tenant_admin: 4,
  finance_officer: 3,
  operations_officer: 2,
  member: 1,
}

export function normalizeRole(
  input: string | null | undefined
): CooperativeRole | null {
  if (!input) {
    return null
  }

  const normalized = input.trim().toLowerCase().replace(/-/g, "_")

  return cooperativeRoles.includes(normalized as CooperativeRole)
    ? (normalized as CooperativeRole)
    : null
}

export function isRoleAtLeast(
  actual: CooperativeRole,
  required: CooperativeRole
): boolean {
  return roleRank[actual] >= roleRank[required]
}

export function canApproveLoan(role: CooperativeRole) {
  return (
    role === "super_admin" ||
    role === "tenant_admin" ||
    role === "finance_officer"
  )
}

export function getRoleDisplayName(
  role: CooperativeRole | null | undefined
) {
  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "tenant_admin":
      return "Tenant Admin"
    case "finance_officer":
      return "Finance Officer"
    case "operations_officer":
      return "Operations Officer"
    case "member":
      return "Member"
    default:
      return "Guest"
  }
}

export function getRoleScopeSummary(
  role: CooperativeRole | null | undefined
) {
  switch (role) {
    case "super_admin":
      return "Platform-level oversight across cooperative workspaces."
    case "tenant_admin":
      return "Administrative control over cooperative setup and operations."
    case "finance_officer":
      return "Financial operations across collections, charges, and repayments."
    case "operations_officer":
      return "Member operations, public site updates, and day-to-day coordination."
    case "member":
      return "Member-facing visibility into notifications and cooperative activity."
    default:
      return "No active cooperative role."
  }
}
