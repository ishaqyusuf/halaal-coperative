import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

export const roleSettingsParamsSchema = {
  roleSettingsSheetType: parseAsStringEnum(["assign"]),
}

export function useRoleSettingsParams() {
  const [params, setParams] = useQueryStates(roleSettingsParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadRoleSettingsParams = createLoader(roleSettingsParamsSchema)
