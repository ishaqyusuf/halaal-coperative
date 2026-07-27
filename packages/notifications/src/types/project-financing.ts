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

const projectFinancingRequestEventSchema = tenantEmailEventSchema.extend({
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  approvedStructure: z.string().optional().nullable(),
  businessName: z.string().min(1),
  memberName: z.string().optional().nullable(),
  projectFinancingRequestId: z.string().min(1),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  reviewNotes: z.string().optional().nullable(),
  status: z.string().min(1),
})

type ProjectFinancingRequestEventPayload = z.infer<
  typeof projectFinancingRequestEventSchema
>

function projectFinancingAction(payload: ProjectFinancingRequestEventPayload) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/project-financing"),
    label: defaultActionLabel(payload, "Open project financing"),
  })
}

function projectFinancingRecipient(
  payload: ProjectFinancingRequestEventPayload
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

function projectFinancingBody(payload: ProjectFinancingRequestEventPayload) {
  const amount = formatAmount(payload.amount)
  const amountText = amount ? ` for ${amount}` : ""
  const structureText = payload.approvedStructure
    ? ` Approved structure: ${sentenceCase(payload.approvedStructure)}.`
    : ""
  const notes = payload.reviewNotes
    ? ` Review note: ${payload.reviewNotes}`
    : ""

  return `Your project financing request for ${payload.businessName}${amountText} is now ${sentenceCase(payload.status)}.${structureText}${notes}`
}

export const projectFinancingRequestStatusChanged = defineHalaalNotification({
  buildAction: projectFinancingAction,
  buildBody: projectFinancingBody,
  buildEmailDraft: (payload) =>
    eventEmailDraft({
      actionLabel: defaultActionLabel(payload, "Open project financing"),
      actionUrl: defaultActionUrl(payload, "/project-financing"),
      bodyText: `${projectFinancingBody(payload)} Open your project financing page to review the latest status and any finance-team notes.`,
      recipient: projectFinancingRecipient(payload),
      subject: `${payload.tenantName}: project financing request ${sentenceCase(payload.status)}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/project-financing"),
  channels: channelHelpers.inAppAndEmail(),
  roles: [],
  schema: projectFinancingRequestEventSchema,
  title: (payload) =>
    `Project financing request ${sentenceCase(payload.status)}`,
  variant: "info",
})
