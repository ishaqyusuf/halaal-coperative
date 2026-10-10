import { NotificationEmailTemplate } from "./notification"

export default function OperationsPreview() {
  return (
    <NotificationEmailTemplate
      actionLabel="Review import"
      actionUrl="https://app.halaalvest.com/settings/imports/HV-IMP-084"
      bodyText="The cooperative member import completed successfully."
      details={[
        { label: "Records imported", value: "248" },
        { label: "Import record", value: "HV-IMP-084" },
      ]}
      eventLabel="Import record"
      organizationName="Amanah Cooperative"
      previewText="Member import completed"
      recipientName="Operations team"
      statusLabel="COMPLETED"
      subject="Member import completed"
      variant="success"
    />
  )
}
