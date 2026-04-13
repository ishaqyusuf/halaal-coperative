export const cooperativeRoles = [
  "super-admin",
  "tenant-admin",
  "finance-officer",
  "operations-officer",
  "member",
] as const

export type CooperativeRole = (typeof cooperativeRoles)[number]

export function canApproveLoan(role: CooperativeRole) {
  return role === "super-admin" || role === "tenant-admin" || role === "finance-officer"
}
