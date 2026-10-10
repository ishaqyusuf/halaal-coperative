import { createEmailDraftFromType } from "./types/registry"
import { resolveEmailRouting, type EmailDeliveryMode } from "./email-routing"
import type { NotificationEmailTransport } from "./client"
import { renderNotificationEmail } from "@halaalvest/email/emails/notification"
import type {
  EmailRoutingMetadata,
  NotificationEmailDelivery,
  NotificationEmailDraft,
  NotificationEmailSender,
  NotificationQaArtifact,
  NotificationInput,
  NotificationRecord,
  NotificationVariant,
  QaNotificationPreview,
} from "./core-types"

export type {
  NotificationActionDescriptor as NotificationAction,
  EmailRoutingMetadata,
  NotificationEmailDelivery,
  NotificationEmailDraft,
  NotificationEmailSender,
  NotificationQaArtifact,
  NotificationInput,
  NotificationRecord,
  NotificationRecipient,
  NotificationVariant,
  QaNotificationPreview,
} from "./core-types"

export {
  createMemoryNotificationStore,
  getNotificationEmailDeliveryErrorCause,
  NotificationService,
} from "./client"
export type {
  NotificationEmailTransport,
  NotificationStore,
  NotificationStoreState,
} from "./client"

export type ResendEmailTransportOptions = {
  apiKey: string
  copyRecipient?: string
  deliveryMode?: EmailDeliveryMode
  from: string
  qaDomainRoutes?: ReadonlyMap<string, string>
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

class EmailProviderResponseError extends Error {
  constructor(status: number) {
    super(`Email provider returned HTTP ${status}.`)
  }
}

export { getExpoMobilePushReceipt, sendExpoMobilePush } from "./mobile-push"
export type {
  MobilePushMessage,
  MobilePushReceipt,
  MobilePushTicket,
} from "./mobile-push"

function toProviderTagValue(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "_")
}

const cooperativeSenderLocalPartPattern =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function isEmailHeaderControlCharacter(character: string) {
  const code = character.charCodeAt(0)
  return code <= 31 || (code >= 127 && code <= 159)
}

function parseConfiguredSender(from: string) {
  if ([...from].some(isEmailHeaderControlCharacter)) {
    throw new Error("Invalid configured email sender address.")
  }

  const trimmedFrom = from.trim()
  const angleMatch = trimmedFrom.match(/^(.+?)\s*<([^<>]+)>$/)
  const hasAngleBracket = trimmedFrom.includes("<") || trimmedFrom.includes(">")

  if (hasAngleBracket && !angleMatch) {
    throw new Error("Invalid configured email sender address.")
  }

  const address = (angleMatch?.[2] ?? trimmedFrom).trim()
  const atIndex = address.lastIndexOf("@")
  const localPart = atIndex >= 0 ? address.slice(0, atIndex) : ""
  const domain = atIndex >= 0 ? address.slice(atIndex + 1).toLowerCase() : ""
  const domainLabels = domain.split(".")
  const validLocalPart =
    localPart.length > 0 &&
    localPart.length <= 64 &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  const validDomain =
    domain.length <= 253 &&
    domainLabels.length >= 2 &&
    domainLabels.every(
      (label) =>
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
    )

  if (!validLocalPart || !validDomain) {
    throw new Error("Invalid configured email sender address.")
  }

  const configuredDisplayName = angleMatch?.[1]?.trim()
  const unquotedDisplayName =
    configuredDisplayName &&
    configuredDisplayName.startsWith('"') &&
    configuredDisplayName.endsWith('"')
      ? configuredDisplayName
          .slice(1, -1)
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
      : configuredDisplayName

  return {
    domain,
    formattedFrom: unquotedDisplayName
      ? `${formatEmailDisplayName(unquotedDisplayName)} <${localPart}@${domain}>`
      : `${localPart}@${domain}`,
  }
}

function formatEmailDisplayName(value: string) {
  const normalized = [...value]
    .map((character) =>
      isEmailHeaderControlCharacter(character) ? " " : character
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized) {
    throw new Error("Invalid cooperative email sender display name.")
  }

  return `"${normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function formatProviderEmailFrom(
  configuredFrom: string,
  sender?: NotificationEmailSender
) {
  const configuredSender = parseConfiguredSender(configuredFrom)

  if (!sender) {
    return configuredSender.formattedFrom
  }

  const localPart = sender.localPart.trim().toLowerCase()

  if (!cooperativeSenderLocalPartPattern.test(localPart)) {
    throw new Error("Invalid cooperative email sender local part.")
  }

  return `${formatEmailDisplayName(sender.displayName)} <${localPart}@${configuredSender.domain}>`
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

export function createNotificationFromType<
  TType extends PlatformNotificationType,
>(
  registry: typeof platformNotificationTypes,
  type: TType,
  payload: Record<string, string | number>
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
          2
        )
      )

      return {
        attempts: 1,
        draft,
        messageId,
        routing: {
          deliveredRecipients: [draft.recipient.value.trim()],
          mode: "console",
          originalRecipient: draft.recipient.value.trim(),
        },
        status: "sent",
      } satisfies NotificationEmailDelivery
    },
  }
}

export function createResendEmailTransport(
  options: ResendEmailTransportOptions
): NotificationEmailTransport {
  return {
    async send(draft) {
      const deliveryMode = options.deliveryMode ?? "live"
      let routing: EmailRoutingMetadata

      try {
        routing = resolveEmailRouting(draft.recipient.value, {
          deliveryMode,
          qaDomainRoutes: options.qaDomainRoutes ?? new Map<string, string>(),
          testRecipient: options.testRecipient,
        })
      } catch (error) {
        if (
          options.qaDomainRoutes?.size &&
          draft.recipient.value.trim().toLowerCase().endsWith(".test")
        ) {
          throw createEmailTransportError(error, {
            deliveredRecipients: [],
            mode: "qa_domain",
            originalRecipient: draft.recipient.value.trim(),
          })
        }

        throw error
      }

      const originalRecipient = routing.originalRecipient
      const copyRecipient = options.copyRecipient?.trim()
      const isQaDomainRoute = routing.mode === "qa_domain"

      const bccRecipients =
        copyRecipient &&
        routing.mode === "live" &&
        copyRecipient !== originalRecipient
          ? [copyRecipient]
          : undefined
      const from = formatProviderEmailFrom(options.from, draft.sender)

      try {
        const bodyHtml =
          draft.bodyHtml ??
          (draft.bodyTemplate
            ? await renderNotificationEmail(draft.bodyTemplate)
            : undefined)
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bcc: bccRecipients,
            from,
            headers: isQaDomainRoute
              ? {
                  "X-HalaalVest-Email-Routing": routing.mode,
                  "X-HalaalVest-Original-Recipient": originalRecipient,
                }
              : undefined,
            reply_to: options.replyTo,
            subject: isQaDomainRoute
              ? `[QA: ${originalRecipient}] ${draft.subject}`
              : draft.subject,
            tags: [
              {
                name: "notification_type",
                value: toProviderTagValue(draft.notificationType),
              },
            ],
            html:
              isQaDomainRoute && bodyHtml
                ? `${createQaEmailHtmlBanner(originalRecipient)}${bodyHtml}`
                : bodyHtml,
            text: [
              ...(isQaDomainRoute
                ? [
                    "QA ROUTED EMAIL",
                    `Original recipient: ${originalRecipient}`,
                    "",
                  ]
                : []),
              draft.bodyText,
              "",
              `${draft.actionLabel}: ${draft.actionUrl}`,
              ...(routing.mode === "global_test_override"
                ? ["", `Original recipient: ${originalRecipient}`]
                : []),
            ].join("\n"),
            to: routing.deliveredRecipients,
          }),
        })

        if (!response.ok) {
          // Provider error bodies can contain recipient addresses or tokens.
          throw new EmailProviderResponseError(response.status)
        }

        const payload = (await response.json()) as { id?: string }

        return {
          attempts: 1,
          draft,
          messageId: payload.id ?? `email-${Date.now()}-${Math.random()}`,
          routing,
          status: "sent",
        } satisfies NotificationEmailDelivery
      } catch (error) {
        throw createEmailTransportError(error, routing)
      }
    },
  }
}

export function createRetryingEmailTransport(
  transport: NotificationEmailTransport,
  options: RetryingEmailTransportOptions
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

      throw lastError instanceof Error
        ? lastError
        : new Error("Email delivery failed.")
    },
  }
}

function createEmailTransportError(
  error: unknown,
  routing: EmailRoutingMetadata
) {
  const wrappedError = new Error(
    error instanceof EmailProviderResponseError
      ? error.message
      : "Email provider request failed."
  ) as Error & { emailRouting?: EmailRoutingMetadata }

  wrappedError.emailRouting = routing

  return wrappedError
}

function getEmailRoutingFromError(error: unknown) {
  if (error && typeof error === "object" && "emailRouting" in error) {
    return (error as { emailRouting?: EmailRoutingMetadata }).emailRouting
  }

  return undefined
}

function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function createQaEmailHtmlBanner(originalRecipient: string) {
  return [
    '<div style="margin:0 0 20px;padding:12px 16px;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">',
    "<strong>QA routed email</strong><br />",
    `Original recipient: ${escapeEmailHtml(originalRecipient)}`,
    "</div>",
  ].join("")
}

export function createSignupVerificationEmail(input: {
  expiresAt: string
  recipientEmail: string
  recipientName: string
  tenantName: string
  tenantSlug: string
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
  tenantSlug: string
}): NotificationEmailDraft {
  return createEmailDraftFromType("workspace_ready", input)
}

export function createMarketingEarlyAccessRequestEmail(input: {
  approvalUrl: string
  contactEmail: string
  contactName: string
  currentSizeLabel: string
  launchTimelineLabel: string
  message?: string | null
  phone?: string | null
  recordSystemLabel: string
  recipientEmail: string
  recipientName: string
  requestedAt: string
  setupNeedLabels: string[]
  tenantName: string
}): NotificationEmailDraft {
  return createEmailDraftFromType("marketing.early_access_requested", input)
}

export function createMarketingEarlyAccessApprovedEmail(input: {
  expiresAt: string
  recipientEmail: string
  recipientName: string
  signupUrl: string
  tenantName: string
}): NotificationEmailDraft {
  return createEmailDraftFromType("marketing.early_access_approved", input)
}

export * from "./actions"
export * from "./channels"
export * from "./core-types"
export * from "./delivery"
export * from "./qa-preview"
export * from "./email-routing"
export * from "./notification-types"
export * from "./types/registry"
