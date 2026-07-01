import { useQueryStates } from "nuqs"
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server"

const createMemberParamsSchema = {
  gm: parseAsBoolean.withDefault(false),
  gmId: parseAsString,
  memberId: parseAsString.withDefault("-1"),
  name: parseAsString,
}

export function useCreateMemberParams() {
  const [params, setParams] = useQueryStates(createMemberParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadCreateMemberParams = createLoader(createMemberParamsSchema)
