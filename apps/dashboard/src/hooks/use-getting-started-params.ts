import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const gettingStartedStepKeys = [
  "start-date",
  "charges",
  "shares",
  "profit-policy",
  "business",
  "profit-seasons",
  "admin-member",
  "review",
] as const

export type GettingStartedStepKey = (typeof gettingStartedStepKeys)[number]

const gettingStartedParamsSchema = {
  migrationMemberId: parseAsString,
  step: parseAsStringEnum([...gettingStartedStepKeys]),
}

export function useGettingStartedParams() {
  const [params, setParams] = useQueryStates(gettingStartedParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadGettingStartedParams = createLoader(
  gettingStartedParamsSchema
)
