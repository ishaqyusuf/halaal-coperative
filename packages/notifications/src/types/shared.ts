import { NotificationEmailTemplate } from "@halaalvest/email/emails/notification"
import { z } from "zod"
import type {
  NotificationActionDescriptor,
  NotificationChannel,
  NotificationEmailDraft,
  NotificationRecipient,
  NotificationVariant,
} from "../core-types"
import type { NotificationTypeDefinition } from "../notification-types"

export type NotificationEmailTemplateDraft = Omit<
  NotificationEmailDraft,
  "bodyHtml" | "notificationType"
>

export type HalaalVestNotificationDefinition<
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = NotificationTypeDefinition<TSchema> & {
  buildAction?: (payload: z.infer<TSchema>) => NotificationActionDescriptor | null
  buildBody: (payload: z.infer<TSchema>) => string
  buildEmailDraft: (payload: z.infer<TSchema>) => NotificationEmailTemplateDraft | null
  buildLink: (payload: z.infer<TSchema>) => string | null
  defaultRoles?: string[]
}

export const directEmailSchema = z.object({
  recipientEmail: z.email(),
  recipientName: z.string().min(1),
  tenantName: z.string().min(1),
})

export const tenantEventSchema = z.object({
  actionLabel: z.string().optional(),
  actionUrl: z.string().optional(),
  actorName: z.string().optional().nullable(),
  tenantName: z.string().min(1),
})

export const financeEventSchema = tenantEventSchema.extend({
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  memberName: z.string().optional().nullable(),
})

export function defineHalaalNotification<TSchema extends z.ZodTypeAny>(input: {
  buildAction?: (payload: z.infer<TSchema>) => NotificationActionDescriptor | null
  buildBody: (payload: z.infer<TSchema>) => string
  buildEmailDraft: (payload: z.infer<TSchema>) => NotificationEmailTemplateDraft | null
  buildLink: (payload: z.infer<TSchema>) => string | null
  channels: NotificationChannel[]
  roles?: string[]
  schema: TSchema
  title: (payload: z.infer<TSchema>) => string
  variant: NotificationVariant
}): HalaalVestNotificationDefinition<TSchema> {
  return {
    buildAction: input.buildAction,
    buildBody: input.buildBody,
    buildEmailDraft: input.buildEmailDraft,
    buildLink: input.buildLink,
    defaultAction: input.buildAction,
    defaultChannels: input.channels,
    defaultRoles: input.roles ?? [],
    description: input.buildBody,
    schema: input.schema,
    title: input.title,
    variant: input.variant,
  }
}

export function createDirectRecipient(payload: z.infer<typeof directEmailSchema>): NotificationRecipient {
  return {
    displayName: payload.recipientName,
    email: payload.recipientEmail,
    kind: "email",
    value: payload.recipientEmail,
  }
}

export function createNotificationEmailDraft(input: {
  actionLabel: string
  actionUrl: string
  bodyText: string
  eventLabel: string
  notificationType: string
  previewText: string
  recipient: NotificationRecipient
  subject: string
}): NotificationEmailDraft {
  return {
    actionLabel: input.actionLabel,
    actionUrl: input.actionUrl,
    bodyHtml: NotificationEmailTemplate({
      actionLabel: input.actionLabel,
      actionUrl: input.actionUrl,
      bodyText: input.bodyText,
      eventLabel: input.eventLabel,
      previewText: input.previewText,
      subject: input.subject,
    }),
    bodyText: input.bodyText,
    notificationType: input.notificationType,
    previewText: input.previewText,
    recipient: input.recipient,
    subject: input.subject,
  }
}

export function formatAmount(amount?: number | string | null) {
  if (amount === undefined || amount === null || amount === "") {
    return null
  }

  if (typeof amount === "number") {
    return new Intl.NumberFormat("en-NG", {
      currency: "NGN",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount)
  }

  return amount
}

export function sentenceCase(value: string) {
  return value.replace(/_/g, " ")
}

export function defaultActionLabel(
  payload: z.infer<typeof tenantEventSchema>,
  fallback: string,
) {
  return payload.actionLabel ?? fallback
}

export function defaultActionUrl(
  payload: z.infer<typeof tenantEventSchema>,
  fallback: string,
) {
  return payload.actionUrl ?? fallback
}

export function financeBody(
  payload: z.infer<typeof financeEventSchema>,
  event: string,
  suffix?: string,
) {
  const amount = formatAmount(payload.amount)
  const member = payload.memberName ? ` for ${payload.memberName}` : ""
  const amountText = amount ? ` of ${amount}` : ""
  const actor = payload.actorName ? ` Recorded by ${payload.actorName}.` : ""

  return `${event}${amountText}${member}.${suffix ? ` ${suffix}` : ""}${actor}`
}

export function eventEmailDraft(input: {
  actionLabel: string
  actionUrl: string
  bodyText: string
  recipient?: NotificationRecipient
  subject: string
}) {
  if (!input.recipient) {
    return null
  }

  return {
    actionLabel: input.actionLabel,
    actionUrl: input.actionUrl,
    bodyText: input.bodyText,
    previewText: input.bodyText,
    recipient: input.recipient,
    subject: input.subject,
  }
}
