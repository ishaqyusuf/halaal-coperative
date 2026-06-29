import type { CooperativeRole } from "@halaalvest/auth/roles"
import { createNavLink, createNavModule, createNavSection, initRoleAccess, type NavModule } from "@halaalvest/site-nav"
import {
  ExperienceIcon,
  FinanceIcon,
  HomeIcon,
  MembersIcon,
  NotificationIcon,
  ReportsIcon,
  SettingsIcon,
} from "./icons"

const adminRoles: CooperativeRole[] = ["super_admin", "tenant_admin"]
const financeRoles: CooperativeRole[] = ["super_admin", "tenant_admin", "finance_officer"]
const operationsRoles: CooperativeRole[] = ["super_admin", "tenant_admin", "operations_officer"]
const allStaffRoles: CooperativeRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
]

const role = initRoleAccess<CooperativeRole>()

export const dashboardNavRegistry: NavModule[] = [
  createNavModule("Home", HomeIcon, "Workspace overview", [
      createNavSection("general", "General", [
      createNavLink("Dashboard", HomeIcon, "/", [], []).level(1).title("Dashboard").data,
      createNavLink("Analytics", ReportsIcon, "/analytics", [], [
        role.in(...allStaffRoles),
      ])
        .title("Analytics")
        .data,
      createNavLink("Notifications", NotificationIcon, "/notifications", [], [
        role.in("super_admin", "tenant_admin", "finance_officer", "operations_officer", "member"),
      ])
        .title("Notifications")
        .data,
      createNavLink("Reports", ReportsIcon, "/reports", [], [role.in(...adminRoles)])
        .childPaths("/reports/audit")
        .title("Reports")
        .data,
    ]),
  ]),
  createNavModule("Members", MembersIcon, "Profiles and operations", [
    createNavSection("membership", "Membership", [
      createNavLink("Member Registry", MembersIcon, "/members", [], [role.in(...operationsRoles)])
        .childPaths("/members")
        .title("Member registry")
        .data,
      createNavLink("Membership Approvals", MembersIcon, "/membership-approvals", [], [
        role.in(...operationsRoles),
      ])
        .childPaths("/membership-approvals")
        .title("Membership approvals")
        .data,
      createNavLink("Signup Links", MembersIcon, "/member-signup-links", [], [
        role.in(...operationsRoles),
      ])
        .title("Member signup links")
        .data,
    ]),
  ]),
  createNavModule("Finance", FinanceIcon, "Contributions and controls", [
    createNavSection("collections", "Collections", [
      createNavLink("Contributions", FinanceIcon, "/contributions", [], [role.in(...allStaffRoles)])
        .title("Contributions")
        .data,
      createNavLink("Charges", FinanceIcon, "/charges", [], [role.in(...financeRoles)])
        .title("Charges")
        .data,
      createNavLink("Monthly Records", FinanceIcon, "/monthly-records", [], [
        role.in(...financeRoles),
      ])
        .title("Monthly records")
        .data,
    ]),
    createNavSection("credit", "Credit", [
      createNavLink("Loans", FinanceIcon, "/loans", [], [role.in(...allStaffRoles)])
        .title("Loans")
        .data,
      createNavLink("Repayments", FinanceIcon, "/repayments", [], [role.in(...financeRoles)])
        .title("Repayments")
        .data,
    ]),
  ]),
  createNavModule("Experience", ExperienceIcon, "Routing and publishing", [
    createNavSection("workspace", "Workspace", [
      createNavLink("Domains", ExperienceIcon, "/domains", [], [role.in(...adminRoles)])
        .title("Domains")
        .data,
    ]),
  ]),
  createNavModule("Settings", SettingsIcon, "Profile and roles", [
    createNavSection("configuration", "Configuration", [
      createNavLink("Cooperative Profile", SettingsIcon, "/settings/profile", [], [
        role.in(...adminRoles),
      ])
        .title("Cooperative profile")
        .data,
      createNavLink("Finance Setup", SettingsIcon, "/settings/finance", [], [
        role.in("super_admin", "tenant_admin", "finance_officer"),
      ])
        .childPaths("/settings/finance")
        .title("Finance setup")
        .data,
      createNavLink("Roles", SettingsIcon, "/settings/roles", [], [role.in(...adminRoles)])
        .title("Roles")
        .data,
      createNavLink("Imports", SettingsIcon, "/settings/imports", [], [
        role.in("super_admin", "tenant_admin", "finance_officer", "operations_officer"),
      ])
        .title("Imports")
        .data,
    ]),
  ]),
]
