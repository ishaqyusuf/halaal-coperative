import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const shareApplicationParamsSchema = {
  shareApplicationId: parseAsString,
  shareApplicationSheetType: parseAsString,
}

export function useShareApplicationParams() {
  const [params, setParams] = useQueryStates(shareApplicationParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadShareApplicationParams = createLoader(
  shareApplicationParamsSchema
)
