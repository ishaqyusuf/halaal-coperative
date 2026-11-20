"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RepaymentContent } from "@/components/repayment-content"
import { RepaymentSheetHeader } from "@/components/repayment-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const disabledId = "00000000-0000-4000-8000-000000000000"
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function RepaymentSheet({
  canPostRepayment,
  devMode,
}: {
  canPostRepayment: boolean
  devMode: boolean
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const {
    loanId,
    repaymentId,
    repaymentScheduleItemId,
    repaymentSheetType,
    setParams,
  } = useRepaymentParams()
  const isOpen = Boolean(repaymentSheetType)
  const presentation = getWorkflowPresentation("repayment", repaymentSheetType)
  const shouldLoadPostOptions =
    canPostRepayment && repaymentSheetType === "post"
  const shouldLoadSchedule =
    isOpen &&
    (repaymentSheetType === "followUp" ||
      repaymentSheetType === "scheduleDetails") &&
    Boolean(
      repaymentScheduleItemId && uuidPattern.test(repaymentScheduleItemId)
    )
  const shouldLoadRepayment =
    isOpen &&
    repaymentSheetType === "repaymentDetails" &&
    Boolean(repaymentId && uuidPattern.test(repaymentId))
  const scheduleQuery = useQuery(
    trpc.repayments.scheduleItem.queryOptions(
      {
        repaymentScheduleItemId: repaymentScheduleItemId ?? disabledId,
      },
      { enabled: shouldLoadSchedule }
    )
  )
  const repaymentQuery = useQuery(
    trpc.repayments.repayment.queryOptions(
      { repaymentId: repaymentId ?? disabledId },
      { enabled: shouldLoadRepayment }
    )
  )
  const postOptions = useQuery(
    trpc.repayments.postOptions.queryOptions(undefined, {
      enabled: shouldLoadPostOptions,
      staleTime: 0,
    })
  )
  const shouldLoadFollowUpOptions =
    shouldLoadSchedule && repaymentSheetType === "followUp"
  const followUpFilters = useQuery(
    trpc.filters.repayments.queryOptions(undefined, {
      enabled: shouldLoadFollowUpOptions,
    })
  )

  async function closeSheet() {
    await setParams({
      loanId: null,
      repaymentId: null,
      repaymentScheduleItemId: null,
      repaymentSheetType: null,
    })
  }

  async function refreshRepaymentData() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.repayments.schedule.infiniteQueryFilter()
      ),
      queryClient.invalidateQueries(
        trpc.repayments.history.infiniteQueryFilter()
      ),
      queryClient.invalidateQueries(trpc.repayments.summary.queryFilter()),
      queryClient.invalidateQueries(trpc.repayments.scheduleItem.queryFilter()),
      queryClient.invalidateQueries(trpc.repayments.repayment.queryFilter()),
      queryClient.invalidateQueries(trpc.loans.portfolio.infiniteQueryFilter()),
    ])
    await closeSheet()
    router.refresh()
  }

  const activeQueries = [
    shouldLoadSchedule ? scheduleQuery : null,
    shouldLoadRepayment ? repaymentQuery : null,
    shouldLoadPostOptions ? postOptions : null,
    shouldLoadFollowUpOptions ? followUpFilters : null,
  ]
  const failedQuery = activeQueries.find((query) => query?.isError)
  const selectedLoading =
    (shouldLoadPostOptions && postOptions.isFetching) ||
    activeQueries.some((query) => query?.isPending)
  const assignees = shouldLoadFollowUpOptions
    ? (followUpFilters.data
        ?.find((filter) => filter.value === "assignedToUserId")
        ?.options?.map(({ label, value }) => ({ id: value, label })) ?? [])
    : []

  return (
    <WorkflowPresentation
      className="[&_[data-slot=dialog-close]]:size-11! md:[&_[data-slot=dialog-close]]:size-8!"
      config={presentation}
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => !open && void closeSheet()}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="px-4 text-base text-muted-foreground md:px-6">
              Loading…
            </div>
          }
        >
          <RepaymentSheetHeader />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {selectedLoading ? (
              <p className="text-base text-muted-foreground">Loading…</p>
            ) : failedQuery ? (
              <div className="space-y-3 border-y border-border py-4">
                <p className="text-base text-muted-foreground">
                  This could not be loaded.
                </p>
                <Button
                  size="touch"
                  className="text-base"
                  onClick={() => void failedQuery.refetch()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <RepaymentContent
                assignees={assignees}
                canPostRepayment={canPostRepayment}
                defaultLoanId={loanId ?? scheduleQuery.data?.loan.id}
                devMode={devMode}
                loans={postOptions.data ?? []}
                onMutationSuccess={refreshRepaymentData}
                repayment={repaymentQuery.data ?? undefined}
                scheduleItem={scheduleQuery.data ?? undefined}
              />
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
