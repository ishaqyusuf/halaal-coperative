import { z } from "zod"
import { createHrefNotificationAction } from "../actions"
import { channelHelpers } from "../channels"
import {
  defaultActionLabel,
  defaultActionUrl,
  defineHalaalNotification,
  directTenantEmailSchema,
  eventEmailDraft,
  financeBody,
  financeEmailEventSchema,
  financeEventSchema,
  formatAmount,
  createDirectRecipient,
  sentenceCase,
} from "./shared"

function financeAction(
  payload: z.infer<typeof financeEventSchema>,
  fallbackHref: string,
  fallbackLabel: string
) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, fallbackHref),
    label: defaultActionLabel(payload, fallbackLabel),
  })
}

function noEmailDraft() {
  return null
}

export const monthlyRecordGenerated = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/monthly-records", "Open monthly records"),
  buildBody: (payload) =>
    `Monthly records${payload.periodLabel ? ` for ${payload.periodLabel}` : ""} were generated.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/monthly-records"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    periodLabel: z.string().optional(),
  }),
  title: () => "Monthly records generated",
  variant: "success",
})

export const monthlyRecordMemberApplied = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/monthly-records", "Open monthly records"),
  buildBody: (payload) =>
    financeBody(payload, "A monthly record payment was applied"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/monthly-records"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    memberId: z.string().optional(),
    monthlyRecordId: z.string().min(1),
    monthlyRecordMemberId: z.string().min(1),
  }),
  title: () => "Monthly record applied",
  variant: "success",
})

export const monthlyRecordMemberCancelled = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/monthly-records", "Open monthly records"),
  buildBody: (payload) =>
    financeBody(
      payload,
      "A monthly record row was cancelled",
      "Linked contribution and repayment records were reversed when present."
    ),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/monthly-records"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    memberId: z.string().optional(),
    monthlyRecordId: z.string().min(1),
    monthlyRecordMemberId: z.string().min(1),
  }),
  title: () => "Monthly record cancelled",
  variant: "warning",
})

export const contributionRecorded = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/contributions", "Open contributions"),
  buildBody: (payload) => financeBody(payload, "A contribution was recorded"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/contributions"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    contributionId: z.string().min(1),
    memberId: z.string().min(1),
  }),
  title: () => "Contribution recorded",
  variant: "success",
})

export const contributionPlanChanged = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/contributions", "Open contributions"),
  buildBody: (payload) =>
    financeBody(payload, "A contribution plan was updated"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/contributions"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: financeEventSchema.extend({
    memberId: z.string().min(1),
  }),
  title: () => "Contribution plan updated",
  variant: "info",
})

export const chargeApplied = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/charges", "Review charges"),
  buildBody: (payload) =>
    financeBody(payload, "A charge application was posted"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/charges"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    chargeApplicationId: z.string().min(1),
    memberId: z.string().min(1),
  }),
  title: () => "Charge applied",
  variant: "warning",
})

export const chargeWaived = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/charges", "Review charges"),
  buildBody: (payload) =>
    financeBody(payload, "A charge application was waived"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/charges"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    chargeApplicationId: z.string().min(1),
    memberId: z.string().min(1),
  }),
  title: () => "Charge waived",
  variant: "info",
})

export const chargeReversed = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/charges", "Review charges"),
  buildBody: (payload) =>
    financeBody(payload, "A charge application was reversed"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/charges"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    chargeApplicationId: z.string().min(1),
    memberId: z.string().min(1),
  }),
  title: () => "Charge reversed",
  variant: "warning",
})

export const loanRequestSubmitted = defineHalaalNotification({
  buildAction: (payload) => financeAction(payload, "/loans", "Open loans"),
  buildBody: (payload) => financeBody(payload, "A loan request was submitted"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/loans"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: financeEventSchema.extend({
    loanRequestId: z.string().min(1),
    memberId: z.string().min(1),
  }),
  title: () => "Loan request submitted",
  variant: "warning",
})

export const loanRequestStatusChanged = defineHalaalNotification({
  buildAction: (payload) => financeAction(payload, "/loans", "Open loans"),
  buildBody: (payload) =>
    `Loan request ${payload.loanRequestId} is now ${sentenceCase(payload.status)}.`,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open loans"),
      actionUrl: defaultActionUrl(payload, "/loans"),
      bodyText: `Your financing request${payload.amount ? ` for ${formatAmount(payload.amount)}` : ""} is now ${sentenceCase(payload.status)}.${payload.reviewNotes ? ` Review note: ${payload.reviewNotes}` : ""}`,
      recipient:
        payload.recipientEmail && payload.recipientName
          ? createDirectRecipient({
              recipientEmail: payload.recipientEmail,
              recipientName: payload.recipientName,
              tenantName: payload.tenantName,
              tenantSlug: payload.tenantSlug,
            })
          : undefined,
      subject: `${payload.tenantName}: financing request ${sentenceCase(payload.status)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/loans"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: financeEmailEventSchema.extend({
    loanRequestId: z.string().min(1),
    recipientEmail: z.email().optional(),
    recipientName: z.string().min(1).optional(),
    reviewNotes: z.string().optional().nullable(),
    status: z.string().min(1),
  }),
  title: (payload) => `Loan request ${sentenceCase(payload.status)}`,
  variant: "info",
})

export const loanGuarantorApprovalRequested = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(
      payload,
      payload.actionUrl ?? "/guarantor-approvals",
      "Review request"
    ),
  buildBody: (payload) => {
    const amount = formatAmount(payload.amount)
    const amountText = amount ? ` for ${amount}` : ""

    return `${payload.tenantName} requested your guarantor approval for ${payload.memberName}'s financing request${amountText}.`
  },
  buildEmailDraft: (payload) => ({
    actionLabel: defaultActionLabel(payload, "Review request"),
    actionUrl: defaultActionUrl(payload, "/guarantor-approvals"),
    bodyText: `${payload.tenantName} requested your guarantor approval for ${payload.memberName}'s financing request. Please review the request and respond from your guarantor approvals page.`,
    previewText: `Guarantor approval requested for ${payload.memberName}.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName}: guarantor approval requested`,
  }),
  buildLink: (payload) => defaultActionUrl(payload, "/guarantor-approvals"),
  channels: channelHelpers.email(),
  roles: [],
  schema: financeEventSchema.merge(directTenantEmailSchema).extend({
    guarantorApprovalId: z.string().min(1),
    loanRequestId: z.string().min(1),
    memberName: z.string().min(1),
  }),
  title: () => "Guarantor approval requested",
  variant: "warning",
})

export const loanDisbursed = defineHalaalNotification({
  buildAction: (payload) => financeAction(payload, "/loans", "Open loans"),
  buildBody: (payload) => financeBody(payload, "A loan was disbursed"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/loans"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    loanId: z.string().min(1),
    memberId: z.string().optional(),
  }),
  title: () => "Loan disbursed",
  variant: "success",
})

export const repaymentPosted = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/repayments", "Open repayments"),
  buildBody: (payload) => financeBody(payload, "A repayment was posted"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/repayments"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    loanId: z.string().min(1),
    repaymentScheduleItemId: z.string().optional().nullable(),
  }),
  title: () => "Repayment posted",
  variant: "success",
})

export const collectionsFollowUpRecorded = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(payload, "/repayments", "Open repayments"),
  buildBody: (payload) =>
    `A collections follow-up was recorded with status ${sentenceCase(payload.status)}.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/repayments"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    repaymentScheduleItemId: z.string().min(1),
    status: z.string().min(1),
  }),
  title: () => "Collections follow-up recorded",
  variant: "info",
})

export const shareProfitPublished = defineHalaalNotification({
  buildAction: (payload) =>
    financeAction(
      payload,
      "/settings/finance/business",
      "Open business finance"
    ),
  buildBody: (payload) =>
    financeBody(payload, "Share/business profit allocations were published"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) =>
    defaultActionUrl(payload, "/settings/finance/business"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    profitEntryId: z.string().optional(),
  }),
  title: () => "Share profit published",
  variant: "success",
})
