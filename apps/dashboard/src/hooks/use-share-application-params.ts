import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const shareApplicationParamsSchema = {
  shareApplicationId: parseAsString,
  shareApplicationSheetType: parseAsStringEnum([
    "create",
    "details",
    "member-create",
    "review",
  ]),
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
