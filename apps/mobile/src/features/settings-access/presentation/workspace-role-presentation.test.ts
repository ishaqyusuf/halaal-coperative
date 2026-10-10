import { describe, expect, test } from "bun:test"

import {
  formatWorkspaceRoleLabel,
  presentWorkspaceRole,
  type WorkspaceRole,
} from "./workspace-role-presentation"

const adminRole: WorkspaceRole = {
  id: "membership-admin",
  isDefault: true,
  role: "tenant_admin",
  workspaceRole: "admin",
}

const memberRole: WorkspaceRole = {
  id: "membership-member",
  isDefault: false,
  role: "member",
  workspaceRole: "member",
}

describe("workspace role presentation", () => {
  test("presents the active role as readable current context", () => {
    expect(
      presentWorkspaceRole({
        activeMembershipId: adminRole.id,
        role: adminRole,
        switchingMembershipId: null,
      })
    ).toEqual({
      accessibilityLabel: "Tenant Admin workspace, Current",
      detail: "Manage this cooperative",
      icon: "ShieldCheck",
      isActive: true,
      isSwitching: false,
      label: "Tenant Admin",
      stateLabel: "Current",
    })
  })

  test("makes only the alternate role a switch action", () => {
    const presentation = presentWorkspaceRole({
      activeMembershipId: adminRole.id,
      role: memberRole,
      switchingMembershipId: null,
    })

    expect(presentation.accessibilityLabel).toBe("Switch to Member workspace")
    expect(presentation.detail).toBe("Your personal account")
    expect(presentation.isActive).toBe(false)
    expect(presentation.stateLabel).toBe("Switch")
  })

  test("announces a role switch while session rotation is running", () => {
    const presentation = presentWorkspaceRole({
      activeMembershipId: adminRole.id,
      role: memberRole,
      switchingMembershipId: memberRole.id,
    })

    expect(presentation.accessibilityLabel).toBe("Member workspace, Switching")
    expect(presentation.stateLabel).toBe("Switching")
  })

  test("formats durable cooperative role identifiers", () => {
    expect(formatWorkspaceRoleLabel("finance_officer")).toBe("Finance Officer")
  })
})
