import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const contributionParamsSchema = {
  batchId: parseAsString,
  contributionSheetType: parseAsStringEnum([
    "details",
    "plan",
    "payment",
    "preference",
    "editPlan",
    "stageBatch",
    "postBatchRows",
    "markBatchRowCollected",
    "markBatchRowException",
    "postBatchRow",
  ]),
  selectedCollectionBatchId: parseAsString,
  selectedCollectionRowId: parseAsString,
  // The ledger entry the "details" sheet shows (WP15 row click).
  selectedContributionId: parseAsString,
  selectedContributionMemberId: parseAsString,
  selectedContributionPlanId: parseAsString,
}

export function useContributionParams() {
  const [params, setParams] = useQueryStates(contributionParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadContributionParams = createLoader(contributionParamsSchema)
