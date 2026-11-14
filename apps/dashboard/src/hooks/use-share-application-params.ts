import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

// /shares overlays: staff "create" (for a member), member "member-create",
// and the request "details" sheet where staff also approve or decline.
const shareApplicationParamsSchema = {
  shareApplicationId: parseAsString,
  shareApplicationSheetType: parseAsStringEnum([
    "create",
    "details",
    "member-create",
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
