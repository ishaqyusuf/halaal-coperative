"use client"

import { Suspense } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import {
  MemberProjectFinancingRequestCreateContent,
  ProjectFinancingDisbursementContent,
  ProjectFinancingRequestCreateContent,
  ProjectFinancingRequestDetailsContent,
  ProjectFinancingReviewContent,
  type ProjectFinancingMemberOption,
} from "@/components/project-financing-content"
import { ProjectFinancingSheetHeader } from "@/components/project-financing-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
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

export function ProjectFinancingSheet({
  approvalChargeOptions = [],
  memberOptions = [],
  selfServiceChargeOptions = [],
  submissionChargeOptions = [],
}: {
  approvalChargeOptions?: WorkflowChargeOption[]
  memberOptions?: ProjectFinancingMemberOption[]
  selfServiceChargeOptions?: WorkflowChargeOption[]
  submissionChargeOptions?: WorkflowChargeOption[]
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
              Loading project financing form...
            </div>
          }
        >
          <ProjectFinancingSheetHeader
            request={selectedRequest ?? undefined}
            type={projectFinancingSheetType}
          />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {projectFinancingSheetType === "create" ? (
              <ProjectFinancingRequestCreateContent
                chargeOptions={submissionChargeOptions}
                memberOptions={memberOptions}
                onClose={closeSheet}
              />
            ) : projectFinancingSheetType === "self-service" ? (
              <MemberProjectFinancingRequestCreateContent
                chargeOptions={selfServiceChargeOptions}
                onClose={closeSheet}
              />
            ) : shouldLoadSelectedRequest && isSelectedRequestLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading project financing request...
              </p>
            ) : shouldLoadSelectedRequest && isSelectedRequestError ? (
              <div className="space-y-3 border-y border-border py-4">
                <p className="text-sm text-muted-foreground">
                  Project financing details could not be loaded.
                </p>
                <Button
                  className="h-11 md:h-9"
                  onClick={() => void refetchSelectedRequest()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : projectFinancingSheetType === "review" && selectedRequest ? (
              <ProjectFinancingReviewContent
                chargeOptions={approvalChargeOptions}
                onClose={closeSheet}
                request={selectedRequest}
              />
            ) : projectFinancingSheetType === "details" && selectedRequest ? (
              <ProjectFinancingRequestDetailsContent
                request={selectedRequest}
              />
            ) : projectFinancingSheetType === "disbursement" &&
              selectedRequest ? (
              <ProjectFinancingDisbursementContent
                onClose={closeSheet}
                request={selectedRequest}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This project financing request could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
