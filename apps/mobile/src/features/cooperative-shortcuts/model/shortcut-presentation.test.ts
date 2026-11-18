import { describe, expect, test } from "bun:test"
import type { CooperativeWorkspace } from "./shortcut-policy"
import { roleDescription, rolesLine, shortcutPill, splitWorkspaces, workspaceMark } from "./shortcut-presentation"

const ws = (id: string, isCurrent: boolean, roles: [string, string, "admin" | "member"][]): CooperativeWorkspace => ({
  isCurrent,
  memberships: roles.map(([mid, role, workspaceRole]) => ({ id: mid, isDefault: false, role, workspaceRole })),
  tenant: { id, logoUrl: null, mark: id.toLowerCase(), name: `${id} Cooperative` },
})

describe("shortcut presentation", () => {
  test("pills for support and pin states", () => {
    expect(shortcutPill({ association: null, support: "checking" })).toEqual({ label: "Checking", tone: "neutral" })
    expect(shortcutPill({ association: null, support: "unsupported_launcher" }).label).toBe("Unavailable")
    expect(shortcutPill({ association: null, support: "user_locked" }).label).toBe("Locked")
    expect(shortcutPill({ association: null, support: "supported" }).label).toBe("Not added")
    const status = (s: string) => ({ association: { status: s } as never, support: "supported" as const })
    expect(shortcutPill(status("request_sent"))).toEqual({ label: "Waiting", tone: "warning" })
    expect(shortcutPill(status("pin_observed"))).toEqual({ label: "On home screen", tone: "success" })
    expect(shortcutPill(status("disabled")).label).toBe("Disabled")
  })

  test("splits the current cooperative, its other roles and the rest", () => {
    const list = [
      ws("AS", true, [["as1", "member", "member"], ["as2", "tenant_admin", "admin"]]),
      ws("BT", false, [["bt1", "member", "member"]]),
    ]
    const split = splitWorkspaces(list, "as1")
    expect(split.current?.tenant.id).toBe("AS")
    expect(split.currentRole?.id).toBe("as1")
    expect(split.otherRoles.map((m) => m.id)).toEqual(["as2"])
    expect(split.others.map((w) => w.tenant.id)).toEqual(["BT"])
    expect(rolesLine(list[0]!)).toBe("Member · Tenant Admin")
    expect(workspaceMark(list[0]!)).toBe("AS")
    expect(roleDescription({ workspaceRole: "member" })).toBe("Your savings, financing and statements")
    expect(roleDescription({ workspaceRole: "admin" })).toBe("Manage the cooperative")
  })
})
