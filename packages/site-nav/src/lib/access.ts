import type { Access } from "./types"

export const navHasAccess = (
  type: Access["type"],
  equator: Access["equator"],
  ...values: string[]
) => ({ equator, type, values }) satisfies Access

export const initRoleAccess = <Role extends string>(_role?: Role) => ({
  every: (...roles: Role[]) => navHasAccess("role", "every", ...roles),
  in: (...roles: Role[]) => navHasAccess("role", "in", ...roles),
  is: (role: Role) => navHasAccess("role", "is", role),
  isNot: (role: Role) => navHasAccess("role", "isNot", role),
  notIn: (...roles: Role[]) => navHasAccess("role", "notIn", ...roles),
  some: (...roles: Role[]) => navHasAccess("role", "some", ...roles),
})

export const initPermAccess = <Permission extends string>(_permission?: Permission) => ({
  every: (...permissions: Permission[]) => navHasAccess("permission", "every", ...permissions),
  in: (...permissions: Permission[]) => navHasAccess("permission", "in", ...permissions),
  is: (permission: Permission) => navHasAccess("permission", "is", permission),
  isNot: (permission: Permission) => navHasAccess("permission", "isNot", permission),
  notIn: (...permissions: Permission[]) => navHasAccess("permission", "notIn", ...permissions),
  some: (...permissions: Permission[]) => navHasAccess("permission", "some", ...permissions),
})

export function validateRules(
  accessList: Access[] = [],
  can?: Record<string, boolean>,
  _userId?: string,
  roleInput?: string | { name?: string } | null,
) {
  const permissionMap = Object.fromEntries(
    Object.entries(can ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  )
  const role =
    (typeof roleInput === "string" ? roleInput : roleInput?.name)?.toLowerCase() ?? null

  return accessList.every((access) => {
    switch (access.type) {
      case "permission":
        switch (access.equator) {
          case "every":
          case "is":
            return access.values.every((permission) => permissionMap[permission.toLowerCase()])
          case "in":
          case "some":
            return access.values.some((permission) => permissionMap[permission.toLowerCase()])
          case "isNot":
          case "notIn":
            return access.values.every((permission) => !permissionMap[permission.toLowerCase()])
        }
        break
      case "role":
        switch (access.equator) {
          case "every":
          case "is":
            return access.values.every((candidate) => role === candidate.toLowerCase())
          case "in":
          case "some":
            return access.values.some((candidate) => role === candidate.toLowerCase())
          case "isNot":
          case "notIn":
            return access.values.every((candidate) => role !== candidate.toLowerCase())
        }
        break
    }

    return true
  })
}
