import type { TenantServiceAccessMode } from "@halaalvest/db"

export const operationProfileStepKeys = [
  "intro",
  "commitments",
  "procurement",
  "foodstuff",
  "member-access",
  "review",
] as const

export type OperationProfileStepKey = (typeof operationProfileStepKeys)[number]

export const firstOperationProfileStep = operationProfileStepKeys[0]

export function resolveOperationProfileStep(
  value: string | null | undefined
): OperationProfileStepKey {
  return operationProfileStepKeys.includes(value as OperationProfileStepKey)
    ? (value as OperationProfileStepKey)
    : firstOperationProfileStep
}

export function getOperationProfileStepIndex(step: OperationProfileStepKey) {
  return operationProfileStepKeys.indexOf(step)
}

export function getOperationProfileStepMeta(step: OperationProfileStepKey) {
  const meta = {
    commitments: {
      description:
        "Choose how commitments, savings, and payment evidence reach the cooperative.",
      label: "Commitment collection",
    },
    foodstuff: {
      description:
        "Decide if the cooperative runs Foodstuff Purchase cycles and who can apply.",
      label: "Foodstuff Purchase",
    },
    intro: {
      description:
        "Tell Halaalvest which services this cooperative actually operates.",
      label: "Overview",
    },
    "member-access": {
      description:
        "Confirm the member-facing support and receipt channels that should stay available.",
      label: "Member access",
    },
    procurement: {
      description:
        "Decide if procurement is offered and whether requests begin online or in the office.",
      label: "Procurement",
    },
    review: {
      description:
        "Review the operation profile before saving and continuing setup.",
      label: "Review",
    },
  } satisfies Record<
    OperationProfileStepKey,
    { description: string; label: string }
  >

  return meta[step]
}

export function operationProfileStepHref(step: OperationProfileStepKey) {
  return `?step=operation-profile&profileStep=${step}`
}

export function getOperationProfileStepNavigation(
  step: OperationProfileStepKey
) {
  const index = getOperationProfileStepIndex(step)
  const previousStep = operationProfileStepKeys[index - 1] ?? null
  const nextStep = operationProfileStepKeys[index + 1] ?? null

  return {
    nextHref: nextStep
      ? operationProfileStepHref(nextStep)
      : "?step=start-date",
    nextStep,
    previousHref: previousStep
      ? operationProfileStepHref(previousStep)
      : "?step=setup-mode",
    previousStep,
  }
}

export type ServiceAvailabilityChoice = "no" | "yes"
export type ServiceRequestChannelChoice = "office" | "member"
export type CommitmentCollectionChoice =
  | "office"
  | "member_receipts"
  | "collection_sources"
  | "mixed"

export function accessModeFromServiceChoice(
  availability: ServiceAvailabilityChoice,
  channel: ServiceRequestChannelChoice = "office",
  existingRecordsRequireReadOnly = false
): TenantServiceAccessMode {
  if (existingRecordsRequireReadOnly && availability === "no") {
    return "read_only"
  }

  if (availability === "no") return "disabled"

  return channel === "member" ? "member_self_service" : "office_only"
}

export function accessModesFromCommitmentCollectionChoice(
  choice: CommitmentCollectionChoice
) {
  return {
    collectionSourceBatchPosting:
      choice === "collection_sources" || choice === "mixed"
        ? "office_only"
        : "disabled",
    collectionSources:
      choice === "collection_sources" || choice === "mixed"
        ? "office_only"
        : "disabled",
    paymentReceipts:
      choice === "member_receipts" || choice === "mixed"
        ? "member_self_service"
        : "office_only",
  } satisfies {
    collectionSourceBatchPosting: TenantServiceAccessMode
    collectionSources: TenantServiceAccessMode
    paymentReceipts: TenantServiceAccessMode
  }
}
