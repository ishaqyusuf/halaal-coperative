import { describe, expect, test } from "bun:test"

import type { MembershipRecord } from "./auth"
import {
  projectMobileWorkspaces,
  type MobileWorkspaceTenant,
} from "./mobile-workspaces"

const tenants: MobileWorkspaceTenant[] = [
  {
    dataClassification: "live",
    id: "t-amanah",
    name: "Amanah",
    status: "active",
  },
  {
    dataClassification: "live",
    id: "t-barakah",
    name: "Barakah",
    status: "active",
  },
  {
    dataClassification: "live",
    id: "t-closed",
    name: "Closed",
    status: "suspended",
  },
  { dataClassification: "qa", id: "t-qa", name: "QA Coop", status: "active" },
]

function membership(
  id: string,
  tenantId: string,
  role: MembershipRecord["role"] = "member",
  userId = "user-a",
  isDefault = false
): MembershipRecord {
  return { id, isDefault, role, tenantId, userId }
}

const memberships = [
  membership("m-amanah-admin", "t-amanah", "tenant_admin", "user-a", true),
  membership("m-amanah-member", "t-amanah"),
  membership("m-barakah", "t-barakah"),
  membership("m-closed", "t-closed"),
  membership("m-qa", "t-qa"),
  membership("m-foreign", "t-barakah", "tenant_admin", "user-b"),
]

describe("projectMobileWorkspaces", () => {
  test("groups only the signed user's memberships in active tenants, current first", () => {
    const workspaces = projectMobileWorkspaces({
      currentTenantId: "t-barakah",
      memberships,
      qaSession: false,
      tenants,
      userId: "user-a",
    })

    expect(workspaces.map((workspace) => workspace.tenant.id)).toEqual([
      "t-barakah",
      "t-amanah",
    ])
    expect(workspaces[0]?.isCurrent).toBe(true)
    expect(workspaces[0]?.memberships).toEqual([
      { id: "m-barakah", isDefault: false, role: "member" },
    ])
    expect(workspaces[1]?.memberships.map((item) => item.id)).toEqual([
      "m-amanah-admin",
      "m-amanah-member",
    ])
  })

  test("never lists foreign, suspended or unknown tenants", () => {
    const ids = projectMobileWorkspaces({
      currentTenantId: "t-amanah",
      memberships: [...memberships, membership("m-ghost", "t-missing")],
      qaSession: false,
      tenants,
      userId: "user-a",
    }).flatMap((workspace) => workspace.memberships.map((item) => item.id))

    expect(ids).not.toContain("m-foreign")
    expect(ids).not.toContain("m-closed")
    expect(ids).not.toContain("m-ghost")
  })

  test("binds a QA-authorized session to its current tenant", () => {
    const workspaces = projectMobileWorkspaces({
      currentTenantId: "t-qa",
      memberships,
      qaSession: true,
      tenants,
      userId: "user-a",
    })

    expect(workspaces.map((workspace) => workspace.tenant.id)).toEqual(["t-qa"])
  })

  test("an ordinary session does not discover another QA tenant", () => {
    const ids = projectMobileWorkspaces({
      currentTenantId: "t-amanah",
      memberships,
      qaSession: false,
      tenants,
      userId: "user-a",
    }).map((workspace) => workspace.tenant.id)

    expect(ids).not.toContain("t-qa")
  })
})
