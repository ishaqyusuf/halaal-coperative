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
  tenantEventSchema,
} from "./shared"

const foodPurchaseApplicationEventSchema = tenantEventSchema.extend({
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  applicationId: z.string().min(1),
  itemDescription: z.string().optional().nullable(),
  memberName: z.string().optional().nullable(),
  periodLabel: z.string().optional().nullable(),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  reviewNotes: z.string().optional().nullable(),
  status: z.string().min(1),
})

type FoodPurchaseApplicationEventPayload = z.infer<
  typeof foodPurchaseApplicationEventSchema
>

const foodPurchaseAccountingEventSchema = tenantEventSchema.extend({
  cycleId: z.string().min(1),
  periodLabel: z.string().optional().nullable(),
  profitAmount: z.union([z.number(), z.string()]).optional().nullable(),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  reviewNotes: z.string().optional().nullable(),
  status: z.enum(["accounting_approved", "accounting_rejected"]),
})

type FoodPurchaseAccountingEventPayload = z.infer<
  typeof foodPurchaseAccountingEventSchema
>

function foodPurchaseAction(payload: FoodPurchaseApplicationEventPayload) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/food-purchase"),
    label: defaultActionLabel(payload, "Open Foodstuff Purchase"),
  })
}

function foodPurchaseAccountingAction(
  payload: FoodPurchaseAccountingEventPayload
) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/food-purchase"),
    label: defaultActionLabel(payload, "Open Foodstuff Purchase"),
  })
}

function foodPurchaseRecipient(
  payload:
    | FoodPurchaseAccountingEventPayload
    | FoodPurchaseApplicationEventPayload
) {
  if (!payload.recipientEmail || !payload.recipientName) {
    return undefined
  }

  return createDirectRecipient({
    recipientEmail: payload.recipientEmail,
    recipientName: payload.recipientName,
    tenantName: payload.tenantName,
  })
}

function foodPurchaseBody(payload: FoodPurchaseApplicationEventPayload) {
  const amount = formatAmount(payload.amount)
  const amountText = amount ? ` for ${amount}` : ""
  const itemText = payload.itemDescription
    ? ` (${payload.itemDescription})`
    : ""
  const periodText = payload.periodLabel ? ` in ${payload.periodLabel}` : ""
  const notes = payload.reviewNotes ? ` Review note: ${payload.reviewNotes}` : ""

  return `Your Foodstuff Purchase application${itemText}${amountText}${periodText} is now ${sentenceCase(payload.status)}.${notes}`
}

function foodPurchaseAccountingBody(
  payload: FoodPurchaseAccountingEventPayload
) {
  const status = payload.status.replace(/^accounting_/, "")
  const profit = formatAmount(payload.profitAmount)
  const periodText = payload.periodLabel ? ` for ${payload.periodLabel}` : ""
  const profitText = profit ? ` with recorded profit of ${profit}` : ""
  const notes = payload.reviewNotes ? ` Review note: ${payload.reviewNotes}` : ""

  return `Foodstuff Purchase accounting${periodText} is now ${sentenceCase(status)}${profitText}.${notes}`
}

function foodPurchaseAccountingStatusLabel(
  payload: FoodPurchaseAccountingEventPayload
) {
  return sentenceCase(payload.status.replace(/^accounting_/, ""))
}

export const foodPurchaseApplicationStatusChanged = defineHalaalNotification({
  buildAction: foodPurchaseAction,
  buildBody: foodPurchaseBody,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open Foodstuff Purchase"),
      actionUrl: defaultActionUrl(payload, "/food-purchase"),
      bodyText: `${foodPurchaseBody(payload)} Open your Foodstuff Purchase page to review the latest status and any committee notes.`,
      recipient: foodPurchaseRecipient(payload),
      subject: `${payload.tenantName}: Foodstuff Purchase application ${sentenceCase(payload.status)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/food-purchase"),
  channels: channelHelpers.inAppAndEmail(),
  roles: [],
  schema: foodPurchaseApplicationEventSchema,
  title: (payload) => `Foodstuff Purchase application ${sentenceCase(payload.status)}`,
  variant: "info",
})

export const foodPurchaseAccountingStatusChanged = defineHalaalNotification({
  buildAction: foodPurchaseAccountingAction,
  buildBody: foodPurchaseAccountingBody,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open Foodstuff Purchase"),
      actionUrl: defaultActionUrl(payload, "/food-purchase"),
      bodyText: `${foodPurchaseAccountingBody(payload)} Open the Foodstuff Purchase workspace to review the finance decision and any correction note.`,
      recipient: foodPurchaseRecipient(payload),
      subject: `${payload.tenantName}: Foodstuff Purchase accounting ${foodPurchaseAccountingStatusLabel(payload)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/food-purchase"),
  channels: channelHelpers.inAppAndEmail(),
  roles: [],
  schema: foodPurchaseAccountingEventSchema,
  title: (payload) =>
    `Foodstuff Purchase accounting ${foodPurchaseAccountingStatusLabel(payload)}`,
  variant: "info",
})
