import type { TenantServiceAccessMode, TenantServiceKey } from "@halaalvest/db"

export const operationProfileServiceKeys = [
  "payment_receipts",
  "procurement",
  "food_purchase",
  "support_cases",
  "collection_sources",
  "collection_source_batch_posting",
] as const satisfies readonly TenantServiceKey[]

export const operationProfileServiceRows = [
  {
    body: "Members send proof of a transfer or cash payment.",
    key: "payment_receipts",
    label: "Payment receipts",
  },
  {
    body: "Members ask the cooperative to buy an item for them.",
    key: "procurement",
    label: "Procurement",
  },
  {
    body: "Members join a bulk food buy.",
    key: "food_purchase",
    label: "Foodstuff purchase",
  },
  {
    body: "Members send questions and complaints.",
    key: "support_cases",
    label: "Support",
  },
  {
    body: "Employers that take savings from members' pay.",
    key: "collection_sources",
    label: "Workplaces",
  },
  {
    body: "Record the monthly payment a workplace sends for its members.",
    key: "collection_source_batch_posting",
    label: "Workplace payments",
  },
] as const satisfies ReadonlyArray<{
  body: string
  key: TenantServiceKey
  label: string
}>

export const operationProfileServiceSections = [
  {
    body: "How members' money reaches the cooperative.",
    key: "collections",
    label: "Payments",
    serviceKeys: [
      "payment_receipts",
      "collection_sources",
      "collection_source_batch_posting",
    ],
  },
  {
    body: "Requests members can make.",
    key: "member_services",
    label: "Member services",
    serviceKeys: ["procurement", "food_purchase", "support_cases"],
  },
] as const satisfies ReadonlyArray<{
  body: string
  key: string
  label: string
  serviceKeys: readonly TenantServiceKey[]
}>

export const operationProfileAccessModeOptions = [
  {
    description: "Members can start their own. Staff can too.",
    label: "Members and staff",
    summary: "Members and staff can start one",
    value: "member_self_service",
  },
  {
    description: "Only staff can start a new one.",
    label: "Staff only",
    summary: "Only staff can start one",
    value: "office_only",
  },
  {
    description: "Nobody can start a new one. Past records can still be seen.",
    label: "Past records only",
    summary: "No new ones; past records stay",
    value: "read_only",
  },
  {
    description: "Hidden from the menu. Past records stay.",
    label: "Off",
    summary: "Not offered",
    value: "disabled",
  },
] as const satisfies ReadonlyArray<{
  description: string
  label: string
  summary: string
  value: TenantServiceAccessMode
}>

/** What a change that reduces access does, for the confirm. */
export function getOperationProfileAccessEffect({
  label,
  next,
  previous,
}: {
  label: string
  next: TenantServiceAccessMode
  previous: TenantServiceAccessMode
}) {
  const name = label.toLowerCase()

  if (next === "disabled") {
    return `${label} will disappear from the menu for members and staff. Past records stay.`
  }

  if (next === "read_only") {
    return `Nobody will be able to start new ${name}. Past records can still be seen.`
  }

  if (previous === "member_self_service") {
    return `Members won't be able to start ${name} themselves any more. Staff still can.`
  }

  return `Access to ${name} will be reduced.`
}

export function getOperationProfileAccessModeLabel(
  value: TenantServiceAccessMode
) {
  return (
    operationProfileAccessModeOptions.find((option) => option.value === value)
      ?.label ?? value.replaceAll("_", " ")
  )
}

export function getOperationProfileAccessModeSummary(
  value: TenantServiceAccessMode
) {
  return (
    operationProfileAccessModeOptions.find((option) => option.value === value)
      ?.summary ?? "Review current access"
  )
}

export function getOperationProfileService(serviceKey: TenantServiceKey) {
  return operationProfileServiceRows.find(
    (service) => service.key === serviceKey
  )!
}

export function getOperationProfileServiceInputName(
  serviceKey: TenantServiceKey
) {
  return `${serviceKey}AccessMode`
}

export function isRestrictiveOperationProfileAccessChange({
  next,
  previous,
}: {
  next: TenantServiceAccessMode
  previous: TenantServiceAccessMode
}) {
  return (
    next !== previous &&
    (next === "disabled" ||
      next === "read_only" ||
      (previous === "member_self_service" && next !== "member_self_service"))
  )
}
export const paymentReceiptMemberAudienceLabels = {
  disabled: "Disabled",
  enabled: "Enabled",
  selected_members: "Selected members",
} as const
