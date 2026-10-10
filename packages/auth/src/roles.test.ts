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

  test("limits Operation Profile changes to cooperative admins", () => {
    expect(roleCan("super_admin", "manage_operation_profile")).toBe(true)
    expect(roleCan("tenant_admin", "manage_operation_profile")).toBe(true)
    expect(roleCan("finance_officer", "manage_operation_profile")).toBe(false)
    expect(roleCan("operations_officer", "manage_operation_profile")).toBe(
      false
    )
    expect(roleCan("member", "manage_operation_profile")).toBe(false)
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

  test("lets staff view the work queue without widening finance decisions", () => {
    expect(roleCan("finance_officer", "view_admin_work_queue")).toBe(true)
    expect(roleCan("operations_officer", "view_admin_work_queue")).toBe(true)
    expect(roleCan("member", "view_admin_work_queue")).toBe(false)
    expect(roleCan("operations_officer", "record_collection_follow_up")).toBe(
      true
    )
    expect(roleCan("operations_officer", "review_receipts")).toBe(false)
  })

  test("separates contribution operations from Collection Source posting", () => {
    expect(roleCan("operations_officer", "view_contribution_operations")).toBe(
      true
    )
    expect(roleCan("operations_officer", "manage_member_contributions")).toBe(
      true
    )
    expect(
      roleCan("operations_officer", "manage_collection_source_batches")
    ).toBe(false)
    expect(roleCan("finance_officer", "manage_collection_source_batches")).toBe(
      true
    )
    expect(roleCan("member", "view_contribution_operations")).toBe(false)
  })

  test("keeps charge visibility separate from money-impacting commands", () => {
    expect(roleCan("operations_officer", "view_charge_operations")).toBe(true)
    expect(roleCan("operations_officer", "manage_charge_operations")).toBe(
      false
    )
    expect(roleCan("operations_officer", "correct_charge_operations")).toBe(
      false
    )
    expect(roleCan("finance_officer", "manage_charge_operations")).toBe(true)
    expect(roleCan("finance_officer", "correct_charge_operations")).toBe(true)
    expect(roleCan("member", "view_charge_operations")).toBe(false)
  })

  test("separates share and profit visibility from governed finance commands", () => {
    expect(roleCan("operations_officer", "view_share_profit_governance")).toBe(
      true
    )
    expect(roleCan("operations_officer", "review_share_request")).toBe(false)
    expect(
      roleCan("operations_officer", "approve_profit_distribution")
    ).toBe(false)
    expect(
      roleCan("operations_officer", "publish_profit_distribution")
    ).toBe(false)
    expect(roleCan("finance_officer", "review_share_request")).toBe(true)
    expect(roleCan("finance_officer", "approve_profit_distribution")).toBe(
      true
    )
    expect(roleCan("finance_officer", "publish_profit_distribution")).toBe(
      true
    )
    expect(roleCan("member", "view_share_profit_governance")).toBe(false)
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
