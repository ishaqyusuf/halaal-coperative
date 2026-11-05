// One Path cooperative onboarding: the single ordered map that the marketing
// sign-up shell, the dashboard Getting Started rail, the mobile progress bar
// and review links all read. See ADR-20261011 One Path cooperative onboarding.

export type OnboardingJourneyPartKey = "workspace" | "setup" | "members"

export type OnboardingJourneyStepKey =
  | "sign-up"
  | "verify-email"
  | "cooperative-details"
  | "password"
  | "setup-mode"
  | "operation-profile"
  | "shares-charges"
  | "profit"
  | "review-setup"
  | "add-members"
  | "go-live"

export type OnboardingJourneyPart = {
  estimate: string
  key: OnboardingJourneyPartKey
  number: number
  title: string
}

export type OnboardingJourneyStep = {
  key: OnboardingJourneyStepKey
  label: string
  number: number
  part: OnboardingJourneyPartKey
}

export const onboardingJourneyParts: readonly OnboardingJourneyPart[] = [
  {
    estimate: "about 4 min",
    key: "workspace",
    number: 1,
    title: "Create your workspace",
  },
  {
    estimate: "about 10 min",
    key: "setup",
    number: 2,
    title: "Set up how you run",
  },
  {
    estimate: "per member",
    key: "members",
    number: 3,
    title: "Bring your members",
  },
]

export const onboardingJourneySteps: readonly OnboardingJourneyStep[] = [
  { key: "sign-up", label: "Sign up", number: 1, part: "workspace" },
  { key: "verify-email", label: "Verify email", number: 2, part: "workspace" },
  {
    key: "cooperative-details",
    label: "Cooperative details",
    number: 3,
    part: "workspace",
  },
  { key: "password", label: "Password", number: 4, part: "workspace" },
  {
    key: "setup-mode",
    label: "Where records start",
    number: 5,
    part: "setup",
  },
  {
    key: "operation-profile",
    label: "Services you offer",
    number: 6,
    part: "setup",
  },
  {
    key: "shares-charges",
    label: "Shares and charges",
    number: 7,
    part: "setup",
  },
  { key: "profit", label: "Profit sharing", number: 8, part: "setup" },
  { key: "review-setup", label: "Review setup", number: 9, part: "setup" },
  { key: "add-members", label: "Add members", number: 10, part: "members" },
  { key: "go-live", label: "Go live", number: 11, part: "members" },
]

export const onboardingJourneyStepCount = onboardingJourneySteps.length

// Steps 1–4 happen before the workspace exists; once it does they are locked
// in every rail (the admin cannot reopen sign-up from the dashboard).
export const onboardingJourneyWorkspaceStepKeys = onboardingJourneySteps
  .filter((step) => step.part === "workspace")
  .map((step) => step.key)

export function isOnboardingJourneyStepKey(
  value: string | null | undefined
): value is OnboardingJourneyStepKey {
  return onboardingJourneySteps.some((step) => step.key === value)
}

export function getOnboardingJourneyPart(partKey: OnboardingJourneyPartKey) {
  const part = onboardingJourneyParts.find((item) => item.key === partKey)

  if (!part) {
    throw new Error(`Unknown onboarding journey part: ${partKey}`)
  }

  return part
}

export function getOnboardingJourneyPartSteps(
  partKey: OnboardingJourneyPartKey
) {
  return onboardingJourneySteps.filter((step) => step.part === partKey)
}

export function getOnboardingJourneyStep(stepKey: OnboardingJourneyStepKey) {
  const step = onboardingJourneySteps.find((item) => item.key === stepKey)

  if (!step) {
    throw new Error(`Unknown onboarding journey step: ${stepKey}`)
  }

  return step
}

export type OnboardingJourneyPosition = {
  next: OnboardingJourneyStep | null
  part: OnboardingJourneyPart
  partStepCount: number
  partStepIndex: number
  previous: OnboardingJourneyStep | null
  step: OnboardingJourneyStep
  totalParts: number
  totalSteps: number
}

export function getJourneyPosition(
  stepKey: OnboardingJourneyStepKey
): OnboardingJourneyPosition {
  const index = onboardingJourneySteps.findIndex((item) => item.key === stepKey)

  if (index < 0) {
    throw new Error(`Unknown onboarding journey step: ${stepKey}`)
  }

  const step = onboardingJourneySteps[index]!
  const partSteps = getOnboardingJourneyPartSteps(step.part)

  return {
    next: onboardingJourneySteps[index + 1] ?? null,
    part: getOnboardingJourneyPart(step.part),
    partStepCount: partSteps.length,
    partStepIndex: partSteps.findIndex((item) => item.key === stepKey) + 1,
    previous: index > 0 ? onboardingJourneySteps[index - 1]! : null,
    step,
    totalParts: onboardingJourneyParts.length,
    totalSteps: onboardingJourneyStepCount,
  }
}

export function formatJourneyStepCounter(stepKey: OnboardingJourneyStepKey) {
  return `Step ${getOnboardingJourneyStep(stepKey).number} of ${onboardingJourneyStepCount}`
}

export function formatJourneyPartCounter(stepKey: OnboardingJourneyStepKey) {
  const position = getJourneyPosition(stepKey)

  return `Part ${position.part.number} of ${position.totalParts} · ${position.part.title}`
}

export type OnboardingJourneyStepState = "complete" | "current" | "upcoming"

// Rail state for a step relative to the current step. Completed steps are
// selectable except steps 1–4 once the workspace exists.
export function getJourneyStepState(input: {
  currentStepKey: OnboardingJourneyStepKey
  stepKey: OnboardingJourneyStepKey
}): OnboardingJourneyStepState {
  const current = getOnboardingJourneyStep(input.currentStepKey).number
  const step = getOnboardingJourneyStep(input.stepKey).number

  if (step < current) return "complete"
  if (step === current) return "current"
  return "upcoming"
}

export function isJourneyStepSelectable(input: {
  completedStepKeys?: readonly OnboardingJourneyStepKey[]
  currentStepKey: OnboardingJourneyStepKey
  stepKey: OnboardingJourneyStepKey
  workspaceCreated: boolean
}) {
  if (
    input.workspaceCreated &&
    onboardingJourneyWorkspaceStepKeys.includes(input.stepKey)
  ) {
    return false
  }

  if (input.completedStepKeys) {
    return (
      input.stepKey !== input.currentStepKey &&
      input.completedStepKeys.includes(input.stepKey)
    )
  }

  return (
    getJourneyStepState({
      currentStepKey: input.currentStepKey,
      stepKey: input.stepKey,
    }) === "complete"
  )
}
