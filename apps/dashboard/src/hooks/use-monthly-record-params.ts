import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"

export const monthlyRecordParamsSchema = {
  monthlyRecordMemberId: parseAsString,
  monthlyRecordSheetType: parseAsStringEnum([
    "generate",
    "create",
    "apply",
    "cancel",
    "receive",
    "settings",
    "workplaces",
  ]),
  targetMonth: parseAsInteger,
  targetYear: parseAsInteger,
}

export function useMonthlyRecordParams() {
  const [params, setParams] = useQueryStates(monthlyRecordParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMonthlyRecordParams = createLoader(monthlyRecordParamsSchema)
