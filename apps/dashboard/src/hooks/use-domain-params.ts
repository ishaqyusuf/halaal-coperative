import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

export const domainParamsSchema = {
  domainDialog: parseAsStringEnum(["add"]),
}

export function useDomainParams() {
  const [params, setParams] = useQueryStates(domainParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadDomainParams = createLoader(domainParamsSchema)
