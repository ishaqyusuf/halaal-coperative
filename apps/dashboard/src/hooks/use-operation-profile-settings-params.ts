import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"
import type { TenantServiceKey } from "@halaalvest/db"
import { operationProfileServiceKeys } from "@/lib/settings/operation-profile-settings"

export const operationProfileSettingsParamsSchema = {
  operationProfileServiceKey: parseAsStringEnum<TenantServiceKey>([
    ...operationProfileServiceKeys,
  ]),
  operationProfileSettingsSheetType: parseAsStringEnum(["edit"]),
}

export function useOperationProfileSettingsParams() {
  const [params, setParams] = useQueryStates(
    operationProfileSettingsParamsSchema
  )

  return {
    ...params,
    setParams,
  }
}

export const loadOperationProfileSettingsParams = createLoader(
  operationProfileSettingsParamsSchema
)
