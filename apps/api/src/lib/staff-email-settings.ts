import type { MembershipRole } from "@halaalvest/db"

/**
 * Emails sent to staff roles, and which roles get each one. It mirrors the
 * `roles` passed to `sendTenantRoleNotificationEmails` at each call site, so
 * the settings screen only offers switches that change something.
 */
export const staffEmailRoles: Record<string, MembershipRole[]> = {
  "charge.applied": ["tenant_admin", "finance_officer"],
  "charge.reversed": ["tenant_admin", "finance_officer"],
  "charge.settled": ["tenant_admin", "finance_officer"],
  "charge.waived": ["tenant_admin", "finance_officer"],
  "collections.follow_up_recorded": ["tenant_admin", "finance_officer"],
  "domain.verification_changed": ["tenant_admin", "operations_officer"],
  "domain.verification_checked": ["tenant_admin", "operations_officer"],
  "loan.guarantor_approval_recorded": ["tenant_admin", "finance_officer"],
  "loan.request_status_changed": [
    "tenant_admin",
    "finance_officer",
    "operations_officer",
  ],
  "member.kyc_updated": ["tenant_admin", "operations_officer"],
  "member.status_changed": ["tenant_admin", "operations_officer"],
  "monthly_record.member_applied": ["tenant_admin", "finance_officer"],
  "monthly_record.member_cancelled": ["tenant_admin", "finance_officer"],
  "monthly_record.workplace_received": ["tenant_admin", "finance_officer"],
  "repayment.posted": ["tenant_admin", "finance_officer"],
}

export const staffEmailRoleList: MembershipRole[] = [
  "tenant_admin",
  "finance_officer",
  "operations_officer",
]

export const workspaceSettingsRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
]
