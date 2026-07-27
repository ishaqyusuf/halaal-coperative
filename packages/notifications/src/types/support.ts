import { z } from "zod"
import { createHrefNotificationAction } from "../actions"
import { channelHelpers } from "../channels"
import {
  createDirectRecipient,
  defaultActionLabel,
  defaultActionUrl,
  defineHalaalNotification,
  eventEmailDraft,
  sentenceCase,
  tenantEmailEventSchema,
} from "./shared"

const supportEventSchema = tenantEmailEventSchema.extend({
  authorType: z.enum(["member", "staff", "system"]).optional(),
  linkedRecordType: z.string().optional().nullable(),
  memberName: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  recipientEmail: z.email().optional(),
  recipientName: z.string().min(1).optional(),
  status: z.string().optional(),
  subject: z.string().min(1),
  supportCaseId: z.string().min(1),
})

type SupportEventPayload = z.infer<typeof supportEventSchema>

function supportAction(payload: SupportEventPayload) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, "/support"),
    label: defaultActionLabel(payload, "Open support"),
  })
}

function supportRecipient(payload: SupportEventPayload) {
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

function supportMemberLabel(payload: SupportEventPayload) {
  return payload.memberName ? ` for ${payload.memberName}` : ""
}

function supportCaseLabel(payload: SupportEventPayload) {
  return `support case "${payload.subject}"`
}

function supportActorSentence(payload: SupportEventPayload) {
  return payload.actorName ? ` Updated by ${payload.actorName}.` : ""
}

function supportEmail(input: {
  bodyText: string
  payload: SupportEventPayload
  subject: string
}) {
  return eventEmailDraft({
    actionLabel: defaultActionLabel(input.payload, "Open support"),
    actionUrl: defaultActionUrl(input.payload, "/support"),
    bodyText: input.bodyText,
    recipient: supportRecipient(input.payload),
    subject: input.subject,
  })
}

export const supportCaseCreated = defineHalaalNotification({
  buildAction: supportAction,
  buildBody: (payload) =>
    `A ${supportCaseLabel(payload)} was opened${supportMemberLabel(payload)}.${supportActorSentence(payload)}`,
  buildEmailDraft: (payload) =>
    supportEmail({
      bodyText: `A ${supportCaseLabel(payload)} was opened${supportMemberLabel(payload)}. Review the case and document any resolution activity inside the support workspace.`,
      payload,
      subject: `${payload.tenantName}: support case opened`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/support"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: supportEventSchema,
  title: () => "Support case opened",
  variant: "warning",
})

export const supportMessageAdded = defineHalaalNotification({
  buildAction: supportAction,
  buildBody: (payload) =>
    `A ${payload.authorType ? sentenceCase(payload.authorType) : "new"} reply was added to ${supportCaseLabel(payload)}${supportMemberLabel(payload)}.${supportActorSentence(payload)}`,
  buildEmailDraft: (payload) =>
    supportEmail({
      bodyText: `A ${payload.authorType ? sentenceCase(payload.authorType) : "new"} reply was added to ${supportCaseLabel(payload)}${supportMemberLabel(payload)}. Review the message in the support workspace before taking any money-impact action.`,
      payload,
      subject: `${payload.tenantName}: support case reply added`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/support"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: supportEventSchema,
  title: () => "Support case reply added",
  variant: "info",
})

export const supportCaseStatusUpdated = defineHalaalNotification({
  buildAction: supportAction,
  buildBody: (payload) =>
    `${supportCaseLabel(payload)} is now ${sentenceCase(payload.status ?? "updated")}.${supportActorSentence(payload)}`,
  buildEmailDraft: (payload) =>
    supportEmail({
      bodyText: `${supportCaseLabel(payload)} is now ${sentenceCase(payload.status ?? "updated")}. Open the support workspace for the latest resolution notes and next steps.`,
      payload,
      subject: `${payload.tenantName}: support case ${sentenceCase(payload.status ?? "updated")}`,
    }),
  buildLink: (payload) => defaultActionUrl(payload, "/support"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer", "operations_officer"],
  schema: supportEventSchema.extend({
    status: z.string().min(1),
  }),
  title: (payload) => `Support case ${sentenceCase(payload.status)}`,
  variant: "info",
})
