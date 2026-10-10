import type {
  MobileOperationProfileSnapshot,
  OperationProfileAccessMode,
  OperationProfileServiceKey,
} from "./operation-profile-types"

export const operationProfileModeOptions = [
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
] as const satisfies readonly {
  description: string
  label: string
  summary: string
  value: OperationProfileAccessMode
}[]

export const operationProfileServices = [
  {
    icon: "ReceiptText",
    key: "payment_receipts",
    label: "Payment receipts",
    section: "member_channels",
  },
  {
    icon: "PackageSearch",
    key: "procurement",
    label: "Procurement",
    section: "member_channels",
  },
  {
    icon: "ShoppingBasket",
    key: "food_purchase",
    label: "Foodstuff Purchase",
    section: "member_channels",
  },
  {
    icon: "MessagesSquare",
    key: "support_cases",
    label: "Support cases",
    section: "member_channels",
  },
  {
    icon: "Landmark",
    key: "collection_sources",
    label: "Collection sources",
    section: "collection_controls",
  },
  {
    icon: "Layers3",
    key: "collection_source_batch_posting",
    label: "Source-batch posting",
    section: "collection_controls",
  },
] as const satisfies readonly {
  icon: string
  key: OperationProfileServiceKey
  label: string
  section: "collection_controls" | "member_channels"
}[]

export const operationProfileSections = [
  { key: "member_channels", label: "Member channels" },
  { key: "collection_controls", label: "Collection controls" },
] as const

export function canManageMobileOperationProfile(
  role: string | null | undefined
) {
  return role === "super_admin" || role === "tenant_admin"
}

export function getOperationProfileMode(mode: OperationProfileAccessMode) {
  return operationProfileModeOptions.find((option) => option.value === mode)!
}

export function getOperationProfileService(
  serviceKey: OperationProfileServiceKey
) {
  return operationProfileServices.find((service) => service.key === serviceKey)!
}

export function isRestrictiveOperationProfileChange(input: {
  next: OperationProfileAccessMode
  previous: OperationProfileAccessMode
}) {
  return (
    input.next !== input.previous &&
    (input.next === "disabled" ||
      input.next === "read_only" ||
      (input.previous === "member_self_service" &&
        input.next !== "member_self_service"))
  )
}

export function isOperationProfileReadOnly(input: {
  cacheStatus?: string
  isOnline: boolean
  subscriptionAccessEnabled: boolean
}) {
  return (
    !input.isOnline ||
    input.cacheStatus === "stale" ||
    !input.subscriptionAccessEnabled
  )
}

export function getOperationProfileCounts(
  snapshot: MobileOperationProfileSnapshot
) {
  return snapshot.services.reduce(
    (counts, service) => {
      if (service.effectiveAccessMode === "member_self_service") {
        counts.memberSelfService += 1
      } else if (service.effectiveAccessMode === "office_only") {
        counts.officeOnly += 1
      } else {
        counts.restricted += 1
      }
      return counts
    },
    { memberSelfService: 0, officeOnly: 0, restricted: 0 }
  )
}

export function getOperationProfileServiceConsequence(input: {
  accessMode: OperationProfileAccessMode
  serviceKey: OperationProfileServiceKey
}) {
  const serviceLabel = getOperationProfileService(input.serviceKey).label

  switch (input.accessMode) {
    case "disabled":
      return `New ${serviceLabel.toLowerCase()} work is paused. Existing records remain readable.`
    case "office_only":
      return "Staff can create and manage records. Members can review existing activity."
    case "member_self_service":
      return "Members can start requests. Staff retain operational access."
    case "read_only":
      return "History remains readable, but no new work can start."
  }
}
