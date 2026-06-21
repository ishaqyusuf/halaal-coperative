import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const chargeParamsSchema = {
  chargeId: parseAsString,
  chargeType: parseAsStringEnum(["create", "update", "edit"]),
  chargeVersionId: parseAsString,
}

export function useChargeParams() {
  const [params, setParams] = useQueryStates(chargeParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadChargeParams = createLoader(chargeParamsSchema)
