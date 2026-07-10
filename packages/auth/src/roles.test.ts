import { describe, expect, test } from "bun:test"
import {
  cooperativePermissionModules,
  cooperativeRolePermissions,
  getRolePermissions,
  roleCan,
} from "./roles"

describe("cooperative role permission matrix", () => {
  test("keeps every declared permission attached to a known module", () => {
    const modules = new Set(cooperativePermissionModules)

    for (const permission of cooperativeRolePermissions) {
      expect(modules.has(permission.module)).toBe(true)
      expect(permission.allowedRoles.length).toBeGreaterThan(0)
    }
  })

  test("limits role provisioning to admin roles", () => {
    expect(roleCan("super_admin", "manage_roles")).toBe(true)
    expect(roleCan("tenant_admin", "manage_roles")).toBe(true)
    expect(roleCan("finance_officer", "manage_roles")).toBe(false)
    expect(roleCan("operations_officer", "manage_roles")).toBe(false)
    expect(roleCan("member", "manage_roles")).toBe(false)
  })

  test("lets finance roles review receipts while members only submit", () => {
    expect(roleCan("finance_officer", "review_receipts")).toBe(true)
    expect(roleCan("member", "submit_receipts")).toBe(true)
    expect(roleCan("member", "review_receipts")).toBe(false)
  })

  test("documents food purchase committee and finance boundaries", () => {
    expect(roleCan("finance_officer", "release_food_purchase_funds")).toBe(true)
    expect(roleCan("finance_officer", "review_food_purchase_accounting")).toBe(
      true
    )
    expect(roleCan("operations_officer", "release_food_purchase_funds")).toBe(
      false
    )
    expect(
      roleCan("operations_officer", "review_food_purchase_applications")
    ).toBe(true)
    expect(
      roleCan("operations_officer", "submit_food_purchase_accounting")
    ).toBe(true)
    expect(roleCan("member", "apply_food_purchase")).toBe(true)
    expect(roleCan("member", "review_food_purchase_applications")).toBe(false)
  })

  test("summarizes member self-service permissions without staff-only actions", () => {
    const memberActions = getRolePermissions("member").map(
      (permission) => permission.action
    )

    expect(memberActions).toContain("view_own_member_profile")
    expect(memberActions).toContain("submit_procurement")
    expect(memberActions).toContain("submit_share_request")
    expect(memberActions).toContain("apply_food_purchase")
    expect(memberActions).not.toContain("review_financing")
    expect(memberActions).not.toContain("review_food_purchase_applications")
    expect(memberActions).not.toContain("view_reports")
  })
})
