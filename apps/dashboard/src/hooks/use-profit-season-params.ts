import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

// The profit-sharing season sheet on /business.
const profitSeasonParamsSchema = {
  profitSeasonId: parseAsString,
}

export function useProfitSeasonParams() {
  const [params, setParams] = useQueryStates(profitSeasonParamsSchema)

  return { ...params, setParams }
}

export const loadProfitSeasonParams = createLoader(profitSeasonParamsSchema)
