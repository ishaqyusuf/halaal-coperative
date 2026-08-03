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
    body: "Manual commitment proof, transfer receipts, cash office payments, and other payment evidence.",
    key: "payment_receipts",
    label: "Payment receipts",
  },
  {
    body: "Member procurement requests and staff-recorded procurement workflows.",
    key: "procurement",
    label: "Procurement",
  },
  {
    body: "Foodstuff Purchase applications and cycle participation.",
    key: "food_purchase",
    label: "Foodstuff Purchase",
  },
  {
    body: "Member support cases and official responses.",
    key: "support_cases",
    label: "Member support",
  },
  {
    body: "Ministry, employer, payroll, or other deduction-source records.",
    key: "collection_sources",
    label: "Collection sources",
  },
  {
    body: "Monthly batch posting when a collection source has released deductions.",
    key: "collection_source_batch_posting",
    label: "Source batch posting",
  },
] as const satisfies ReadonlyArray<{
  body: string
  key: TenantServiceKey
  label: string
}>

export const operationProfileServiceSections = [
  {
    body: "Configure how contributions, payment evidence, and deduction-source batches enter the cooperative workspace.",
    key: "collections",
    label: "Collections",
    serviceKeys: [
      "payment_receipts",
      "collection_sources",
      "collection_source_batch_posting",
    ],
  },
  {
    body: "Configure the request and support services members can access through the cooperative.",
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
    description:
      "The service is hidden for new work while existing records remain readable.",
    label: "Not offered",
    summary: "Unavailable for new work",
    value: "disabled",
  },
  {
    description:
      "Staff can create and manage service records from the cooperative office.",
    label: "Office only",
    summary: "Staff can create",
    value: "office_only",
  },
  {
    description:
      "Members can start requests while staff retain operational access.",
    label: "Member self-service",
    summary: "Members and staff can create",
    value: "member_self_service",
  },
  {
    description:
      "Existing records remain visible, but no new service work can start.",
    label: "View only",
    summary: "History remains visible",
    value: "read_only",
  },
] as const satisfies ReadonlyArray<{
  description: string
  label: string
  summary: string
  value: TenantServiceAccessMode
}>

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
