"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import {
  MemberShareRequestForm,
  ShareRequestDetails,
  StaffShareRequestForm,
} from "@/components/share-request-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Every /shares overlay, URL-addressed by `shareApplicationSheetType`:
 * "member-create" and "create" are short dialogs; "details" is the request's
 * own sheet, where staff also approve or decline.
 */
export function ShareRequestSheet({
  canReview,
  remainingShares = 0,
  requestBlockedReason = null,
  unitAmount,
}: {
  canReview: boolean
  remainingShares?: number
  /** Why a member cannot ask now; shown instead of the form. */
  requestBlockedReason?: string | null
  unitAmount: number
}) {
  const trpc = useTRPC()
  const { setParams, shareApplicationId, shareApplicationSheetType } =
    useShareApplicationParams()
  const type =
    shareApplicationSheetType === "create" && !canReview
      ? null
      : shareApplicationSheetType === "member-create" && canReview
        ? null
        : shareApplicationSheetType
  const detailsId =
    type === "details" &&
    shareApplicationId &&
    uuidPattern.test(shareApplicationId)
      ? shareApplicationId
      : null
  const details = useQuery(
    trpc.shareApplications.get.queryOptions(
      { memberShareApplicationId: detailsId ?? "" },
      { enabled: Boolean(detailsId) }
    )
  )
  const close = () =>
    setParams({ shareApplicationId: null, shareApplicationSheetType: null })

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("shareApplication", type)}
      mobileFullScreen={type === "details"}
      open={Boolean(type)}
      onOpenChange={(open) => {
        if (!open) void close()
      }}
    >
      {type === "member-create" ? (
        <div className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Buy more shares
            </DialogTitle>
            <DialogDescription className="text-base">
              The office reviews every request.
            </DialogDescription>
          </DialogHeader>
          {requestBlockedReason ? (
            <p className="text-base">{requestBlockedReason}</p>
          ) : (
            <MemberShareRequestForm
              onClose={close}
              remainingShares={remainingShares}
              unitAmount={unitAmount}
            />
          )}
        </div>
      ) : null}
      {type === "create" ? (
        <div className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Add a share request
            </DialogTitle>
            <DialogDescription className="text-base">
              For a member who asked at the office.
            </DialogDescription>
          </DialogHeader>
          <StaffShareRequestForm onClose={close} unitAmount={unitAmount} />
        </div>
      ) : null}
      {type === "details" ? (
        <>
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">
              {canReview && details.data
                ? details.data.memberName
                : "Share request"}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6">
            {details.isPending && detailsId ? (
              <p className="text-base text-muted-foreground">Loading…</p>
            ) : details.isError ? (
              <div className="grid gap-3">
                <p className="text-base">This could not be loaded.</p>
                <Button
                  className="h-11 text-base"
                  onClick={() => void details.refetch()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : details.data ? (
              <ShareRequestDetails
                application={details.data}
                canReview={canReview}
                onClose={close}
              />
            ) : (
              <p className="text-base text-muted-foreground">
                This request could not be found.
              </p>
            )}
          </div>
        </>
      ) : null}
    </WorkflowPresentation>
  )
}
