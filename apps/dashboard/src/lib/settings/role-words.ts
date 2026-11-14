import type { MembershipRole } from "@halaalvest/db"

/** Plain names for roles on the Roles page. */
export function getRoleWord(role: MembershipRole) {
  switch (role) {
    case "super_admin":
      return "Platform admin"
    case "tenant_admin":
      return "Admin"
    case "finance_officer":
      return "Finance officer"
    case "operations_officer":
      return "Operations officer"
    default:
      return "Member"
  }
}

/** One short line on what a role can do. */
export function getRoleAbility(role: MembershipRole) {
  switch (role) {
    case "super_admin":
      return "Halaalvest staff. Can see every cooperative."
    case "tenant_admin":
      return "Everything, including settings, roles and the web address."
    case "finance_officer":
      return "Money: payments, loans, charges, shares and reports."
    case "operations_officer":
      return "Members, requests and day-to-day work."
    default:
      return "Their own money, requests and statements."
  }
}

/** The roles shown in "What each role can do", most powerful first. */
export const explainedRoles: MembershipRole[] = [
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
]

/** Staff roles an admin can give from the Add a person form. */
export function getGivableRoles(actorRole: MembershipRole | null | undefined) {
  const roles: MembershipRole[] = [
    "tenant_admin",
    "finance_officer",
    "operations_officer",
  ]

  return actorRole === "super_admin" ? [...roles, "super_admin" as const] : roles
}

/** What removing one role does, for the confirm. */
export function getRemoveRoleEffect({
  name,
  otherRoles,
  role,
}: {
  name: string
  otherRoles: MembershipRole[]
  role: MembershipRole
}) {
  if (otherRoles.length === 0) {
    return `${name} won't be able to sign in to this cooperative any more.`
  }

  const kept = otherRoles.map((other) => getRoleWord(other).toLowerCase())
  const loses =
    role === "tenant_admin" || role === "super_admin"
      ? "They won't be able to change settings or roles."
      : `They lose: ${getRoleAbility(role).toLowerCase()}`

  return `${name} stays a ${kept.join(" and ")}. ${loses}`
}
