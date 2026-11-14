import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

// /reports download dialog: `reportExport` holds the report key.
const reportExportParamsSchema = {
  reportExport: parseAsString,
}

export function useReportExportParams() {
  const [params, setParams] = useQueryStates(reportExportParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadReportExportParams = createLoader(reportExportParamsSchema)
