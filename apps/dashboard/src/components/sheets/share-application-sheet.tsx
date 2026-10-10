"use client"

import { Suspense } from "react"
import type { MemberShareApplicationRow } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import {
  ShareApplicationCreateContent,
  MemberShareApplicationDetailsContent,
  ShareApplicationReviewContent,
  type ShareApplicationMemberOption,
} from "@/components/share-application-content"
import { ShareApplicationSheetHeader } from "@/components/share-application-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

function isShareApplicationSheetType(
  value: string | null
): value is "create" | "details" | "review" {
  return value === "create" || value === "details" || value === "review"
}

export function ShareApplicationSheet({
  memberOptions,
}: {
  applications: MemberShareApplicationRow[]
  memberOptions: ShareApplicationMemberOption[]
  remoteRows?: boolean
}) {
  const trpc = useTRPC()
  const { setParams, shareApplicationId, shareApplicationSheetType } =
    useShareApplicationParams()
  const isOpen = isShareApplicationSheetType(shareApplicationSheetType)
  const presentation = getWorkflowPresentation(
    "shareApplication",
    shareApplicationSheetType
  )
  const shouldLoadSelectedApplication =
    isOpen &&
    Boolean(shareApplicationId) &&
    shareApplicationSheetType !== "create"
  const {
    data: selectedApplication,
    isError: isSelectedApplicationError,
    isLoading: isSelectedApplicationLoading,
    refetch: refetchSelectedApplication,
  } = useQuery(
    trpc.shareApplications.get.queryOptions(
      {
        memberShareApplicationId:
          shareApplicationId ?? "00000000-0000-4000-8000-000000000000",
      },
      { enabled: shouldLoadSelectedApplication }
    )
  )

  const closeSheet = () => {
    return setParams({
      shareApplicationId: null,
      shareApplicationSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      className="[&_[data-slot=dialog-close]]:size-11! md:[&_[data-slot=dialog-close]]:size-8!"
      config={presentation}
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          void closeSheet()
        }
      }}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="px-6 text-sm text-muted-foreground">
              Loading share application...
            </div>
          }
        >
          <ShareApplicationSheetHeader mode={shareApplicationSheetType} />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {shareApplicationSheetType === "create" ? (
              <ShareApplicationCreateContent
                memberOptions={memberOptions}
                onClose={closeSheet}
              />
            ) : shouldLoadSelectedApplication &&
              isSelectedApplicationLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading share application...
              </p>
            ) : shouldLoadSelectedApplication && isSelectedApplicationError ? (
              <div className="space-y-3 border-y border-border py-4">
                <p className="text-sm text-muted-foreground">
                  Share application details could not be loaded.
                </p>
                <Button
                  className="h-11 md:h-9"
                  onClick={() => void refetchSelectedApplication()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : shareApplicationSheetType === "details" &&
              selectedApplication ? (
              <MemberShareApplicationDetailsContent
                application={selectedApplication}
              />
            ) : selectedApplication ? (
              <ShareApplicationReviewContent
                application={selectedApplication}
                onClose={closeSheet}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This share application could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
