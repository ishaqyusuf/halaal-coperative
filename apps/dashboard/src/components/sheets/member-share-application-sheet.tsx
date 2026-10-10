"use client"

import { Suspense } from "react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import { MemberShareApplicationSheetHeader } from "@/components/member-share-application-sheet-header"
import {
  MemberShareApplicationCreateContent,
  MemberShareApplicationDetailsContent,
} from "@/components/share-application-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const disabledShareApplicationId = "00000000-0000-4000-8000-000000000000"
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function MemberShareApplicationSheet({
  policy,
  remainingOptionalUnits,
  requestBlockedReason,
}: {
  policy: TenantSharePolicySettings
  remainingOptionalUnits: number
  requestBlockedReason: string | null
}) {
  const trpc = useTRPC()
  const { setParams, shareApplicationId, shareApplicationSheetType } =
    useShareApplicationParams()
  const isCreate =
    shareApplicationSheetType === "member-create" && !shareApplicationId
  const isDetails =
    shareApplicationSheetType === "details" &&
    Boolean(shareApplicationId && uuidPattern.test(shareApplicationId))
  const isOpen = isCreate || isDetails
  const {
    data: application,
    isError,
    isLoading,
    refetch,
  } = useQuery(
    trpc.shareApplications.get.queryOptions(
      {
        memberShareApplicationId:
          shareApplicationId ?? disabledShareApplicationId,
      },
      { enabled: isDetails }
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
      className="[&_[data-slot=sheet-close]]:size-11! md:[&_[data-slot=sheet-close]]:size-8!"
      config={getWorkflowPresentation(
        "memberShareApplication",
        isDetails ? "details" : "create"
      )}
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
              Loading share request...
            </div>
          }
        >
          <MemberShareApplicationSheetHeader
            application={application ?? undefined}
            mode={isDetails ? "details" : "create"}
          />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {isCreate && requestBlockedReason ? (
              <div
                className="border-y border-amber-200 bg-amber-50 py-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                role="alert"
              >
                {requestBlockedReason}
              </div>
            ) : isCreate ? (
              <MemberShareApplicationCreateContent
                onClose={closeSheet}
                policy={policy}
                remainingOptionalUnits={remainingOptionalUnits}
              />
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading share request...
              </p>
            ) : isError ? (
              <div className="space-y-3 border-y border-border py-4">
                <p className="text-sm text-muted-foreground">
                  Share request details could not be loaded.
                </p>
                <Button
                  className="h-11 md:h-9"
                  onClick={() => void refetch()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : application ? (
              <MemberShareApplicationDetailsContent application={application} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This share request could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
