import type {
  TenantOperationProfileReadModel,
  TenantServiceAccessMode,
} from "@halaalvest/db"
import type {
  CommitmentCollectionChoice,
  ServiceAvailabilityChoice,
  ServiceRequestChannelChoice,
} from "./operation-profile-flow"

// One Path step 6 ("Services you offer"): the plain-label mapping, the screen's
// initial answers and the exact FormData the existing
// `updateTenantOperationProfileAction` handler reads. Kept pure so the field
// contract can be tested without rendering the form.

export type { CommitmentCollectionChoice, ServiceAvailabilityChoice }
export type ServiceRequestChannel = ServiceRequestChannelChoice
export type SupportAccessChoice = "member" | "office"

export const commitmentCollectionChoices = [
  "office",
  "member_receipts",
  "collection_sources",
  "mixed",
] as const satisfies readonly CommitmentCollectionChoice[]

export const serviceOfferedChoices = [
  "no",
  "yes",
] as const satisfies readonly ServiceAvailabilityChoice[]

export const serviceRequestChannelChoices = [
  "office",
  "member",
] as const satisfies readonly ServiceRequestChannel[]

export const supportAccessChoices = [
  "member",
  "office",
] as const satisfies readonly SupportAccessChoice[]

export const commitmentCollectionLabels = {
  collection_sources: "In bulk from an employer, ministry or payroll list",
  member_receipts: "Members upload payment receipts",
  mixed: "A mix of these",
  office: "Staff record each payment",
} as const satisfies Record<CommitmentCollectionChoice, string>

export const serviceOfferedLabels = {
  no: "No",
  yes: "Yes, we do this",
} as const satisfies Record<ServiceAvailabilityChoice, string>

export const serviceRequestChannelLabels = {
  member: "Members, from the app",
  office: "Our office",
} as const satisfies Record<ServiceRequestChannel, string>

export const supportAccessLabels = {
  member: "They message us in the app",
  office: "They contact the office",
} as const satisfies Record<SupportAccessChoice, string>

export const operationProfileSetupChangeReason =
  "Initial setup operation profile update."

export type OperationProfileSetupValues = {
  commitmentCollection: CommitmentCollectionChoice
  foodPurchaseOffered: ServiceAvailabilityChoice
  foodPurchaseRequestChannel: ServiceRequestChannel
  procurementOffered: ServiceAvailabilityChoice
  procurementRequestChannel: ServiceRequestChannel
  supportAccess: SupportAccessChoice
}

// Every field `updateTenantOperationProfileAction` reads for a guided save.
// `<service>AccessMode` overrides are deliberately not sent: the handler falls
// back to the current mode, and the guided answers above set every service.
// `redirectTo` is not sent either: the client navigates after the save.
export const operationProfileSetupFieldNames = [
  "commitmentCollection",
  "procurementOffered",
  "procurementRequestChannel",
  "foodPurchaseOffered",
  "foodPurchaseRequestChannel",
  "supportAccess",
  "procurementMaximumActiveObligationsPerMember",
  "foodPurchaseMaximumActiveObligationsPerMember",
  "foodPurchaseRequiresOpenCycle",
  "changeReason",
] as const

export type OperationProfileSetupFieldName =
  (typeof operationProfileSetupFieldNames)[number]

export type OperationProfileSetupField = [
  OperationProfileSetupFieldName,
  string,
]

export function isOperationProfileServiceOffered(
  accessMode: TenantServiceAccessMode
) {
  return accessMode !== "disabled" && accessMode !== "read_only"
}

// True when "No" keeps existing records visible (the handler keeps `read_only`
// rather than disabling), so the screen can say so.
export function keepsExistingRecordsWhenNotOffered(
  accessMode: TenantServiceAccessMode
) {
  return accessMode === "read_only"
}

function requestChannelFromAccessMode(
  accessMode: TenantServiceAccessMode
): ServiceRequestChannel {
  return accessMode === "member_self_service" ? "member" : "office"
}

export function getCommitmentCollectionChoiceFromProfile(
  profile: TenantOperationProfileReadModel
): CommitmentCollectionChoice {
  const membersUploadReceipts =
    profile.services.payment_receipts.accessMode === "member_self_service"
  const usesCollectionSources =
    profile.services.collection_sources.accessMode !== "disabled"

  if (membersUploadReceipts && usesCollectionSources) return "mixed"
  if (usesCollectionSources) return "collection_sources"
  if (membersUploadReceipts) return "member_receipts"
  return "office"
}

// With today's database defaults (receipts office only, procurement and
// Foodstuff Purchase disabled, support self-service) this yields office / No /
// No / "They message us in the app".
export function getOperationProfileSetupInitialValues(
  profile: TenantOperationProfileReadModel
): OperationProfileSetupValues {
  const procurementMode = profile.services.procurement.accessMode
  const foodPurchaseMode = profile.services.food_purchase.accessMode

  return {
    commitmentCollection: getCommitmentCollectionChoiceFromProfile(profile),
    foodPurchaseOffered: isOperationProfileServiceOffered(foodPurchaseMode)
      ? "yes"
      : "no",
    foodPurchaseRequestChannel: requestChannelFromAccessMode(foodPurchaseMode),
    procurementOffered: isOperationProfileServiceOffered(procurementMode)
      ? "yes"
      : "no",
    procurementRequestChannel: requestChannelFromAccessMode(procurementMode),
    supportAccess:
      profile.services.support_cases.accessMode === "office_only"
        ? "office"
        : "member",
  }
}

export function buildOperationProfileSetupFields(
  values: OperationProfileSetupValues,
  profile: TenantOperationProfileReadModel
): OperationProfileSetupField[] {
  const { policy } = profile

  return [
    ["commitmentCollection", values.commitmentCollection],
    ["procurementOffered", values.procurementOffered],
    ["procurementRequestChannel", values.procurementRequestChannel],
    ["foodPurchaseOffered", values.foodPurchaseOffered],
    ["foodPurchaseRequestChannel", values.foodPurchaseRequestChannel],
    ["supportAccess", values.supportAccess],
    // Hidden on this screen: required by the handler, so keep current values.
    [
      "procurementMaximumActiveObligationsPerMember",
      String(policy.procurementMaximumActiveObligationsPerMember),
    ],
    [
      "foodPurchaseMaximumActiveObligationsPerMember",
      String(policy.foodPurchaseMaximumActiveObligationsPerMember),
    ],
    // A missing value means false on the server, so always send it.
    [
      "foodPurchaseRequiresOpenCycle",
      policy.foodPurchaseRequiresOpenCycle ? "true" : "false",
    ],
    // The database requires a reason when a service is disabled or loses
    // self-service; setup never prompts for one.
    ["changeReason", operationProfileSetupChangeReason],
  ]
}

export function buildOperationProfileSetupFormData(
  values: OperationProfileSetupValues,
  profile: TenantOperationProfileReadModel
) {
  const formData = new FormData()

  for (const [name, value] of buildOperationProfileSetupFields(
    values,
    profile
  )) {
    formData.append(name, value)
  }

  return formData
}
