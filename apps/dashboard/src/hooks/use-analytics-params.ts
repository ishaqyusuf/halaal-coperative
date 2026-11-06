import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringLiteral } from "nuqs/server"

export const analyticsPeriods = [
  "current_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
] as const

export const analyticsParamsSchema = {
  period: parseAsStringLiteral(analyticsPeriods).withDefault("last_6_months"),
}

export function useAnalyticsParams() {
  const [params, setParams] = useQueryStates(analyticsParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadAnalyticsParams = createLoader(analyticsParamsSchema)
