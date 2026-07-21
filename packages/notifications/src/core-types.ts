export type NotificationChannel = "email" | "in_app" | "whatsapp"

export type NotificationVariant = "info" | "success" | "warning" | "error"

export type NotificationStatus = "active" | "dismissed"

export type NotificationRecipient = {
  displayName?: string
  email?: string
  kind: "email" | "role" | "user"
  phoneNumber?: string
  value: string
}

export type NotificationHrefActionDescriptor = {
  actionId?: string
  href: string
  kind: "href"
  label: string
}

export type NotificationCallbackActionDescriptor = {
  actionId?: string
  kind?: "callback"
  label: string
}

export type NotificationActionDescriptor =
  | NotificationCallbackActionDescriptor
  | NotificationHrefActionDescriptor

export type NotificationInput = {
  action?: NotificationActionDescriptor
  channels?: NotificationChannel[]
  description?: string
  durationMs?: number
  id?: string
  notificationType?: string
  recipients?: NotificationRecipient[]
  title: string
  variant: NotificationVariant
}

export type NotificationRecord = NotificationInput & {
  id: string
  recipients: NotificationRecipient[]
  status: NotificationStatus
}

export type NotificationEmailDraft = {
  actionLabel: string
  actionUrl: string
  bodyHtml?: string
  bodyText: string
  notificationType: string
  previewText: string
  recipient: NotificationRecipient
  subject: string
}

export type NotificationEmailDelivery = {
  attempts: number
  draft: NotificationEmailDraft
  errorMessage?: string
  messageId: string
  routing?: EmailRoutingMetadata
  status: "failed" | "queued" | "sent"
}

export type EmailRoutingMetadata = {
  deliveredRecipients: string[]
  mode: "console" | "global_test_override" | "live" | "qa_domain"
  originalRecipient: string
}

export type NotificationDispatch = NotificationInput & {
  channels: NotificationChannel[]
  payload: unknown
  recipients: NotificationRecipient[]
}

export type NotificationChannelDispatch = {
  action?: NotificationActionDescriptor
  channel: NotificationChannel
  description?: string
  notificationType: string
  payload: unknown
  recipients: NotificationRecipient[]
  title: string
  variant: NotificationVariant
}
