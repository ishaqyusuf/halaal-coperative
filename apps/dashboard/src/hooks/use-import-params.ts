import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const importParamsSchema = {
  importBatchId: parseAsString,
  importSheetType: parseAsStringEnum(["create", "details", "apply"]),
  importType: parseAsString,
}

export function useImportParams() {
  const [params, setParams] = useQueryStates(importParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadImportParams = createLoader(importParamsSchema)
