import { findMembershipsForUserAsync, type MembershipRecord } from "./auth"
import { getTenantByIdAsync, type TenantRecord } from "./tenants"

export type MobileWorkspaceTenant = Pick<
  TenantRecord,
  "dataClassification" | "id" | "name" | "status"
>

export type MobileWorkspace = {
  isCurrent: boolean
  memberships: Pick<MembershipRecord, "id" | "isDefault" | "role">[]
  tenant: Pick<TenantRecord, "id" | "name">
}

/**
 * Projects the signed user's own memberships into selectable workspaces.
 *
 * Results are selection hints only: `auth.mobile.switchRole` revalidates the
 * membership and tenant state before issuing a replacement session. A
 * QA-authorized session is bound to its current tenant, and an ordinary
 * session never discovers another QA-classified tenant.
 */
export function projectMobileWorkspaces(input: {
  currentTenantId: string
  memberships: readonly MembershipRecord[]
  qaSession: boolean
  tenants: readonly MobileWorkspaceTenant[]
  userId: string
}): MobileWorkspace[] {
  const tenants = new Map(input.tenants.map((tenant) => [tenant.id, tenant]))
  const grouped = new Map<string, MobileWorkspace>()

  for (const membership of input.memberships) {
    if (membership.userId !== input.userId) continue
    const tenant = tenants.get(membership.tenantId)
    if (!tenant || tenant.status !== "active") continue
    const isCurrent = tenant.id === input.currentTenantId
    if (input.qaSession && !isCurrent) continue
    if (!input.qaSession && !isCurrent && tenant.dataClassification === "qa") {
      continue
    }

    const workspace = grouped.get(tenant.id) ?? {
      isCurrent,
      memberships: [],
      tenant: { id: tenant.id, name: tenant.name },
    }
    workspace.memberships.push({
      id: membership.id,
      isDefault: membership.isDefault,
      role: membership.role,
    })
    grouped.set(tenant.id, workspace)
  }

  return [...grouped.values()].sort((left, right) =>
    left.isCurrent === right.isCurrent
      ? left.tenant.name.localeCompare(right.tenant.name)
      : left.isCurrent
        ? -1
        : 1
  )
}

export async function listMobileWorkspacesForUserAsync(input: {
  currentTenantId: string
  qaSession: boolean
  userId: string
}) {
  const memberships = await findMembershipsForUserAsync(input.userId)
  const tenantIds = [
    ...new Set(memberships.map((membership) => membership.tenantId)),
  ]
  const tenants = (
    await Promise.all(tenantIds.map((tenantId) => getTenantByIdAsync(tenantId)))
  ).filter((tenant): tenant is TenantRecord => tenant !== null)

  return projectMobileWorkspaces({ ...input, memberships, tenants })
}
