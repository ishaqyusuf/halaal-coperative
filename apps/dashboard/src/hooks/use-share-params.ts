import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const shareParamsSchema = {
  shareId: parseAsString,
  shareType: parseAsStringEnum(["create", "details", "edit", "policy"]),
}

export function useShareParams() {
  const [params, setParams] = useQueryStates(shareParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadShareParams = createLoader(shareParamsSchema)
