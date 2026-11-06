import { useQueryStates } from "nuqs"
import { parseAsString, parseAsStringEnum } from "nuqs/server"

// Each value is a `memberBackfill` registry mode in lib/workflow-presentations.ts.
export const initialMigrationSheetTypes = [
  "apply",
  "finalize",
  "legacyLoanCreate",
  "legacyLoanEdit",
  "noHistory",
] as const

export type InitialMigrationSheetType =
  (typeof initialMigrationSheetTypes)[number]

const initialMigrationParamsSchema = {
  initialMigrationSheetType: parseAsStringEnum([...initialMigrationSheetTypes]),
  legacyLoanDraftId: parseAsString,
}

export function useInitialMigrationParams() {
  const [params, setParams] = useQueryStates(initialMigrationParamsSchema)

  return {
    ...params,
    setParams,
  }
}
