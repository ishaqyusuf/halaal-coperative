"use client"

import { Suspense } from "react"
import type { MemberShareApplicationRow } from "@halaalvest/db"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import {
  ShareApplicationCreateContent,
  ShareApplicationReviewContent,
  type ShareApplicationMemberOption,
} from "@/components/share-application-content"
import { ShareApplicationSheetHeader } from "@/components/share-application-sheet-header"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { useTRPC } from "@/trpc/client"

function isShareApplicationSheetType(
  value: string | null
): value is "create" | "review" {
  return value === "create" || value === "review"
}

export function ShareApplicationSheet({
  applications,
  memberOptions,
  remoteRows = true,
}: {
  applications: MemberShareApplicationRow[]
  memberOptions: ShareApplicationMemberOption[]
  remoteRows?: boolean
}) {
  const trpc = useTRPC()
  const { setParams, shareApplicationId, shareApplicationSheetType } =
    useShareApplicationParams()
  const isOpen = isShareApplicationSheetType(shareApplicationSheetType)
  const selectedRouteApplication = applications.find(
    (application) => application.id === shareApplicationId
  )
  const shouldLoadSelectedApplication =
    remoteRows &&
    isOpen &&
    Boolean(shareApplicationId) &&
    shareApplicationSheetType === "review"
  const { data: fetchedApplication, isLoading: isSelectedApplicationLoading } =
    useQuery(
      trpc.shareApplications.get.queryOptions(
        {
          memberShareApplicationId:
            shareApplicationId ?? "00000000-0000-4000-8000-000000000000",
        },
        { enabled: shouldLoadSelectedApplication }
      )
    )
  const selectedApplication = fetchedApplication ?? selectedRouteApplication

  const closeSheet = () => {
    void setParams({
      shareApplicationId: null,
      shareApplicationSheetType: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="overflow-y-auto">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading share application...
              </div>
            }
          >
            <ShareApplicationSheetHeader mode={shareApplicationSheetType} />
            <div className="px-6">
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
      </SheetContent>
    </Sheet>
  )
}
