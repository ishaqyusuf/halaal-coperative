import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

// /reports/audit: `activityId` opens one activity entry's sheet.
const activityEntryParamsSchema = {
  activityId: parseAsString,
}

export function useActivityEntryParams() {
  const [params, setParams] = useQueryStates(activityEntryParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadActivityEntryParams = createLoader(activityEntryParamsSchema)
