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

const memberShareApplicationEventSchema = tenantEmailEventSchema.extend({
  approvedUnits: z.number().optional().nullable(),
  memberName: z.string().optional().nullable(),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  requestedUnits: z.number(),
  reviewNotes: z.string().optional().nullable(),
  shareApplicationId: z.string().min(1),
  shareValue: z.union([z.number(), z.string()]).optional().nullable(),
  status: z.string().min(1),
})

type MemberShareApplicationEventPayload = z.infer<
  typeof memberShareApplicationEventSchema
>

function shareApplicationAction(payload: MemberShareApplicationEventPayload) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/shares"),
    label: defaultActionLabel(payload, "Open shares"),
  })
}

function shareApplicationRecipient(
  payload: MemberShareApplicationEventPayload
) {
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

function shareApplicationBody(payload: MemberShareApplicationEventPayload) {
  const approvedUnits =
    payload.approvedUnits === undefined || payload.approvedUnits === null
      ? null
      : `${payload.approvedUnits} approved unit${payload.approvedUnits === 1 ? "" : "s"}`
  const requestedUnits = `${payload.requestedUnits} requested unit${payload.requestedUnits === 1 ? "" : "s"}`
  const shareValue = formatAmount(payload.shareValue)
  const valueText = shareValue ? ` worth ${shareValue}` : ""
  const notes = payload.reviewNotes
    ? ` Review note: ${payload.reviewNotes}`
    : ""

  return `Your share request for ${approvedUnits ?? requestedUnits}${valueText} is now ${sentenceCase(payload.status)}.${notes}`
}

export const memberShareApplicationStatusChanged = defineHalaalNotification({
  buildAction: shareApplicationAction,
  buildBody: shareApplicationBody,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open shares"),
      actionUrl: defaultActionUrl(payload, "/shares"),
      bodyText: `${shareApplicationBody(payload)} Open your shares page to review your current share position and request history.`,
      recipient: shareApplicationRecipient(payload),
      subject: `${payload.tenantName}: share request ${sentenceCase(payload.status)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/shares"),
  channels: channelHelpers.inAppAndEmail(),
  roles: [],
  schema: memberShareApplicationEventSchema,
  title: (payload) => `Share request ${sentenceCase(payload.status)}`,
  variant: "info",
})
