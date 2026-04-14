import type { CooperativeRole } from "@halaal-vest/auth"
import type { DashboardNavModule } from "./types"

const adminRoles: CooperativeRole[] = ["super_admin", "tenant_admin"]
const financeRoles: CooperativeRole[] = ["super_admin", "tenant_admin", "finance_officer"]
const operationsRoles: CooperativeRole[] = ["super_admin", "tenant_admin", "operations_officer"]
const allStaffRoles: CooperativeRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
]

export const dashboardNavRegistry: DashboardNavModule[] = [
  {
    key: "overview",
    title: "Home",
    subtitle: "Workspace overview",
    workspace: "overview",
    sections: [
      {
        key: "general",
        title: "General",
        items: [
          {
            href: "/",
            key: "overview-home",
            title: "Dashboard",
          },
          {
            href: "/notifications",
            key: "overview-notifications",
            roles: ["super_admin", "tenant_admin", "finance_officer", "operations_officer", "member"],
            title: "Notifications",
          },
          {
            href: "/reports",
            key: "overview-reports",
            roles: adminRoles,
            title: "Reports",
          },
        ],
      },
    ],
  },
  {
    key: "members",
    title: "Members",
    subtitle: "Profiles and operations",
    workspace: "members",
    sections: [
      {
        key: "membership",
        title: "Membership",
        items: [
          {
            href: "/members",
            key: "members-list",
            roles: operationsRoles,
            title: "Member registry",
          },
          {
            href: "/tenant-site",
            key: "members-tenant-site",
            roles: ["super_admin", "tenant_admin", "operations_officer", "member"],
            title: "Tenant site",
          },
        ],
      },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    subtitle: "Contributions and controls",
    workspace: "finance",
    sections: [
      {
        key: "collections",
        title: "Collections",
        items: [
          {
            href: "/contributions",
            key: "finance-contributions",
            roles: allStaffRoles,
            title: "Contributions",
          },
          {
            href: "/charges",
            key: "finance-charges",
            roles: financeRoles,
            title: "Charges",
          },
        ],
      },
      {
        key: "credit",
        title: "Credit",
        items: [
          {
            href: "/loans",
            key: "finance-loans",
            roles: allStaffRoles,
            title: "Loans",
          },
          {
            href: "/repayments",
            key: "finance-repayments",
            roles: financeRoles,
            title: "Repayments",
          },
        ],
      },
    ],
  },
  {
    key: "experience",
    title: "Experience",
    subtitle: "Routing and publishing",
    workspace: "experience",
    sections: [
      {
        key: "workspace",
        title: "Workspace",
        items: [
          {
            href: "/domains",
            key: "experience-domains",
            roles: adminRoles,
            title: "Domains",
          },
          {
            href: "/tenant-site",
            key: "experience-site",
            roles: ["super_admin", "tenant_admin", "operations_officer"],
            title: "Public site",
          },
        ],
      },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    subtitle: "Profile and roles",
    workspace: "settings",
    sections: [
      {
        key: "configuration",
        title: "Configuration",
        items: [
          {
            href: "/settings/profile",
            key: "settings-profile",
            roles: adminRoles,
            title: "Cooperative profile",
          },
          {
            href: "/settings/roles",
            key: "settings-roles",
            roles: adminRoles,
            title: "Roles",
          },
          {
            href: "/settings/imports",
            key: "settings-imports",
            roles: ["super_admin", "tenant_admin", "finance_officer", "operations_officer"],
            title: "Imports",
          },
        ],
      },
    ],
  },
]
