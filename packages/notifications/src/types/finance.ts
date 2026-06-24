import { z } from "zod"
import { createHrefNotificationAction } from "../actions"
import { channelHelpers } from "../channels"
import {
  defaultActionLabel,
  defaultActionUrl,
  defineHalaalNotification,
  financeBody,
  financeEventSchema,
  sentenceCase,
} from "./shared"

function financeAction(payload: z.infer<typeof financeEventSchema>, fallbackHref: string, fallbackLabel: string) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, fallbackHref),
    label: defaultActionLabel(payload, fallbackLabel),
  })
}

function noEmailDraft() {
  return null
}

export const monthlyRecordGenerated = defineHalaalNotification({
  buildAction: (payload) => financeAction(payload, "/monthly-records", "Open monthly records"),
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
  buildAction: (payload) => financeAction(payload, "/monthly-records", "Open monthly records"),
  buildBody: (payload) => financeBody(payload, "A monthly record payment was applied"),
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
  buildAction: (payload) => financeAction(payload, "/monthly-records", "Open monthly records"),
  buildBody: (payload) =>
    financeBody(
      payload,
      "A monthly record row was cancelled",
      "Linked contribution and repayment records were reversed when present.",
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
  buildAction: (payload) => financeAction(payload, "/contributions", "Open contributions"),
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
  buildAction: (payload) => financeAction(payload, "/contributions", "Open contributions"),
  buildBody: (payload) => financeBody(payload, "A contribution plan was updated"),
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
  buildAction: (payload) => financeAction(payload, "/charges", "Review charges"),
  buildBody: (payload) => financeBody(payload, "A charge application was posted"),
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
  buildAction: (payload) => financeAction(payload, "/charges", "Review charges"),
  buildBody: (payload) => financeBody(payload, "A charge application was waived"),
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
  buildAction: (payload) => financeAction(payload, "/charges", "Review charges"),
  buildBody: (payload) => financeBody(payload, "A charge application was reversed"),
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
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/loans"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: financeEventSchema.extend({
    loanRequestId: z.string().min(1),
    status: z.string().min(1),
  }),
  title: (payload) => `Loan request ${sentenceCase(payload.status)}`,
  variant: "info",
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
  buildAction: (payload) => financeAction(payload, "/repayments", "Open repayments"),
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
  buildAction: (payload) => financeAction(payload, "/repayments", "Open repayments"),
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
    financeAction(payload, "/settings/finance/business", "Open business finance"),
  buildBody: (payload) =>
    financeBody(payload, "Share/business profit allocations were published"),
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/settings/finance/business"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: financeEventSchema.extend({
    profitEntryId: z.string().optional(),
  }),
  title: () => "Share profit published",
  variant: "success",
})
