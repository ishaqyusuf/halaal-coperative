import type { CooperativeRole } from "@halaal-vest/auth"
import { createNavLink, createNavModule, createNavSection, initRoleAccess, type NavModule } from "@halaal-vest/site-nav"
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
      createNavLink("Dashboard", HomeIcon, "/app", [], []).level(1).title("Dashboard").data,
      createNavLink("Notifications", NotificationIcon, "/app/notifications", [], [
        role.in("super_admin", "tenant_admin", "finance_officer", "operations_officer", "member"),
      ])
        .title("Notifications")
        .data,
      createNavLink("Reports", ReportsIcon, "/app/reports", [], [role.in(...adminRoles)])
        .childPaths("/app/reports/audit")
        .title("Reports")
        .data,
    ]),
  ]),
  createNavModule("Members", MembersIcon, "Profiles and operations", [
    createNavSection("membership", "Membership", [
      createNavLink("Member Registry", MembersIcon, "/app/members", [], [role.in(...operationsRoles)])
        .childPaths("/app/members")
        .title("Member registry")
        .data,
      createNavLink("Membership Approvals", MembersIcon, "/app/membership-approvals", [], [
        role.in(...operationsRoles),
      ])
        .childPaths("/app/membership-approvals")
        .title("Membership approvals")
        .data,
    ]),
  ]),
  createNavModule("Finance", FinanceIcon, "Contributions and controls", [
    createNavSection("collections", "Collections", [
      createNavLink("Contributions", FinanceIcon, "/app/contributions", [], [role.in(...allStaffRoles)])
        .title("Contributions")
        .data,
      createNavLink("Charges", FinanceIcon, "/app/charges", [], [role.in(...financeRoles)])
        .title("Charges")
        .data,
    ]),
    createNavSection("credit", "Credit", [
      createNavLink("Loans", FinanceIcon, "/app/loans", [], [role.in(...allStaffRoles)])
        .title("Loans")
        .data,
      createNavLink("Repayments", FinanceIcon, "/app/repayments", [], [role.in(...financeRoles)])
        .title("Repayments")
        .data,
    ]),
  ]),
  createNavModule("Experience", ExperienceIcon, "Routing and publishing", [
    createNavSection("workspace", "Workspace", [
      createNavLink("Domains", ExperienceIcon, "/app/domains", [], [role.in(...adminRoles)])
        .title("Domains")
        .data,
    ]),
  ]),
  createNavModule("Settings", SettingsIcon, "Profile and roles", [
    createNavSection("configuration", "Configuration", [
      createNavLink("Cooperative Profile", SettingsIcon, "/app/settings/profile", [], [
        role.in(...adminRoles),
      ])
        .title("Cooperative profile")
        .data,
      createNavLink("Roles", SettingsIcon, "/app/settings/roles", [], [role.in(...adminRoles)])
        .title("Roles")
        .data,
      createNavLink("Imports", SettingsIcon, "/app/settings/imports", [], [
        role.in("super_admin", "tenant_admin", "finance_officer", "operations_officer"),
      ])
        .title("Imports")
        .data,
    ]),
  ]),
]
