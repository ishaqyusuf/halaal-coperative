import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

// One Path step ids for Getting Started (journey steps 5–11). `profit-seasons`
// is the conditional follow-on of step 8; `admin-member` is step 10 (the
// members checklist at /onboarding-success) and `review` is step 11, Go live.
export const gettingStartedStepKeys = [
  "setup-mode",
  "operation-profile",
  "shares-charges",
  "profit",
  "profit-seasons",
  "review-setup",
  "admin-member",
  "review",
] as const

export type GettingStartedStepKey = (typeof gettingStartedStepKeys)[number]

// Ids used before One Path. They still parse so old links and bookmarks
// redirect to the step that replaced them.
export const legacyGettingStartedStepKeys = [
  "start-date",
  "charges",
  "shares",
  "profit-policy",
  "business",
] as const

export type LegacyGettingStartedStepKey =
  (typeof legacyGettingStartedStepKeys)[number]

const gettingStartedParamsSchema = {
  migrationMemberId: parseAsString,
  profileStep: parseAsString,
  step: parseAsStringEnum([
    ...gettingStartedStepKeys,
    ...legacyGettingStartedStepKeys,
  ]),
}

export function useGettingStartedParams() {
  const [params, setParams] = useQueryStates(gettingStartedParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadGettingStartedParams = createLoader(gettingStartedParamsSchema)
