"use client"

import { Suspense } from "react"
import type { ProjectFinancingRequestRow } from "@halaalvest/db"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import {
  MemberProjectFinancingRequestCreateContent,
  ProjectFinancingDisbursementContent,
  ProjectFinancingRequestCreateContent,
  ProjectFinancingReviewContent,
  type ProjectFinancingMemberOption,
} from "@/components/project-financing-content"
import { ProjectFinancingSheetHeader } from "@/components/project-financing-sheet-header"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { useTRPC } from "@/trpc/client"

type ProjectFinancingSheetType =
  | "create"
  | "disbursement"
  | "review"
  | "self-service"

function isProjectFinancingSheetType(
  value: string | null
): value is ProjectFinancingSheetType {
  return (
    value === "create" ||
    value === "disbursement" ||
    value === "review" ||
    value === "self-service"
  )
}

const disabledProjectFinancingRequestId =
  "00000000-0000-4000-8000-000000000000"

export function ProjectFinancingSheet({
  approvalChargeOptions = [],
  memberOptions = [],
  requests,
  selfServiceChargeOptions = [],
  submissionChargeOptions = [],
}: {
  approvalChargeOptions?: WorkflowChargeOption[]
  memberOptions?: ProjectFinancingMemberOption[]
  requests: ProjectFinancingRequestRow[]
  selfServiceChargeOptions?: WorkflowChargeOption[]
  submissionChargeOptions?: WorkflowChargeOption[]
}) {
  const trpc = useTRPC()
  const {
    projectFinancingRequestId,
    projectFinancingSheetType,
    setParams,
  } = useProjectFinancingParams()
  const isOpen = isProjectFinancingSheetType(projectFinancingSheetType)
  const selectedRouteRequest = requests.find(
    (request) => request.id === projectFinancingRequestId
  )
  const shouldLoadSelectedRequest =
    isOpen &&
    Boolean(projectFinancingRequestId) &&
    projectFinancingSheetType !== "create" &&
    projectFinancingSheetType !== "self-service"
  const { data: fetchedRequest, isLoading: isSelectedRequestLoading } =
    useQuery(
      trpc.projectFinancing.get.queryOptions(
        {
          projectFinancingRequestId:
            projectFinancingRequestId ?? disabledProjectFinancingRequestId,
        },
        { enabled: shouldLoadSelectedRequest }
      )
    )
  const selectedRequest = fetchedRequest ?? selectedRouteRequest

  const closeSheet = () => {
    void setParams({
      projectFinancingRequestId: null,
      projectFinancingSheetType: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading project financing form...
              </div>
            }
          >
            <ProjectFinancingSheetHeader
              request={selectedRequest}
              type={projectFinancingSheetType}
            />
            <div className="px-6">
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
              ) : projectFinancingSheetType === "review" && selectedRequest ? (
                <ProjectFinancingReviewContent
                  chargeOptions={approvalChargeOptions}
                  onClose={closeSheet}
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
      </SheetContent>
    </Sheet>
  )
}
