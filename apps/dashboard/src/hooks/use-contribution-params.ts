import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const contributionParamsSchema = {
  contributionSheetType: parseAsStringEnum([
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
