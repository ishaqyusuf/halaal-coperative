"use client"

import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
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

function SelectedSupportCaseContent({
  assignees,
  onClose,
  supportCaseId,
  type,
}: {
  assignees: SupportCaseOption[]
  onClose: () => void | Promise<void>
  supportCaseId: string
  type: Exclude<SupportCaseSheetType, "create" | "member-create">
}) {
  const trpc = useTRPC()
  const { data: supportCase } = useSuspenseQuery(
    trpc.support.get.queryOptions({ supportCaseId })
  )

  if (!supportCase) {
    return (
      <>
        <SupportCaseSheetHeader type={type} />
        <p className="px-4 text-sm text-muted-foreground md:px-6">
          This support case could not be found.
        </p>
      </>
    )
  }

  return (
    <>
      <SupportCaseSheetHeader supportCase={supportCase} type={type} />
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
        {type === "update" ? (
          <SupportCaseUpdateContent
            assignees={assignees}
            onClose={onClose}
            supportCase={supportCase}
          />
        ) : type === "adjustment-review" ? (
          <SupportCaseFinancialAdjustmentReviewContent
            onClose={onClose}
            supportCase={supportCase}
          />
        ) : type === "reply" ? (
          <SupportCaseReplyContent
            onClose={onClose}
            supportCase={supportCase}
          />
        ) : (
          <MemberSupportCaseReplyContent
            onClose={onClose}
            supportCase={supportCase}
          />
        )}
      </div>
    </>
  )
}

export function SupportCaseSheet({
  assignees = [],
  canCreateSupportCases = true,
  initialCase,
  memberOptions = [],
}: {
  assignees?: SupportCaseOption[]
  canCreateSupportCases?: boolean
  initialCase?: MemberSupportCaseInitialValues
  memberOptions?: SupportCaseOption[]
}) {
  const { setParams, supportCaseId, supportCaseSheetType } =
    useSupportCaseParams()
  const isOpen = isSupportCaseSheetType(supportCaseSheetType)
  const presentation = getWorkflowPresentation("support", supportCaseSheetType)

  async function closeSheet() {
    await setParams({ supportCaseId: null, supportCaseSheetType: null })
  }

  const isCreate =
    supportCaseSheetType === "create" ||
    supportCaseSheetType === "member-create"

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen
      onOpenChange={(open) => !open && void closeSheet()}
      open={isOpen}
    >
      {isOpen ? (
        isCreate ? (
          <>
            <SupportCaseSheetHeader type={supportCaseSheetType} />
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
              {!canCreateSupportCases ? (
                <p className="border-y border-border py-4 text-sm text-muted-foreground">
                  Opening new support cases is not enabled by this
                  cooperative&apos;s Operation Profile.
                </p>
              ) : supportCaseSheetType === "create" ? (
                <SupportCaseCreateContent
                  assignees={assignees}
                  memberOptions={memberOptions}
                  onClose={closeSheet}
                />
              ) : (
                <MemberSupportCaseCreateContent
                  initialCase={initialCase}
                  onClose={closeSheet}
                />
              )}
            </div>
          </>
        ) : supportCaseId ? (
          <Suspense
            fallback={
              <div className="px-4 text-sm text-muted-foreground md:px-6">
                Loading support case...
              </div>
            }
          >
            <SelectedSupportCaseContent
              assignees={assignees}
              onClose={closeSheet}
              supportCaseId={supportCaseId}
              type={supportCaseSheetType}
            />
          </Suspense>
        ) : (
          <>
            <SupportCaseSheetHeader type={supportCaseSheetType} />
            <p className="px-4 text-sm text-muted-foreground md:px-6">
              Select a support case to continue.
            </p>
          </>
        )
      ) : null}
    </WorkflowPresentation>
  )
}
