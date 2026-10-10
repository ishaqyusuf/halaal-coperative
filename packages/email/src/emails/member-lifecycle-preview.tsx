import { NotificationEmailTemplate } from "./notification"

export default function MemberLifecyclePreview() {
  return (
    <NotificationEmailTemplate
      actionLabel="Open member profile"
      actionUrl="https://app.halaalvest.com/members/HV-MEM-0312"
      bodyText="Your membership record has been approved and activated by the cooperative."
      details={[
        { label: "Member record", value: "HV-MEM-0312" },
        { label: "Membership status", value: "Active" },
      ]}
      eventLabel="Member record"
      organizationName="Amanah Cooperative"
      previewText="Your membership has been approved"
      recipientName="Amina"
      statusLabel="APPROVED"
      subject="Your membership has been approved"
      variant="success"
    />
  )
}
