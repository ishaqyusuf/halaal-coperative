"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  MemberProcurementRequestCreateContent,
  ProcurementPurchaseContent,
  ProcurementRequestCreateContent,
  ProcurementRequestDetailsContent,
  ProcurementRequestReviewContent,
  type ProcurementMemberOption,
} from "@/components/procurement-request-content"
import { ProcurementRequestSheetHeader } from "@/components/procurement-request-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import { useProcurementParams } from "@/hooks/use-procurement-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

type ProcurementSheetType =
  | "create"
  | "details"
  | "purchase"
  | "review"
  | "self-service"

function isProcurementSheetType(
  value: string | null
): value is ProcurementSheetType {
  return (
    value === "create" ||
    value === "details" ||
    value === "purchase" ||
    value === "review" ||
    value === "self-service"
  )
}

const disabledProcurementRequestId = "00000000-0000-4000-8000-000000000000"

export function ProcurementRequestSheet({
  approvalChargeOptions = [],
  memberOptions = [],
  selfServiceChargeOptions = [],
  submissionChargeOptions = [],
}: {
  approvalChargeOptions?: WorkflowChargeOption[]
  memberOptions?: ProcurementMemberOption[]
  selfServiceChargeOptions?: WorkflowChargeOption[]
  submissionChargeOptions?: WorkflowChargeOption[]
}) {
  const trpc = useTRPC()
  const { procurementRequestId, procurementSheetType, setParams } =
    useProcurementParams()
  const isOpen = isProcurementSheetType(procurementSheetType)
  const presentation = getWorkflowPresentation(
    "procurement",
    procurementSheetType
  )
  const shouldLoadSelectedRequest =
    isOpen &&
    Boolean(
      procurementRequestId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        procurementRequestId
      )
    ) &&
    procurementSheetType !== "create" &&
    procurementSheetType !== "self-service"
  const { data: fetchedRequest, isLoading: isSelectedRequestLoading } =
    useQuery(
      trpc.procurement.get.queryOptions(
        {
          procurementRequestId:
            procurementRequestId ?? disabledProcurementRequestId,
        },
        { enabled: shouldLoadSelectedRequest }
      )
    )
  const selectedRequest = fetchedRequest ?? undefined

  const closeSheet = async () => {
    await setParams({
      procurementRequestId: null,
      procurementSheetType: null,
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
            <div className="px-6 text-sm text-muted-foreground">
              Loading procurement form...
            </div>
          }
        >
          <ProcurementRequestSheetHeader
            request={selectedRequest}
            type={procurementSheetType}
          />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {procurementSheetType === "create" ? (
              <ProcurementRequestCreateContent
                chargeOptions={submissionChargeOptions}
                memberOptions={memberOptions}
                onClose={closeSheet}
              />
            ) : procurementSheetType === "self-service" ? (
              <MemberProcurementRequestCreateContent
                chargeOptions={selfServiceChargeOptions}
                onClose={closeSheet}
              />
            ) : shouldLoadSelectedRequest && isSelectedRequestLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading procurement request...
              </p>
            ) : procurementSheetType === "review" && selectedRequest ? (
              <ProcurementRequestReviewContent
                chargeOptions={approvalChargeOptions}
                onClose={closeSheet}
                request={selectedRequest}
              />
            ) : procurementSheetType === "details" && selectedRequest ? (
              <ProcurementRequestDetailsContent request={selectedRequest} />
            ) : procurementSheetType === "purchase" && selectedRequest ? (
              <ProcurementPurchaseContent
                onClose={closeSheet}
                request={selectedRequest}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This procurement request could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
