import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

export const tenantFinanceSettingsParamsSchema = {
  tenantFinanceSettingsSheetType: parseAsStringEnum([
    "startDate",
    "financingPolicy",
    "financingCycle",
    "quickProduct",
    "normalProduct",
    "businessProfitPolicy",
  ]),
}

export function useTenantFinanceSettingsParams() {
  const [params, setParams] = useQueryStates(tenantFinanceSettingsParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadTenantFinanceSettingsParams = createLoader(
  tenantFinanceSettingsParamsSchema
)
