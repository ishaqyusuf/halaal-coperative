import { NotificationEmailTemplate } from "./notification"

export default function FinancePreview() {
  return (
    <NotificationEmailTemplate
      actionLabel="Review approval details"
      actionUrl="https://app.halaalvest.com/financing/requests/HV-FIN-2048"
      amount="₦850,000"
      amountLabel="Approved amount"
      bodyText="The finance committee approved your interest-free financing request."
      details={[
        { label: "Plan", value: "Normal financing" },
        { label: "Repayment term", value: "18 months" },
        { label: "Estimated monthly payment", value: "₦47,222.22" },
      ]}
      eventLabel="Financing decision"
      organizationName="Amanah Cooperative"
      previewText="Your financing request is approved"
      recipientName="Amina"
      statusLabel="APPROVED"
      subject="Your financing request is approved"
      variant="success"
    />
  )
}
