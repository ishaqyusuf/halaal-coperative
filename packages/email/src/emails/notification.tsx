import {
  EmailAction,
  type EmailDetail,
  EmailDetailsTable,
  EmailHero,
  EmailStatusCard,
} from "../components/email-content"
import { EmailShell } from "../components/email-shell"
import { renderEmail } from "../render"

export type NotificationEmailVariant =
  | "error"
  | "info"
  | "success"
  | "warning"

export type NotificationEmailTemplateProps = {
  actionLabel: string
  actionUrl: string
  amount?: string | null
  amountLabel?: string
  bodyText: string
  details?: EmailDetail[]
  eventLabel: string
  organizationName?: string
  previewText: string
  recipientName?: string
  statusLabel?: string
  subject: string
  variant?: NotificationEmailVariant
}

const statusLabelByVariant: Record<NotificationEmailVariant, string> = {
  error: "ATTENTION",
  info: "UPDATE",
  success: "RECORDED",
  warning: "ACTION NEEDED",
}

export function NotificationEmailTemplate({
  actionLabel,
  actionUrl,
  amount,
  amountLabel = "Recorded amount",
  bodyText,
  details = [],
  eventLabel,
  organizationName,
  previewText,
  recipientName,
  statusLabel,
  subject,
  variant = "info",
}: NotificationEmailTemplateProps) {
  return (
    <EmailShell
      organizationName={organizationName}
      previewText={previewText}
    >
      <EmailHero
        bodyText={bodyText}
        eyebrow={eventLabel}
        recipientName={recipientName}
        subject={subject}
      />
      {amount ? (
        <EmailStatusCard
          amount={amount}
          amountLabel={amountLabel}
          statusLabel={statusLabel ?? statusLabelByVariant[variant]}
        />
      ) : null}
      <EmailDetailsTable details={details} />
      <EmailAction
        actionLabel={actionLabel}
        actionUrl={actionUrl}
        recordLabel={eventLabel}
      />
    </EmailShell>
  )
}

export function renderNotificationEmail(props: NotificationEmailTemplateProps) {
  return renderEmail(<NotificationEmailTemplate {...props} />)
}
