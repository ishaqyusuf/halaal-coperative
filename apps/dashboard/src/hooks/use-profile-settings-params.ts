import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

export const profileSettingsParamsSchema = {
  profileSettingsSheetType: parseAsStringEnum(["edit"]),
}

export function useProfileSettingsParams() {
  const [params, setParams] = useQueryStates(profileSettingsParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadProfileSettingsParams = createLoader(
  profileSettingsParamsSchema
)
