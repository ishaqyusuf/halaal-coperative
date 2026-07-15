"use client"

import { Suspense } from "react"
import {
  ContributionContent,
  type CollectionSourceBatchOption,
  type CollectionSourceBatchSheetOption,
  type ContributionLoanOption,
  type ContributionMemberOption,
  type ContributionPlanOption,
} from "@/components/contribution-content"
import { ContributionSheetHeader } from "@/components/contribution-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useContributionParams } from "@/hooks/use-contribution-params"

function isContributionSheetOpen(type: string | null) {
  return Boolean(
    type === "plan" ||
      type === "payment" ||
      type === "preference" ||
      type === "editPlan" ||
      type === "stageBatch" ||
      type === "postBatchRows" ||
      type === "markBatchRowCollected" ||
      type === "markBatchRowException" ||
      type === "postBatchRow"
  )
}

export function ContributionSheet({
  activeCommitmentPlans,
  activeLoans,
  collectionSourceBatchOptions,
  devMode,
  members,
  selectedCollectionSourceBatch,
}: {
  activeCommitmentPlans: ContributionPlanOption[]
  activeLoans: ContributionLoanOption[]
  collectionSourceBatchOptions: CollectionSourceBatchOption[]
  devMode: boolean
  members: ContributionMemberOption[]
  selectedCollectionSourceBatch?: CollectionSourceBatchSheetOption | null
}) {
  const { contributionSheetType, setParams } = useContributionParams()
  const isOpen = isContributionSheetOpen(contributionSheetType)
  const isWide =
    contributionSheetType === "plan" || contributionSheetType === "payment"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent
        className={
          isWide ? "w-full overflow-y-auto sm:max-w-2xl" : "overflow-y-auto"
        }
      >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading contribution form...
              </div>
            }
          >
            <ContributionSheetHeader />
            <ContributionContent
              activeCommitmentPlans={activeCommitmentPlans}
              activeLoans={activeLoans}
              collectionSourceBatchOptions={collectionSourceBatchOptions}
              devMode={devMode}
              members={members}
              selectedCollectionSourceBatch={selectedCollectionSourceBatch}
            />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
