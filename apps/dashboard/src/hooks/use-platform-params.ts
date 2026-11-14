import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

// Platform-operator queues: `privacyRequestId` opens a privacy request's
// sheet; `refundReviewId` opens a Google refund review's sheet.
export const platformParamsSchema = {
  privacyRequestId: parseAsString,
  refundReviewId: parseAsString,
}

export function usePlatformParams() {
  const [params, setParams] = useQueryStates(platformParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadPlatformParams = createLoader(platformParamsSchema)
