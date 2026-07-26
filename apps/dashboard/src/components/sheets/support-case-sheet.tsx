"use client"

import { Suspense } from "react"
import type { SupportCaseRow } from "@halaalvest/db"
import { useQuery } from "@tanstack/react-query"
import {
  MemberSupportCaseCreateContent,
  MemberSupportCaseReplyContent,
  SupportCaseCreateContent,
  SupportCaseFinancialAdjustmentReviewContent,
  SupportCaseReplyContent,
  SupportCaseUpdateContent,
  type MemberSupportCaseInitialValues,
  type SupportCaseOption,
} from "@/components/support-case-content"
import { SupportCaseSheetHeader } from "@/components/support-case-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

type SupportCaseSheetType =
  | "adjustment-review"
  | "create"
  | "member-create"
  | "member-reply"
  | "reply"
  | "update"

function isSupportCaseSheetType(
  value: string | null
): value is SupportCaseSheetType {
  return (
    value === "adjustment-review" ||
    value === "create" ||
    value === "member-create" ||
    value === "member-reply" ||
    value === "reply" ||
    value === "update"
  )
}

const disabledSupportCaseId = "00000000-0000-4000-8000-000000000000"

export function SupportCaseSheet({
  assignees = [],
  cases,
  initialCase,
  memberOptions = [],
}: {
  assignees?: SupportCaseOption[]
  cases: SupportCaseRow[]
  initialCase?: MemberSupportCaseInitialValues
  memberOptions?: SupportCaseOption[]
}) {
  const trpc = useTRPC()
  const {
    setParams,
    supportCaseId: selectedSupportCaseId,
    supportCaseSheetType,
  } = useSupportCaseParams()
  const isOpen = isSupportCaseSheetType(supportCaseSheetType)
  const presentation = getWorkflowPresentation("support", supportCaseSheetType)
  const selectedRouteCase = cases.find((supportCase) => {
    return supportCase.id === selectedSupportCaseId
  })
  const shouldLoadSelectedCase =
    isOpen &&
    Boolean(selectedSupportCaseId) &&
    supportCaseSheetType !== "create" &&
    supportCaseSheetType !== "member-create"
  const { data: fetchedCase, isLoading: isSelectedCaseLoading } = useQuery(
    trpc.support.get.queryOptions(
      { supportCaseId: selectedSupportCaseId ?? disabledSupportCaseId },
      { enabled: shouldLoadSelectedCase }
    )
  )
  const selectedCase = fetchedCase ?? selectedRouteCase

  const closeSheet = () => {
    void setParams({
      supportCaseId: null,
      supportCaseSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={(open) => !open && closeSheet()}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading support case...
              </div>
            }
          >
            <SupportCaseSheetHeader
              supportCase={selectedCase}
              type={supportCaseSheetType}
            />
            <div className="px-6">
              {supportCaseSheetType === "create" ? (
                <SupportCaseCreateContent
                  assignees={assignees}
                  memberOptions={memberOptions}
                  onClose={closeSheet}
                />
              ) : supportCaseSheetType === "member-create" ? (
                <MemberSupportCaseCreateContent
                  initialCase={initialCase}
                  onClose={closeSheet}
                />
              ) : shouldLoadSelectedCase && isSelectedCaseLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading support case...
                </p>
              ) : supportCaseSheetType === "update" && selectedCase ? (
                <SupportCaseUpdateContent
                  assignees={assignees}
                  onClose={closeSheet}
                  supportCase={selectedCase}
                />
              ) : supportCaseSheetType === "adjustment-review" &&
                selectedCase ? (
                <SupportCaseFinancialAdjustmentReviewContent
                  onClose={closeSheet}
                  supportCase={selectedCase}
                />
              ) : supportCaseSheetType === "reply" && selectedCase ? (
                <SupportCaseReplyContent
                  onClose={closeSheet}
                  supportCase={selectedCase}
                />
              ) : supportCaseSheetType === "member-reply" && selectedCase ? (
                <MemberSupportCaseReplyContent
                  onClose={closeSheet}
                  supportCase={selectedCase}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This support case could not be found.
                </p>
              )}
            </div>
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
