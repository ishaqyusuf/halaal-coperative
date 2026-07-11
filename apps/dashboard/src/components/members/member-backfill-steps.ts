export const memberBackfillStepKeys = [
  "baseline",
  "brought-forward",
  "commitments",
  "activity",
  "loans",
  "profit",
  "review",
  "apply",
] as const

export type MemberBackfillStepKey = (typeof memberBackfillStepKeys)[number]
export type MemberBackfillSetupMode = "historical_backfill" | "brought_forward"

export type MemberBackfillStepMeta = {
  description: string
  key: MemberBackfillStepKey
  label: string
}

export const memberBackfillSteps: MemberBackfillStepMeta[] = [
  {
    description: "Confirm the member, joined date, current commitment, and backfill state.",
    key: "baseline",
    label: "Baseline",
  },
  {
    description: "Capture dated monthly commitment changes before generated rows are reviewed.",
    key: "commitments",
    label: "Commitments",
  },
  {
    description: "Capture inactive or resumed months that affect generated ledger rows.",
    key: "activity",
    label: "Activity",
  },
  {
    description: "Capture historical loan positions that existed before system go-live.",
    key: "loans",
    label: "Loans",
  },
  {
    description: "Review member-specific profit adjustments for historical business periods.",
    key: "profit",
    label: "Profit",
  },
  {
    description: "Review generated rows and save a draft for this member.",
    key: "review",
    label: "Review",
  },
  {
    description: "Apply the latest reviewed backfill for this member.",
    key: "apply",
    label: "Apply",
  },
]

const broughtForwardMemberBackfillSteps: MemberBackfillStepMeta[] = [
  {
    description: "Capture the member's current savings, shares, and active obligations.",
    key: "brought-forward",
    label: "Current position",
  },
]

const stepKeySet = new Set<MemberBackfillStepKey>(memberBackfillStepKeys)

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function getMemberBackfillStepsForMode(
  setupMode: MemberBackfillSetupMode = "historical_backfill"
) {
  return setupMode === "brought_forward"
    ? broughtForwardMemberBackfillSteps
    : memberBackfillSteps
}

export function resolveMemberBackfillStep(
  value: string | string[] | undefined,
  setupMode: MemberBackfillSetupMode = "historical_backfill"
): MemberBackfillStepKey {
  const requestedStep = firstValue(value)
  const visibleSteps = getMemberBackfillStepsForMode(setupMode)
  const visibleStepKeys = new Set(visibleSteps.map((step) => step.key))

  if (
    requestedStep &&
    stepKeySet.has(requestedStep as MemberBackfillStepKey) &&
    visibleStepKeys.has(requestedStep as MemberBackfillStepKey)
  ) {
    return requestedStep as MemberBackfillStepKey
  }

  return visibleSteps[0]?.key ?? "baseline"
}

export function getMemberBackfillStepMeta(key: MemberBackfillStepKey) {
  return (
    memberBackfillSteps.find((step) => step.key === key) ??
    broughtForwardMemberBackfillSteps.find((step) => step.key === key)
  )!
}

export function getMemberBackfillAdjacentSteps(
  key: MemberBackfillStepKey,
  setupMode: MemberBackfillSetupMode = "historical_backfill"
) {
  const steps = getMemberBackfillStepsForMode(setupMode)
  const stepKeys = steps.map((step) => step.key)
  const index = stepKeys.indexOf(key)

  return {
    nextStep: index === -1 ? null : (stepKeys[index + 1] ?? null),
    previousStep: index === -1 ? null : (stepKeys[index - 1] ?? null),
  }
}

export function memberBackfillStepHref(
  memberId: string,
  step: MemberBackfillStepKey
) {
  return `/members/${memberId}/backfill?step=${step}`
}
