import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

export const trustSettingsParamsSchema = {
  trustSettingsSheetType: parseAsStringEnum(["edit"]),
}

export function useTrustSettingsParams() {
  const [params, setParams] = useQueryStates(trustSettingsParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadTrustSettingsParams = createLoader(trustSettingsParamsSchema)
