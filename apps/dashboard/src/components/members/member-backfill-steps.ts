export const memberBackfillStepKeys = [
  "baseline",
  "commitments",
  "activity",
  "loans",
  "profit",
  "review",
  "apply",
] as const

export type MemberBackfillStepKey = (typeof memberBackfillStepKeys)[number]

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

const stepKeySet = new Set<MemberBackfillStepKey>(memberBackfillStepKeys)

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function resolveMemberBackfillStep(
  value: string | string[] | undefined
): MemberBackfillStepKey {
  const requestedStep = firstValue(value)

  return requestedStep && stepKeySet.has(requestedStep as MemberBackfillStepKey)
    ? (requestedStep as MemberBackfillStepKey)
    : "baseline"
}

export function getMemberBackfillStepMeta(key: MemberBackfillStepKey) {
  return memberBackfillSteps.find((step) => step.key === key)!
}

export function getMemberBackfillAdjacentSteps(key: MemberBackfillStepKey) {
  const index = memberBackfillStepKeys.indexOf(key)

  return {
    nextStep: memberBackfillStepKeys[index + 1] ?? null,
    previousStep: memberBackfillStepKeys[index - 1] ?? null,
  }
}

export function memberBackfillStepHref(
  memberId: string,
  step: MemberBackfillStepKey
) {
  return `/members/${memberId}/backfill?step=${step}`
}
