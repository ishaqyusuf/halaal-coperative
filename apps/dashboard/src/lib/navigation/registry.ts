import type { CooperativeRole } from "@halaalvest/auth/roles"
import {
  createNavLink,
  createNavModule,
  createNavSection,
  createNavSubLink,
  initRoleAccess,
  type NavModule,
} from "@halaalvest/site-nav"
import {
  AnalyticsIcon,
  BusinessIcon,
  ChargesIcon,
  ContributionsIcon,
  CooperativeProfileIcon,
  DashboardIcon,
  DomainsIcon,
  ExperienceIcon,
  FinanceIcon,
  FinanceSetupIcon,
  FoodPurchaseIcon,
  ImportsIcon,
  HomeIcon,
  LoansIcon,
  MemberRegistryIcon,
  MembersIcon,
  MembershipApprovalsIcon,
  MonthlyRecordsIcon,
  NotificationIcon,
  OperationProfileIcon,
  PaymentReceiptsIcon,
  ProcurementIcon,
  ProjectFinancingIcon,
  ReportsIcon,
  RepaymentsIcon,
  RolesIcon,
  SettingsIcon,
  SharesIcon,
  SignupLinksIcon,
  SupportIcon,
  TrustReadinessIcon,
} from "./icons"

const adminRoles: CooperativeRole[] = ["super_admin", "tenant_admin"]
const financeRoles: CooperativeRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
]
const operationsRoles: CooperativeRole[] = [
  "super_admin",
  "tenant_admin",
  "operations_officer",
]
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
      createNavLink("Dashboard", DashboardIcon, "/", [], [])
        .level(1)
        .title("Dashboard").data,
      createNavLink(
        "Analytics",
        AnalyticsIcon,
        "/analytics",
        [],
        [role.in(...allStaffRoles)]
      ).title("Analytics").data,
      createNavLink(
        "Notifications",
        NotificationIcon,
        "/notifications",
        [],
        [
          role.in(
            "super_admin",
            "tenant_admin",
            "finance_officer",
            "operations_officer",
            "member"
          ),
        ]
      ).title("Notifications").data,
      createNavLink(
        "Reports",
        ReportsIcon,
        "/reports",
        [
          createNavSubLink("Activity report", "/reports/audit")
            .title("Activity report").data,
        ],
        [role.in(...adminRoles)]
      )
        .childPaths("/reports/audit")
        .title("Reports").data,
    ]),
  ]),
  createNavModule("Members", MembersIcon, "Profiles and operations", [
    createNavSection("membership", "Membership", [
      createNavLink(
        "Member Registry",
        MemberRegistryIcon,
        "/members",
        [],
        [role.in(...operationsRoles)]
      )
        .childPaths("/members")
        .title("Member registry").data,
      createNavLink(
        "Membership Approvals",
        MembershipApprovalsIcon,
        "/membership-approvals",
        [],
        [role.in(...operationsRoles)]
      )
        .childPaths("/membership-approvals")
        .title("Membership approvals").data,
      createNavLink(
        "Signup Links",
        SignupLinksIcon,
        "/member-signup-links",
        [],
        [role.in(...operationsRoles)]
      ).title("Member signup links").data,
      createNavLink(
        "Support",
        SupportIcon,
        "/support",
        [],
        [role.in(...allStaffRoles, "member")]
      ).title("Member support").data,
    ]),
  ]),
  createNavModule("Finance", FinanceIcon, "Contributions and controls", [
    createNavSection("collections", "Collections", [
      createNavLink(
        "Contributions",
        ContributionsIcon,
        "/contributions",
        [],
        [role.in(...allStaffRoles)]
      ).title("Contributions").data,
      createNavLink(
        "Payment Receipts",
        PaymentReceiptsIcon,
        "/payment-receipts",
        [],
        [role.in(...allStaffRoles, "member")]
      ).title("Payment receipts").data,
      createNavLink(
        "Shares",
        SharesIcon,
        "/shares",
        [],
        [role.in("member")]
      ).title("My shares").data,
      createNavLink(
        "Charges",
        ChargesIcon,
        "/charges",
        [],
        [role.in(...financeRoles)]
      ).title("Charges").data,
      createNavLink(
        "Monthly Records",
        MonthlyRecordsIcon,
        "/monthly-records",
        [],
        [role.in(...financeRoles)]
      ).title("Monthly records").data,
    ]),
    createNavSection("credit", "Credit", [
      createNavLink(
        "Loans",
        LoansIcon,
        "/loans",
        [],
        [role.in(...allStaffRoles, "member")]
      ).title("Loans").data,
      createNavLink(
        "Procurement",
        ProcurementIcon,
        "/procurement",
        [],
        [role.in(...allStaffRoles, "member")]
      ).title("Procurement").data,
      createNavLink(
        "Project Financing",
        ProjectFinancingIcon,
        "/project-financing",
        [],
        [role.in(...allStaffRoles, "member")]
      ).title("Project financing").data,
      createNavLink(
        "Repayments",
        RepaymentsIcon,
        "/repayments",
        [],
        [role.in(...financeRoles)]
      ).title("Repayments").data,
    ]),
    createNavSection("business", "Business", [
      createNavLink(
        "Business",
        BusinessIcon,
        "/business",
        [],
        [role.in(...financeRoles)]
      )
        .childPaths("/business")
        .title("Business").data,
      createNavLink(
        "Foodstuff Purchase",
        FoodPurchaseIcon,
        "/food-purchase",
        [],
        [role.in(...allStaffRoles, "member")]
      ).title("Foodstuff purchase").data,
    ]),
  ]),
  createNavModule("Experience", ExperienceIcon, "Routing and publishing", [
    createNavSection("workspace", "Workspace", [
      createNavLink(
        "Domains",
        DomainsIcon,
        "/domains",
        [],
        [role.in(...adminRoles)]
      ).title("Domains").data,
    ]),
  ]),
  createNavModule("Settings", SettingsIcon, "Profile and roles", [
    createNavSection("configuration", "Configuration", [
      createNavLink(
        "Cooperative Profile",
        CooperativeProfileIcon,
        "/settings/profile",
        [],
        [role.in(...adminRoles)]
      ).title("Cooperative profile").data,
      createNavLink(
        "Finance Setup",
        FinanceSetupIcon,
        "/settings/finance",
        [
          createNavSubLink("Overview", "/settings/finance").data,
          createNavSubLink("Business", "/settings/finance/business").data,
          createNavSubLink("Charges", "/settings/finance/charges").data,
          createNavSubLink("Loan", "/settings/finance/loan").data,
          createNavSubLink("Migration", "/settings/finance/migration").data,
          createNavSubLink("Shares", "/settings/finance/shares").data,
        ],
        [role.in("super_admin", "tenant_admin", "finance_officer")]
      )
        .childPaths("/settings/finance")
        .title("Finance setup").data,
      createNavLink(
        "Operation Profile",
        OperationProfileIcon,
        "/settings/operation-profile",
        [],
        [role.in(...adminRoles)]
      ).title("Operation profile").data,
      createNavLink(
        "Roles",
        RolesIcon,
        "/settings/roles",
        [],
        [role.in(...adminRoles)]
      ).title("Roles").data,
      createNavLink(
        "Trust Readiness",
        TrustReadinessIcon,
        "/settings/trust",
        [],
        [role.in(...adminRoles)]
      ).title("Trust readiness").data,
      createNavLink(
        "Imports",
        ImportsIcon,
        "/settings/imports",
        [
          createNavSubLink("Overview", "/settings/imports").data,
          createNavSubLink("Batches", "/settings/imports/batches").data,
          createNavSubLink("Members", "/settings/imports/members").data,
          createNavSubLink(
            "Contributions",
            "/settings/imports/contributions"
          ).data,
          createNavSubLink("Charges", "/settings/imports/charges").data,
          createNavSubLink(
            "Deduction sources",
            "/settings/imports/deduction-sources"
          ).data,
          createNavSubLink(
            "Loan products",
            "/settings/imports/loan-products"
          ).data,
          createNavSubLink(
            "Loan migrations",
            "/settings/imports/loan-migrations"
          ).data,
          createNavSubLink(
            "Repayment migrations",
            "/settings/imports/repayment-migrations"
          ).data,
        ],
        [
          role.in(
            "super_admin",
            "tenant_admin",
            "finance_officer",
            "operations_officer"
          ),
        ]
      )
        .childPaths("/settings/imports")
        .title("Imports").data,
    ]),
  ]),
]
