import { NotificationEmailTemplate } from "./notification"

export default function SupportPreview() {
  return (
    <NotificationEmailTemplate
      actionLabel="View support case"
      actionUrl="https://app.halaalvest.com/support/HV-SUP-192"
      bodyText="The support team updated your case and added a response for your review."
      details={[
        { label: "Case reference", value: "HV-SUP-192" },
        { label: "Case status", value: "Response added" },
      ]}
      eventLabel="Support update"
      organizationName="Amanah Cooperative"
      previewText="Your support case has an update"
      recipientName="Amina"
      subject="Your support case has an update"
      variant="info"
    />
  )
}
