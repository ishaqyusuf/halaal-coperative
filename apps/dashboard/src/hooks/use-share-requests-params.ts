import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

// Staff tab on /shares: requests waiting for review, or every request.
const shareRequestsParamsSchema = {
  shareRequests: parseAsStringEnum(["waiting", "all"]).withDefault("waiting"),
}

export type ShareRequestsTab = "all" | "waiting"

export function useShareRequestsParams() {
  const [params, setParams] = useQueryStates(shareRequestsParamsSchema)

  return { ...params, setParams }
}

export const loadShareRequestsParams = createLoader(shareRequestsParamsSchema)
