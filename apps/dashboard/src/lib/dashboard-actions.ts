"use server"

import { revalidatePath } from "next/cache"
import {
  approveMemberOnboardingRequest,
  applyCharge,
  applyImportBatch,
  closeContributionPlan,
  createTenantCustomDomain,
  createChargeDefinition,
  createImportBatch,
  createMember,
  createMemberDocument,
  createMemberSignupLink,
  createNotificationOutboxEntry,
  disburseLoan,
  getImportReferenceData,
  importCharges,
  importContributions,
  importDeductionSources,
  importLoanMigrations,
  importLoanProducts,
  importMembers,
  importRepaymentMigrations,
  recordCollectionFollowUp,
  provisionTenantUserRole,
  rotateMemberSignupLinkToken,
  refreshCollectionsStatuses,
  recordMemberPayment,
  recordContribution,
  reverseChargeApplication,
  reviewLoanRequest,
  runTenantDomainVerificationCheck,
  setTenantDomainPrimary,
  updateTenantDomainVerificationStatus,
  setMemberContributionPlan,
  setMemberSignupLinkEnabled,
  submitLoanRequest,
  postRepayment,
  queueTenantRoleNotifications,
  upsertNotificationPreference,
  rejectMemberOnboardingRequest,
  updateContributionPlan,
  updateMemberPaymentAllocationPreference,
  updateTenantProfile,
  updateChargeDefinition,
  updateMemberKyc,
  updateMemberDocumentReview,
  updateMemberStatus,
  updateMemberSignupLink,
  updateTenantMemberSignupSettings,
  waiveChargeApplication,
} from "@halaal-vest/db"
import { buildTenantDashboardUrl } from "@halaal-vest/utils"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
  memberManagementRoles,
  workspaceAdminRoles,
  workspaceConfigurationRoles,
} from "@/lib/workspace-access"
import {
  getDashboardImportExistingMatches,
  getDashboardImportPrimaryValue,
  parseDashboardImportCsv,
} from "@/lib/import-csv"

type DashboardMemberType = "civil_servant" | "individual" | "business"
type DashboardMemberStatus = "pending" | "active" | "inactive" | "suspended" | "exited"
type DashboardContributionChannel = "payroll" | "transfer" | "cash" | "manual"
type DashboardChargeKind = "fixed" | "percentage"
type DashboardPaymentAllocationPreference = "manual_split" | "savings_first" | "loan_first"
type DashboardKycStatus = "not_started" | "pending" | "verified" | "rejected"

async function requireDashboardActor(allowedRoles: Parameters<typeof hasAnyRole>[1]) {
  const context = await getDashboardServerContext()
  const tenant = context.tenant
  const membership = context.auth.membership
  const user = context.auth.user

  if (!tenant || !membership || !user || !hasAnyRole(membership.role, allowedRoles)) {
    throw new Error("You do not have access to perform this workspace action.")
  }

  return {
    membership,
    tenant,
    user,
  }
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`)
  }

  return value.trim()
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined
  }

  return Number(value.trim())
}

function getOptionalBoolean(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return false
  }

  return value === "on" || value === "true"
}

function getMemberStateFromFormData(formData: FormData) {
  const hasServingLoan = getOptionalBoolean(formData, "hasServingLoan")
  const currentSavingsBalance = getOptionalNumber(formData, "currentSavingsBalance")
  const monthlyCommitment = getOptionalNumber(formData, "monthlyCommitment")
  const loanAmount = getOptionalNumber(formData, "loanAmount")
  const loanMonthlyCommitment = getOptionalNumber(formData, "loanMonthlyCommitment")
  const loanServed = getOptionalNumber(formData, "loanServed") ?? 0
  const loanStartDate = (formData.get("loanStartDate") as string | null)?.trim() || undefined

  if (hasServingLoan) {
    if (!loanStartDate || !loanAmount || !loanMonthlyCommitment) {
      throw new Error("Loan start date, amount, and monthly commitment are required when serving loan is enabled.")
    }

    if (loanServed < 0 || loanServed > loanAmount) {
      throw new Error("Served amount must be between 0 and the total loan amount.")
    }
  }

  return {
    currentSavingsBalance,
    monthlyCommitment,
    servingLoan:
      hasServingLoan && loanStartDate && loanAmount && loanMonthlyCommitment
        ? {
            amountServed: loanServed,
            monthlyCommitment: loanMonthlyCommitment,
            principalAmount: loanAmount,
            startDate: new Date(`${loanStartDate}T00:00:00.000Z`),
          }
        : undefined,
  }
}

export async function createMemberAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  const memberState = getMemberStateFromFormData(formData)

  await createMember({
    actorUserId: actor.user.id,
    currentSavingsBalance: memberState.currentSavingsBalance,
    fullName: getRequiredString(formData, "fullName"),
    joinedAt: new Date(`${getRequiredString(formData, "joinedAt")}T00:00:00.000Z`),
    memberNumber: getRequiredString(formData, "memberNumber"),
    memberType: getRequiredString(formData, "memberType") as DashboardMemberType,
    monthlyCommitment: memberState.monthlyCommitment,
    servingLoan: memberState.servingLoan,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function updateMemberStatusAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  const member = await updateMemberStatus(
    actor.tenant.id,
    getRequiredString(formData, "memberId"),
    getRequiredString(formData, "status") as DashboardMemberStatus,
    actor.user.id,
  )

  await queueTenantRoleNotifications({
    actionLabel: "Open members",
    actionUrl: "/members",
    bodyText: `${member.fullName} is now marked as ${member.status.replace(/_/g, " ")}.`,
    metadata: {
      memberId: member.id,
      memberNumber: member.memberNumber,
      status: member.status,
    },
    notificationType: "member.status_changed",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.members",
    subject: `${actor.tenant.name}: member status changed`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
}

export async function approveMemberOnboardingAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  const memberState = getMemberStateFromFormData(formData)

  const approved = await approveMemberOnboardingRequest({
    actorUserId: actor.user.id,
    memberState,
    requestId: getRequiredString(formData, "requestId"),
    tenantId: actor.tenant.id,
  })

  await createNotificationOutboxEntry({
    actionLabel: "Open dashboard",
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, { pathname: "/" }),
    bodyText: [
      `Assalamu alaikum ${approved.user.fullName},`,
      "",
      `Your membership for ${actor.tenant.name} has been approved.`,
      "You can now sign in to your dashboard and continue with your cooperative account.",
    ].join("\n"),
    metadata: {
      memberId: approved.member.id,
      requestId: approved.request.id,
      userId: approved.user.id,
    },
    notificationType: "member.onboarding_approved",
    recipient: approved.user.email,
    source: "dashboard.membership_approvals",
    subject: `${actor.tenant.name}: your membership has been approved`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/membership-approvals")
  revalidatePath(`/membership-approvals/${approved.request.id}`)
  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function rejectMemberOnboardingAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  const rejected = await rejectMemberOnboardingRequest({
    actorUserId: actor.user.id,
    reason: (formData.get("reason") as string | null)?.trim() || undefined,
    requestId: getRequiredString(formData, "requestId"),
    tenantId: actor.tenant.id,
  })

  await createNotificationOutboxEntry({
    actionLabel: "Contact support",
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, { pathname: "/login" }),
    bodyText: [
      `Assalamu alaikum ${rejected.user.fullName},`,
      "",
      `Your membership signup for ${actor.tenant.name} was not approved yet.`,
      rejected.request.rejectionReason
        ? `Reason: ${rejected.request.rejectionReason}`
        : "Please contact the cooperative team for the next steps.",
    ].join("\n"),
    metadata: {
      requestId: rejected.request.id,
      userId: rejected.user.id,
    },
    notificationType: "member.onboarding_rejected",
    recipient: rejected.user.email,
    source: "dashboard.membership_approvals",
    subject: `${actor.tenant.name}: membership signup update`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/membership-approvals")
  revalidatePath(`/membership-approvals/${rejected.request.id}`)
}

export async function updateMemberKycAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  const member = await updateMemberKyc({
    actorUserId: actor.user.id,
    governmentIdNumber: (formData.get("governmentIdNumber") as string | null)?.trim() || null,
    kycDocumentType: (formData.get("kycDocumentType") as string | null)?.trim() || null,
    kycDocumentUrl: (formData.get("kycDocumentUrl") as string | null)?.trim() || null,
    kycReviewNotes: (formData.get("kycReviewNotes") as string | null)?.trim() || null,
    kycStatus: getRequiredString(formData, "kycStatus") as DashboardKycStatus,
    memberId: getRequiredString(formData, "memberId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open member profile",
    actionUrl: `/members/${member.id}`,
    bodyText: `${member.fullName} KYC is now ${member.kycStatus.replace(/_/g, " ")}.`,
    metadata: {
      kycStatus: member.kycStatus,
      memberId: member.id,
    },
    notificationType: "member.kyc_updated",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.members",
    subject: `${actor.tenant.name}: member KYC updated`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
  revalidatePath(`/members/${getRequiredString(formData, "memberId")}`)
}

export async function createMemberDocumentAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  const document = await createMemberDocument({
    actorUserId: actor.user.id,
    documentType: getRequiredString(formData, "documentType"),
    documentUrl: getRequiredString(formData, "documentUrl"),
    memberId: getRequiredString(formData, "memberId"),
    reviewNotes: (formData.get("reviewNotes") as string | null)?.trim() || null,
    reviewStatus: (formData.get("reviewStatus") as string | null)?.trim() || "pending",
    tenantId: actor.tenant.id,
  })

  revalidatePath(`/members/${document.memberId}`)
  revalidatePath("/reports")
}

export async function updateMemberDocumentReviewAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  const document = await updateMemberDocumentReview({
    actorUserId: actor.user.id,
    documentId: getRequiredString(formData, "documentId"),
    reviewNotes: (formData.get("reviewNotes") as string | null)?.trim() || null,
    reviewStatus: getRequiredString(formData, "reviewStatus"),
    tenantId: actor.tenant.id,
  })

  revalidatePath(`/members/${document.memberId}`)
  revalidatePath("/reports")
}

export async function recordContributionAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await recordContribution({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    channel: getRequiredString(formData, "channel") as DashboardContributionChannel,
    committedAmount: getOptionalNumber(formData, "committedAmount"),
    contributionPlanId: (formData.get("contributionPlanId") as string | null)?.trim() || undefined,
    extraSavingsAmount: getOptionalNumber(formData, "extraSavingsAmount"),
    memberId: getRequiredString(formData, "memberId"),
    periodLabel: (formData.get("periodLabel") as string | null)?.trim() || undefined,
    postedAt: new Date(`${getRequiredString(formData, "postedAt")}T00:00:00.000Z`),
    reference: (formData.get("reference") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
}

export async function setMemberContributionPlanAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await setMemberContributionPlan({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    memberId: getRequiredString(formData, "memberId"),
    name: (formData.get("name") as string | null)?.trim() || undefined,
    startsAt: new Date(`${getRequiredString(formData, "startsAt")}T00:00:00.000Z`),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
}

export async function updateContributionPlanAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await updateContributionPlan({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    name: (formData.get("name") as string | null)?.trim() || undefined,
    planId: getRequiredString(formData, "planId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function closeContributionPlanAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await closeContributionPlan({
    actorUserId: actor.user.id,
    endsAt: new Date(`${getRequiredString(formData, "endsAt")}T00:00:00.000Z`),
    planId: getRequiredString(formData, "planId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function updateMemberPaymentAllocationPreferenceAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await updateMemberPaymentAllocationPreference({
    actorUserId: actor.user.id,
    memberId: getRequiredString(formData, "memberId"),
    preference: getRequiredString(formData, "preference") as DashboardPaymentAllocationPreference,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function recordMemberPaymentAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await recordMemberPayment({
    actorUserId: actor.user.id,
    channel: getRequiredString(formData, "channel") as DashboardContributionChannel,
    committedSavingsAmount: Number(getRequiredString(formData, "committedSavingsAmount")),
    contributionPlanId: (formData.get("contributionPlanId") as string | null)?.trim() || undefined,
    extraLoanPaymentAmount: getOptionalNumber(formData, "extraLoanPaymentAmount"),
    extraSavingsAmount: getOptionalNumber(formData, "extraSavingsAmount"),
    loanId: (formData.get("loanId") as string | null)?.trim() || undefined,
    memberId: getRequiredString(formData, "memberId"),
    periodLabel: (formData.get("periodLabel") as string | null)?.trim() || undefined,
    postedAt: new Date(`${getRequiredString(formData, "postedAt")}T00:00:00.000Z`),
    totalAmount: getOptionalNumber(formData, "totalAmount"),
    reference: (formData.get("reference") as string | null)?.trim() || undefined,
    scheduledLoanServicingAmount: getOptionalNumber(formData, "scheduledLoanServicingAmount"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function createChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await createChargeDefinition({
    amount: Number(getRequiredString(formData, "amount")),
    appliesToLoanRequests: formData.get("appliesToLoanRequests") === "on",
    appliesToLoans: formData.get("appliesToLoans") === "on",
    appliesToMembers: formData.get("appliesToMembers") === "on",
    code: getRequiredString(formData, "code"),
    isMonthlyLevy: formData.get("isMonthlyLevy") === "on",
    kind: getRequiredString(formData, "kind") as DashboardChargeKind,
    name: getRequiredString(formData, "name"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
}

export async function updateChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await updateChargeDefinition(
    actor.tenant.id,
    getRequiredString(formData, "chargeDefinitionId"),
    {
      isActive: getRequiredString(formData, "isActive") === "true",
    },
  )

  revalidatePath("/charges")
}

export async function applyChargeAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const charge = await applyCharge({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    assessedAt: new Date(`${getRequiredString(formData, "assessedAt")}T00:00:00.000Z`),
    chargeDefinitionId: getRequiredString(formData, "chargeDefinitionId"),
    memberId: getRequiredString(formData, "memberId"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Review charges",
    actionUrl: "/charges",
    bodyText: `A charge application of ${Number(charge.amount)} was posted for member operations review.`,
    metadata: {
      chargeApplicationId: charge.id,
      memberId: charge.memberId,
    },
    notificationType: "charge.applied",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.charge",
    subject: `${actor.tenant.name}: charge applied`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function waiveChargeApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const charge = await waiveChargeApplication({
    actorUserId: actor.user.id,
    chargeApplicationId: getRequiredString(formData, "chargeApplicationId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Review charges",
    actionUrl: "/charges",
    bodyText: `A charge application was waived for member operations review.`,
    metadata: {
      chargeApplicationId: charge.id,
      memberId: charge.memberId,
      status: charge.status,
    },
    notificationType: "charge.waived",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.charge",
    subject: `${actor.tenant.name}: charge waived`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function reverseChargeApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const charge = await reverseChargeApplication({
    actorUserId: actor.user.id,
    chargeApplicationId: getRequiredString(formData, "chargeApplicationId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Review charges",
    actionUrl: "/charges",
    bodyText: `A charge application was reversed and savings were restored.`,
    metadata: {
      chargeApplicationId: charge.id,
      memberId: charge.memberId,
      status: charge.status,
    },
    notificationType: "charge.reversed",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.charge",
    subject: `${actor.tenant.name}: charge reversed`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function submitLoanRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await submitLoanRequest({
    actorUserId: actor.user.id,
    extraMonthlySavingsAmount: getOptionalNumber(formData, "extraMonthlySavingsAmount"),
    loanProductId: getRequiredString(formData, "loanProductId"),
    memberId: getRequiredString(formData, "memberId"),
    purpose: (formData.get("purpose") as string | null)?.trim() || undefined,
    requestedAmount: Number(getRequiredString(formData, "requestedAmount")),
    requestedTermMonths: Number(getRequiredString(formData, "requestedTermMonths")),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/loans")
}

export async function reviewLoanRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const request = await reviewLoanRequest({
    actorUserId: actor.user.id,
    loanRequestId: getRequiredString(formData, "loanRequestId"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    status: getRequiredString(formData, "status") as "approved" | "rejected" | "under_review",
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open loans",
    actionUrl: "/loans",
    bodyText: `Loan request ${request.id} is now ${request.status.replace(/_/g, " ")}.`,
    metadata: {
      loanRequestId: request.id,
      status: request.status,
    },
    notificationType: "loan.request_status_changed",
    roles: ["tenant_admin", "finance_officer", "operations_officer"],
    source: "dashboard.loans",
    subject: `${actor.tenant.name}: loan request ${request.status.replace(/_/g, " ")}`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/loans")
}

export async function disburseLoanAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await disburseLoan({
    actorUserId: actor.user.id,
    firstRepaymentDueAt: (formData.get("firstRepaymentDueAt") as string | null)?.trim() || undefined,
    loanId: getRequiredString(formData, "loanId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function postRepaymentAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await postRepayment({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    loanId: getRequiredString(formData, "loanId"),
    reference: (formData.get("reference") as string | null)?.trim() || undefined,
    repaymentScheduleItemId: (formData.get("repaymentScheduleItemId") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open repayments",
    actionUrl: "/repayments",
    bodyText: `A repayment was posted for finance review and reconciliation.`,
    metadata: {
      loanId: getRequiredString(formData, "loanId"),
      repaymentScheduleItemId: (formData.get("repaymentScheduleItemId") as string | null)?.trim() || null,
    },
    notificationType: "repayment.posted",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.repayments",
    subject: `${actor.tenant.name}: repayment posted`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function updateCooperativeProfileAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)

  await updateTenantProfile({
    actorUserId: actor.user.id,
    currentSize: (() => {
      const rawValue = (formData.get("currentSize") as string | null)?.trim()
      return rawValue ? Number(rawValue) : null
    })(),
    name: getRequiredString(formData, "name"),
    officeAddress: (formData.get("officeAddress") as string | null)?.trim() || null,
    region: (formData.get("region") as string | null)?.trim() || null,
    startDate: (formData.get("startDate") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
    timezone: getRequiredString(formData, "timezone"),
  })

  revalidatePath("/settings/profile")
  revalidatePath("/")
}

function getOptionalPositiveInteger(formData: FormData, key: string) {
  const rawValue = (formData.get(key) as string | null)?.trim()

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a whole number greater than 0.`)
  }

  return parsed
}

function getOptionalDateValue(formData: FormData, key: string) {
  const rawValue = (formData.get(key) as string | null)?.trim()

  if (!rawValue) {
    return null
  }

  const parsed = new Date(`${rawValue}T23:59:59.999Z`)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${key} must be a valid date.`)
  }

  return parsed
}

export async function updateMemberSignupAccessModeAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  await updateTenantMemberSignupSettings({
    actorUserId: actor.user.id,
    memberSignupAccessMode: getRequiredString(formData, "memberSignupAccessMode") as "in_office" | "public",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/members")
  revalidatePath("/membership-approvals")
  revalidatePath("/signup/members")
  revalidatePath("/login")
  revalidatePath("/")
}

export async function createMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  await createMemberSignupLink({
    actorUserId: actor.user.id,
    expiresAt: getOptionalDateValue(formData, "expiresAt"),
    maxSignups: getOptionalPositiveInteger(formData, "maxSignups"),
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/members")
  revalidatePath("/membership-approvals")
  revalidatePath("/signup/members")
}

export async function updateMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  await updateMemberSignupLink({
    actorUserId: actor.user.id,
    expiresAt: getOptionalDateValue(formData, "expiresAt"),
    linkId: getRequiredString(formData, "linkId"),
    maxSignups: getOptionalPositiveInteger(formData, "maxSignups"),
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/signup/members")
}

export async function toggleMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  await setMemberSignupLinkEnabled({
    actorUserId: actor.user.id,
    enabled: getRequiredString(formData, "enabled") === "true",
    linkId: getRequiredString(formData, "linkId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/signup/members")
}

export async function rotateMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)

  await rotateMemberSignupLinkToken({
    actorUserId: actor.user.id,
    linkId: getRequiredString(formData, "linkId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/signup/members")
}

export async function createTenantDomainAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await createTenantCustomDomain({
    actorUserId: actor.user.id,
    hostname: getRequiredString(formData, "hostname"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
  revalidatePath("/")
}

export async function setTenantDomainPrimaryAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await setTenantDomainPrimary({
    actorUserId: actor.user.id,
    domainId: getRequiredString(formData, "domainId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
}

export async function updateTenantDomainVerificationStatusAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await updateTenantDomainVerificationStatus({
    actorUserId: actor.user.id,
    domainId: getRequiredString(formData, "domainId"),
    status: getRequiredString(formData, "status") as "failed" | "pending_dns" | "verified",
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open domains",
    actionUrl: "/domains",
    bodyText: `A custom domain verification status was updated to ${getRequiredString(formData, "status").replace(/_/g, " ")}.`,
    metadata: {
      domainId: getRequiredString(formData, "domainId"),
      status: getRequiredString(formData, "status"),
    },
    notificationType: "domain.verification_changed",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.domains",
    subject: `${actor.tenant.name}: domain verification updated`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
}

export async function runTenantDomainVerificationCheckAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  const domain = await runTenantDomainVerificationCheck({
    actorUserId: actor.user.id,
    domainId: getRequiredString(formData, "domainId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open domains",
    actionUrl: "/domains",
    bodyText: `A domain verification check completed with status ${domain.verificationStatus.replace(/_/g, " ")}.`,
    metadata: {
      domainId: domain.id,
      hostname: domain.hostname,
      status: domain.verificationStatus,
    },
    notificationType: "domain.verification_checked",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.domains",
    subject: `${actor.tenant.name}: domain verification check completed`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
}

export async function provisionTenantUserRoleAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await provisionTenantUserRole({
    actorUserId: actor.user.id,
    email: getRequiredString(formData, "email"),
    fullName: getRequiredString(formData, "fullName"),
    makeDefault: formData.get("makeDefault") === "on",
    role: getRequiredString(formData, "role") as import("@halaal-vest/db").MembershipRole,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/roles")
}

export async function saveNotificationPreferenceAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await upsertNotificationPreference({
    actorUserId: actor.user.id,
    channel: getRequiredString(formData, "channel"),
    enabled: getRequiredString(formData, "enabled") === "true",
    notificationType: getRequiredString(formData, "notificationType"),
    role: (formData.get("role") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/notifications")
}

export async function refreshCollectionsStatusesAction() {
  const actor = await requireDashboardActor(financeManagementRoles)

  await refreshCollectionsStatuses({
    actorUserId: actor.user.id,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function recordCollectionFollowUpAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const followUpStatus = getRequiredString(formData, "status") as "promise_to_pay" | "reminded" | "settled" | "unreachable"

  const followUp = await recordCollectionFollowUp({
    assignedToUserId: (formData.get("assignedToUserId") as string | null)?.trim() || undefined,
    actorUserId: actor.user.id,
    caseStage: (formData.get("caseStage") as string | null)?.trim() || undefined,
    note: getRequiredString(formData, "note"),
    nextActionAt: (formData.get("nextActionAt") as string | null)?.trim() || undefined,
    priority: (formData.get("priority") as string | null)?.trim() || undefined,
    promiseToPayAt: (formData.get("promiseToPayAt") as string | null)?.trim() || undefined,
    repaymentScheduleItemId: getRequiredString(formData, "repaymentScheduleItemId"),
    resolutionStatus: (formData.get("resolutionStatus") as string | null)?.trim() || undefined,
    status: followUpStatus,
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open repayments",
    actionUrl: "/repayments",
    bodyText: `A collections follow-up was recorded with status ${followUpStatus.replace(/_/g, " ")}.`,
    metadata: {
      assignedToUserId: (formData.get("assignedToUserId") as string | null)?.trim() || null,
      caseStage: (formData.get("caseStage") as string | null)?.trim() || null,
      nextActionAt: (formData.get("nextActionAt") as string | null)?.trim() || null,
      priority: (formData.get("priority") as string | null)?.trim() || null,
      promiseToPayAt: (formData.get("promiseToPayAt") as string | null)?.trim() || null,
      repaymentScheduleItemId: followUp.repaymentScheduleItemId,
      resolutionStatus: (formData.get("resolutionStatus") as string | null)?.trim() || null,
      status: followUpStatus,
    },
    notificationType: "collections.follow_up_recorded",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.collections",
    subject: `${actor.tenant.name}: collections follow-up recorded`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/repayments")
}

export async function importMembersCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importMembers>[0]["rows"][number]>(
    "members",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importMembers({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/members")
}

export async function importDeductionSourcesCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importDeductionSources>[0]["rows"][number]>(
    "deduction_sources",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importDeductionSources({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/members")
}

export async function importLoanProductsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importLoanProducts>[0]["rows"][number]>(
    "loan_products",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importLoanProducts({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/loans")
}

export async function importContributionsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importContributions>[0]["rows"][number]>(
    "contributions",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importContributions({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function importChargesCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importCharges>[0]["rows"][number]>(
    "charges",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importCharges({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/charges")
  revalidatePath("/members")
}

export async function importLoanMigrationsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importLoanMigrations>[0]["rows"][number]>(
    "loan_migrations",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importLoanMigrations({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/loans")
  revalidatePath("/repayments")
  revalidatePath("/members")
}

export async function importRepaymentMigrationsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const parsed = parseDashboardImportCsv<Parameters<typeof importRepaymentMigrations>[0]["rows"][number]>(
    "repayment_migrations",
    getRequiredString(formData, "csvText"),
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importRepaymentMigrations({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/repayments")
  revalidatePath("/loans")
  revalidatePath("/members")
}

export async function stageImportBatchAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const importKind = getRequiredString(formData, "importKind") as
    | "members"
    | "deduction_sources"
    | "loan_products"
    | "contributions"
    | "charges"
    | "loan_migrations"
    | "repayment_migrations"
  const csvText = getRequiredString(formData, "csvText")
  const parsed = parseDashboardImportCsv<Record<string, unknown>>(importKind, csvText)

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  const referenceData = await getImportReferenceData(actor.tenant.id)
  const seen = new Set<string>()
  const duplicateKeys = new Set<string>()

  parsed.rows.forEach((row) => {
    const primaryValue = getDashboardImportPrimaryValue(importKind, row)
    if (!primaryValue) {
      return
    }

    if (seen.has(primaryValue)) {
      duplicateKeys.add(primaryValue)
      return
    }

    seen.add(primaryValue)
  })

  await createImportBatch({
    actorUserId: actor.user.id,
    duplicateRowCount: duplicateKeys.size,
    existingMatchCount: parsed.rows.filter((row) =>
      getDashboardImportExistingMatches(importKind, referenceData, row),
    ).length,
    importType: importKind,
    rows: parsed.rows.map((row, index) => {
      const primaryValue = getDashboardImportPrimaryValue(importKind, row)
      return {
        duplicateInFile: primaryValue ? duplicateKeys.has(primaryValue) : false,
        existingMatch: getDashboardImportExistingMatches(importKind, referenceData, row),
        payload: row,
        primaryValue,
        rowIndex: index + 1,
      }
    }),
    sourceCsv: csvText,
    tenantId: actor.tenant.id,
    validRows: parsed.rows.length,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/members")
}

export async function applyImportBatchAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await applyImportBatch({
    actorUserId: actor.user.id,
    batchId: getRequiredString(formData, "batchId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/imports")
  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/charges")
  revalidatePath("/loans")
  revalidatePath("/repayments")
}
