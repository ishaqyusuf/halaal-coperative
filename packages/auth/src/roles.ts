export const cooperativeRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const

export type CooperativeRole = (typeof cooperativeRoles)[number]

export const cooperativePermissionModules = [
  "members",
  "payments",
  "financing",
  "procurement",
  "shares",
  "food_purchase",
  "project_financing",
  "support",
  "reports",
  "settings",
] as const

export type CooperativePermissionModule =
  (typeof cooperativePermissionModules)[number]

export type CooperativeRolePermission = {
  action: string
  allowedRoles: readonly CooperativeRole[]
  module: CooperativePermissionModule
  summary: string
}

const adminRoles = ["super_admin", "tenant_admin"] as const
const financeRoles = ["super_admin", "tenant_admin", "finance_officer"] as const
const staffRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
] as const
const allRoles = [...staffRoles, "member"] as const

export const cooperativeRolePermissions = [
  {
    action: "manage_members",
    allowedRoles: ["super_admin", "tenant_admin", "operations_officer"],
    module: "members",
    summary: "Create, update, approve, and maintain member records.",
  },
  {
    action: "view_own_member_profile",
    allowedRoles: allRoles,
    module: "members",
    summary: "View the linked member profile and member-scoped status.",
  },
  {
    action: "submit_receipts",
    allowedRoles: allRoles,
    module: "payments",
    summary: "Submit payment receipts before finance review.",
  },
  {
    action: "review_receipts",
    allowedRoles: financeRoles,
    module: "payments",
    summary: "Approve, reject, request correction, and adjust receipt allocations.",
  },
  {
    action: "submit_financing",
    allowedRoles: staffRoles,
    module: "financing",
    summary: "Create member financing requests from the staff workspace.",
  },
  {
    action: "review_financing",
    allowedRoles: financeRoles,
    module: "financing",
    summary: "Review, approve, disburse, and service member financing.",
  },
  {
    action: "respond_as_guarantor",
    allowedRoles: allRoles,
    module: "financing",
    summary: "Respond to own guarantor approval requests.",
  },
  {
    action: "submit_procurement",
    allowedRoles: allRoles,
    module: "procurement",
    summary: "Submit cooperative item-purchase requests.",
  },
  {
    action: "review_procurement",
    allowedRoles: financeRoles,
    module: "procurement",
    summary: "Review procurement requests, record purchase evidence, and service schedules.",
  },
  {
    action: "submit_share_request",
    allowedRoles: allRoles,
    module: "shares",
    summary: "Submit optional share requests when unit shareholding is active.",
  },
  {
    action: "review_share_request",
    allowedRoles: financeRoles,
    module: "shares",
    summary: "Review optional share requests and post approved share capital.",
  },
  {
    action: "apply_food_purchase",
    allowedRoles: allRoles,
    module: "food_purchase",
    summary: "Apply for an open food-purchase cycle.",
  },
  {
    action: "release_food_purchase_funds",
    allowedRoles: financeRoles,
    module: "food_purchase",
    summary: "Release monthly committee funds for an open food-purchase cycle.",
  },
  {
    action: "review_food_purchase_applications",
    allowedRoles: staffRoles,
    module: "food_purchase",
    summary: "Review member food-purchase applications on behalf of the committee.",
  },
  {
    action: "submit_food_purchase_accounting",
    allowedRoles: staffRoles,
    module: "food_purchase",
    summary: "Submit end-of-month committee accounting and profit evidence.",
  },
  {
    action: "review_food_purchase_accounting",
    allowedRoles: financeRoles,
    module: "food_purchase",
    summary: "Approve or reject submitted committee accounting evidence.",
  },
  {
    action: "submit_project_financing",
    allowedRoles: allRoles,
    module: "project_financing",
    summary: "Submit member business funding requests.",
  },
  {
    action: "review_project_financing",
    allowedRoles: financeRoles,
    module: "project_financing",
    summary: "Review project financing requests and capture approved structure.",
  },
  {
    action: "manage_support",
    allowedRoles: staffRoles,
    module: "support",
    summary: "Manage member support cases, replies, assignment, and resolution evidence.",
  },
  {
    action: "approve_money_impact_support",
    allowedRoles: financeRoles,
    module: "support",
    summary: "Approve support-case resolutions that require financial adjustment.",
  },
  {
    action: "view_reports",
    allowedRoles: financeRoles,
    module: "reports",
    summary: "View reports and export governance evidence.",
  },
  {
    action: "manage_finance_settings",
    allowedRoles: financeRoles,
    module: "settings",
    summary: "Manage finance policy, shares, charges, loans, migration, and business settings.",
  },
  {
    action: "manage_roles",
    allowedRoles: adminRoles,
    module: "settings",
    summary: "Provision users, assign workspace roles, and set default memberships.",
  },
  {
    action: "manage_trust_and_domains",
    allowedRoles: ["super_admin", "tenant_admin", "operations_officer"],
    module: "settings",
    summary: "Manage trust readiness, tenant profile, and domain configuration.",
  },
] as const satisfies readonly CooperativeRolePermission[]

const roleRank: Record<CooperativeRole, number> = {
  super_admin: 99,
  tenant_admin: 4,
  finance_officer: 3,
  operations_officer: 2,
  member: 1,
}

export function normalizeRole(
  input: string | null | undefined
): CooperativeRole | null {
  if (!input) {
    return null
  }

  const normalized = input.trim().toLowerCase().replace(/-/g, "_")

  return cooperativeRoles.includes(normalized as CooperativeRole)
    ? (normalized as CooperativeRole)
    : null
}

export function isRoleAtLeast(
  actual: CooperativeRole,
  required: CooperativeRole
): boolean {
  return roleRank[actual] >= roleRank[required]
}

export function canApproveLoan(role: CooperativeRole) {
  return (
    role === "super_admin" ||
    role === "tenant_admin" ||
    role === "finance_officer"
  )
}

export function getRolePermissions(role: CooperativeRole) {
  return cooperativeRolePermissions.filter((permission) =>
    (permission.allowedRoles as readonly CooperativeRole[]).includes(role)
  )
}

export function getPermissionModuleLabel(
  module: CooperativePermissionModule
) {
  switch (module) {
    case "members":
      return "Members"
    case "payments":
      return "Payments"
    case "financing":
      return "Financing"
    case "procurement":
      return "Procurement"
    case "shares":
      return "Shares"
    case "food_purchase":
      return "Food purchase"
    case "project_financing":
      return "Project financing"
    case "support":
      return "Support"
    case "reports":
      return "Reports"
    case "settings":
      return "Settings"
  }
}

export function roleCan(
  role: CooperativeRole,
  action: CooperativeRolePermission["action"]
) {
  return cooperativeRolePermissions.some(
    (permission) =>
      permission.action === action &&
      (permission.allowedRoles as readonly CooperativeRole[]).includes(role)
  )
}

export function getRoleDisplayName(
  role: CooperativeRole | null | undefined
) {
  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "tenant_admin":
      return "Cooperative Admin"
    case "finance_officer":
      return "Finance Officer"
    case "operations_officer":
      return "Operations Officer"
    case "member":
      return "Member"
    default:
      return "Guest"
  }
}

export function getRoleScopeSummary(
  role: CooperativeRole | null | undefined
) {
  switch (role) {
    case "super_admin":
      return "Platform-level oversight across cooperative workspaces."
    case "tenant_admin":
      return "Administrative control over cooperative setup and operations."
    case "finance_officer":
      return "Financial operations across collections, charges, and repayments."
    case "operations_officer":
      return "Member operations, public site updates, and day-to-day coordination."
    case "member":
      return "Member-facing visibility into notifications and cooperative activity."
    default:
      return "No active cooperative role."
  }
}
