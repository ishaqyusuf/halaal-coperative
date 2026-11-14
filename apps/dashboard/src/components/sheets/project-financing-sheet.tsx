"use client"

import { Suspense } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import {
  ProjectFinancingDisbursementContent,
  ProjectFinancingRequestDetails,
  ProjectFinancingRequestForm,
} from "@/components/project-financing-content"
import { ProjectFinancingSheetHeader } from "@/components/project-financing-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

type ProjectFinancingSheetType =
  | "create"
  | "details"
  | "disbursement"
  | "review"
  | "self-service"

function isProjectFinancingSheetType(
  value: string | null
): value is ProjectFinancingSheetType {
  return (
    value === "create" ||
    value === "details" ||
    value === "disbursement" ||
    value === "review" ||
    value === "self-service"
  )
}

const disabledProjectFinancingRequestId = "00000000-0000-4000-8000-000000000000"
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * One URL-addressed sheet for project financing: new request, the request
 * itself (staff decide inside it; `review` is kept for older links) and the
 * payout dialog. Charges load inside the forms that show them.
 */
export function ProjectFinancingSheet({
  canReview = false,
}: {
  canReview?: boolean
}) {
  const trpc = useTRPC()
  const { projectFinancingRequestId, projectFinancingSheetType, setParams } =
    useProjectFinancingParams()
  const isOpen = isProjectFinancingSheetType(projectFinancingSheetType)
  const presentation = getWorkflowPresentation(
    "projectFinancing",
    projectFinancingSheetType
  )
  const shouldLoadSelectedRequest =
    isOpen &&
    Boolean(
      projectFinancingRequestId && uuidPattern.test(projectFinancingRequestId)
    ) &&
    projectFinancingSheetType !== "create" &&
    projectFinancingSheetType !== "self-service"
  const {
    data: selectedRequest,
    isError: isSelectedRequestError,
    isLoading: isSelectedRequestLoading,
    refetch: refetchSelectedRequest,
  } = useQuery(
    trpc.projectFinancing.get.queryOptions(
      {
        projectFinancingRequestId:
          projectFinancingRequestId ?? disabledProjectFinancingRequestId,
      },
      { enabled: shouldLoadSelectedRequest }
    )
  )

  const closeSheet = async () => {
    await setParams({
      projectFinancingRequestId: null,
      projectFinancingSheetType: null,
    })
  }

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
            <div className="px-4 text-sm text-muted-foreground md:px-6">
              Loading...
            </div>
          }
        >
          <ProjectFinancingSheetHeader
            request={selectedRequest ?? undefined}
            type={projectFinancingSheetType}
          />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {projectFinancingSheetType === "create" ? (
              <ProjectFinancingRequestForm onClose={closeSheet} />
            ) : projectFinancingSheetType === "self-service" ? (
              <ProjectFinancingRequestForm onClose={closeSheet} selfService />
            ) : shouldLoadSelectedRequest && isSelectedRequestLoading ? (
              <p className="text-base text-muted-foreground">Loading...</p>
            ) : shouldLoadSelectedRequest && isSelectedRequestError ? (
              <div className="grid gap-3">
                <p className="text-base">This request could not be loaded.</p>
                <Button
                  className="h-12 w-full sm:w-auto"
                  onClick={() => void refetchSelectedRequest()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : (projectFinancingSheetType === "details" ||
                projectFinancingSheetType === "review") &&
              selectedRequest ? (
              <ProjectFinancingRequestDetails
                canReview={canReview}
                onClose={closeSheet}
                request={selectedRequest}
              />
            ) : projectFinancingSheetType === "disbursement" &&
              selectedRequest &&
              canReview ? (
              <ProjectFinancingDisbursementContent
                onClose={closeSheet}
                request={selectedRequest}
              />
            ) : (
              <p className="text-base text-muted-foreground">
                This request could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
