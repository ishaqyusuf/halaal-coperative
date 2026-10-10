import { NotificationEmailTemplate } from "./notification"

export default function AccountAccessPreview() {
  return (
    <NotificationEmailTemplate
      actionLabel="Verify email address"
      actionUrl="https://app.halaalvest.com/verify-email"
      bodyText="Confirm your email address to finish setting up your Halaalvest account."
      details={[{ label: "Verification", value: "Email address" }]}
      eventLabel="Account verification"
      previewText="Verify your email address"
      recipientName="Amina"
      statusLabel="ACTION REQUIRED"
      subject="Verify your email address"
      variant="warning"
    />
  )
}
