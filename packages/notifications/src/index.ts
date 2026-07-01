import { createEmailDraftFromType } from "./types/registry"
import type {
  NotificationEmailDelivery,
  NotificationEmailDraft,
  NotificationInput,
  NotificationRecord,
  NotificationRecipient,
  NotificationVariant,
} from "./core-types"

export type {
  NotificationActionDescriptor as NotificationAction,
  NotificationEmailDelivery,
  NotificationEmailDraft,
  NotificationInput,
  NotificationRecord,
  NotificationRecipient,
  NotificationVariant,
} from "./core-types"

export type NotificationEmailTransport = {
  send: (draft: NotificationEmailDraft) => NotificationEmailDelivery | Promise<NotificationEmailDelivery>
}

export type ResendEmailTransportOptions = {
  apiKey: string
  copyRecipient?: string
  from: string
  replyTo?: string
  testRecipient?: string
}

export type RetryingEmailTransportOptions = {
  maxAttempts: number
  onAttemptFailure?: (input: {
    attempt: number
    draft: NotificationEmailDraft
    error: unknown
    maxAttempts: number
  }) => void
}

export type NotificationStoreState = {
  notifications: NotificationRecord[]
}

export type NotificationStore = {
  clear: () => void
  dismiss: (notificationId: string) => void
  getState: () => NotificationStoreState
  publish: (input: NotificationInput) => string
  subscribe: (listener: () => void) => () => void
}

export type PlatformNotificationType =
  | "app_notification"
  | "workspace_invitation"
  | "loan_approval_required"

export const platformNotificationTypes: Record<
  PlatformNotificationType,
  {
    durationMs: number
    variant: NotificationVariant
    buildTitle: (payload: Record<string, string | number>) => string
    buildDescription: (payload: Record<string, string | number>) => string
  }
> = {
  app_notification: {
    durationMs: 5000,
    variant: "info",
    buildTitle: () => "Notification",
    buildDescription: () => "A new event requires your attention.",
  },
  workspace_invitation: {
    durationMs: 7000,
    variant: "success",
    buildTitle: (payload) => `Invitation ready for ${payload.recipientName}`,
    buildDescription: (payload) =>
      `${payload.recipientName} can now join ${payload.tenantName}.`,
  },
  loan_approval_required: {
    durationMs: 8000,
    variant: "warning",
    buildTitle: (payload) => `Approval required for ${payload.memberName}`,
    buildDescription: (payload) =>
      `A loan request for NGN ${payload.amount} is waiting for review.`,
  },
}

export function createNotificationFromType<TType extends PlatformNotificationType>(
  registry: typeof platformNotificationTypes,
  type: TType,
  payload: Record<string, string | number>,
): NotificationInput {
  const definition = registry[type]

  return {
    notificationType: type,
    title: definition.buildTitle(payload),
    description: definition.buildDescription(payload),
    durationMs: definition.durationMs,
    recipients: [],
    variant: definition.variant,
  }
}

export function createMemoryNotificationStore(): NotificationStore {
  let state: NotificationStoreState = {
    notifications: [],
  }
  const listeners = new Set<() => void>()

  function emit() {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    clear() {
      state = {
        notifications: [],
      }
      emit()
    },
    dismiss(notificationId) {
      state = {
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "dismissed",
              }
            : notification,
        ),
      }
      emit()
    },
    getState() {
      return state
    },
    publish(input) {
      const id = input.id ?? `notification-${Date.now()}-${Math.random()}`
      state = {
        notifications: [
          ...state.notifications,
          {
            ...input,
            id,
            recipients: input.recipients ?? [],
            status: "active",
          },
        ],
      }
      emit()
      return id
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export class NotificationService {
  constructor(
    private readonly sendNotification: (input: NotificationInput) => string,
    private readonly emailTransport?: NotificationEmailTransport,
  ) {}

  notify(input: NotificationInput) {
    return this.sendNotification(input)
  }

  async email(draft: NotificationEmailDraft) {
    if (!this.emailTransport) {
      return {
        attempts: 1,
        draft,
        messageId: `email-${Date.now()}-${Math.random()}`,
        status: "queued",
      } satisfies NotificationEmailDelivery
    }

    return this.emailTransport.send(draft)
  }

  async tryEmail(draft: NotificationEmailDraft) {
    try {
      return await this.email(draft)
    } catch (error) {
      return {
        attempts: 1,
        draft,
        errorMessage: error instanceof Error ? error.message : "Unknown email delivery failure.",
        messageId: `email-${Date.now()}-${Math.random()}`,
        status: "failed",
      } satisfies NotificationEmailDelivery
    }
  }
}

export function createConsoleEmailTransport(): NotificationEmailTransport {
  return {
    send(draft) {
      const messageId = `email-${Date.now()}-${Math.random()}`

      console.log(
        JSON.stringify(
          {
            channel: "email",
            messageId,
            notificationType: draft.notificationType,
            recipient: draft.recipient,
            subject: draft.subject,
            previewText: draft.previewText,
            actionUrl: draft.actionUrl,
          },
          null,
          2,
        ),
      )

      return {
        attempts: 1,
        draft,
        messageId,
        status: "sent",
      } satisfies NotificationEmailDelivery
    },
  }
}

export function createResendEmailTransport(
  options: ResendEmailTransportOptions,
): NotificationEmailTransport {
  return {
    async send(draft) {
      const originalRecipient = draft.recipient.value.trim()
      const copyRecipient = options.copyRecipient?.trim()
      const testRecipient = options.testRecipient?.trim()
      const recipients = testRecipient ? [testRecipient] : [originalRecipient]

      if (!recipients[0]) {
        throw new Error("Email delivery requires a recipient.")
      }

      const bccRecipients =
        copyRecipient && !testRecipient && copyRecipient !== originalRecipient
          ? [copyRecipient]
          : undefined

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bcc: bccRecipients,
          from: options.from,
          reply_to: options.replyTo,
          subject: draft.subject,
          tags: [
            {
              name: "notification_type",
              value: draft.notificationType,
            },
          ],
          html: draft.bodyHtml,
          text: [
            draft.bodyText,
            "",
            `${draft.actionLabel}: ${draft.actionUrl}`,
            ...(testRecipient
              ? ["", `Original recipient: ${originalRecipient}`]
              : []),
          ].join("\n"),
          to: recipients,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()

        throw new Error(`Resend email delivery failed: ${response.status} ${errorBody}`)
      }

      const payload = (await response.json()) as { id?: string }

      return {
        attempts: 1,
        draft,
        messageId: payload.id ?? `email-${Date.now()}-${Math.random()}`,
        status: "sent",
      } satisfies NotificationEmailDelivery
    },
  }
}

export function createRetryingEmailTransport(
  transport: NotificationEmailTransport,
  options: RetryingEmailTransportOptions,
): NotificationEmailTransport {
  return {
    async send(draft) {
      let lastError: unknown = null

      for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        try {
          const delivery = await transport.send(draft)

          return {
            ...delivery,
            attempts: attempt,
          }
        } catch (error) {
          lastError = error
          options.onAttemptFailure?.({
            attempt,
            draft,
            error,
            maxAttempts: options.maxAttempts,
          })
        }
      }

      throw lastError instanceof Error ? lastError : new Error("Email delivery failed.")
    },
  }
}

export function createSignupVerificationEmail(input: {
  expiresAt: string
  recipientEmail: string
  recipientName: string
  tenantName: string
  verificationUrl: string
}): NotificationEmailDraft {
  return createEmailDraftFromType("signup_email_verification", input)
}

export function createWorkspaceReadyEmail(input: {
  dashboardUrl: string
  recipientEmail: string
  recipientName: string
  siteUrl: string
  tenantName: string
}): NotificationEmailDraft {
  return createEmailDraftFromType("workspace_ready", input)
}

export * from "./actions"
export * from "./channels"
export * from "./core-types"
export * from "./delivery"
export * from "./notification-types"
export * from "./types/registry"
