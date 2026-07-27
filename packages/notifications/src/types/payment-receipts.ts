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

const paymentReceiptEventSchema = tenantEmailEventSchema.extend({
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  memberName: z.string().optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  receiptId: z.string().min(1),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  reviewNotes: z.string().optional().nullable(),
  status: z.string().min(1),
})

type PaymentReceiptEventPayload = z.infer<typeof paymentReceiptEventSchema>

function receiptAction(payload: PaymentReceiptEventPayload) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/payment-receipts"),
    label: defaultActionLabel(payload, "Open receipts"),
  })
}

function receiptRecipient(payload: PaymentReceiptEventPayload) {
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

function receiptLabel(payload: PaymentReceiptEventPayload) {
  const reference = payload.paymentReference
    ? ` ${payload.paymentReference}`
    : ""

  return `payment receipt${reference}`
}

function receiptBody(payload: PaymentReceiptEventPayload) {
  const amount = formatAmount(payload.amount)
  const amountText = amount ? ` for ${amount}` : ""
  const notes = payload.reviewNotes
    ? ` Review note: ${payload.reviewNotes}`
    : ""

  return `Your ${receiptLabel(payload)}${amountText} is now ${sentenceCase(payload.status)}.${notes}`
}

export const memberPaymentReceiptStatusChanged = defineHalaalNotification({
  buildAction: receiptAction,
  buildBody: receiptBody,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open receipts"),
      actionUrl: defaultActionUrl(payload, "/payment-receipts"),
      bodyText: `${receiptBody(payload)} Open your payment receipts to review the latest status and any finance-team notes.`,
      recipient: receiptRecipient(payload),
      subject: `${payload.tenantName}: payment receipt ${sentenceCase(payload.status)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/payment-receipts"),
  channels: channelHelpers.inAppAndEmail(),
  roles: [],
  schema: paymentReceiptEventSchema,
  title: (payload) => `Payment receipt ${sentenceCase(payload.status)}`,
  variant: "info",
})
