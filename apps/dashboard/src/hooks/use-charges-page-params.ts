import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

// The /charges page: which tab is open and the "Charged to members" search.
const chargesPageParamsSchema = {
  chargedQ: parseAsString,
  view: parseAsStringEnum(["definitions", "applications"]).withDefault(
    "definitions"
  ),
}

export type ChargesPageView = "applications" | "definitions"

export function useChargesPageParams() {
  const [params, setParams] = useQueryStates(chargesPageParamsSchema)

  return { ...params, setParams }
}

export const loadChargesPageParams = createLoader(chargesPageParamsSchema)
