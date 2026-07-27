import { z } from "zod"
import { createHrefNotificationAction } from "../actions"
import { channelHelpers } from "../channels"
import {
  createDirectRecipient,
  defaultActionLabel,
  defaultActionUrl,
  defineHalaalNotification,
  eventEmailDraft,
  formatAmount,
  sentenceCase,
  tenantEmailEventSchema,
} from "./shared"

const procurementRequestEventSchema = tenantEmailEventSchema.extend({
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  itemName: z.string().min(1),
  memberName: z.string().optional().nullable(),
  procurementRequestId: z.string().min(1),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  repaymentMonths: z.number().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
  status: z.string().min(1),
  vendorName: z.string().optional().nullable(),
})

type ProcurementRequestEventPayload = z.infer<
  typeof procurementRequestEventSchema
>

function procurementAction(payload: ProcurementRequestEventPayload) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/procurement"),
    label: defaultActionLabel(payload, "Open procurement"),
  })
}

function procurementRecipient(payload: ProcurementRequestEventPayload) {
  if (!payload.recipientEmail || !payload.recipientName) {
    return undefined
  }

  return createDirectRecipient({
    recipientEmail: payload.recipientEmail,
    recipientName: payload.recipientName,
    tenantName: payload.tenantName,
    tenantSlug: payload.tenantSlug,
  })
}

function procurementBody(payload: ProcurementRequestEventPayload) {
  const amount = formatAmount(payload.amount)
  const amountText = amount ? ` for ${amount}` : ""
  const vendorText = payload.vendorName ? ` Vendor: ${payload.vendorName}.` : ""
  const termText = payload.repaymentMonths
    ? ` Repayment plan: ${payload.repaymentMonths} month${payload.repaymentMonths === 1 ? "" : "s"}.`
    : ""
  const notes = payload.reviewNotes
    ? ` Review note: ${payload.reviewNotes}`
    : ""

  return `Your procurement request for ${payload.itemName}${amountText} is now ${sentenceCase(payload.status)}.${vendorText}${termText}${notes}`
}

export const procurementRequestStatusChanged = defineHalaalNotification({
  buildAction: procurementAction,
  buildBody: procurementBody,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open procurement"),
      actionUrl: defaultActionUrl(payload, "/procurement"),
      bodyText: `${procurementBody(payload)} Open your procurement page to review the latest status and any finance-team notes.`,
      recipient: procurementRecipient(payload),
      subject: `${payload.tenantName}: procurement request ${sentenceCase(payload.status)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/procurement"),
  channels: channelHelpers.inAppAndEmail(),
  roles: [],
  schema: procurementRequestEventSchema,
  title: (payload) => `Procurement request ${sentenceCase(payload.status)}`,
  variant: "info",
})
