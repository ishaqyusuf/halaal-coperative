"use client"

import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { RequestClosedNotice } from "@/components/requests/request-summary"
import { SupportCaseView } from "@/components/support/support-case-view"
import {
  MemberSupportCreateForm,
  StaffSupportCreateForm,
  type MemberSupportCaseInitialValues,
  type SupportCaseOption,
} from "@/components/support/support-create-form"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import type { SupportViewer } from "@/lib/support/support-words"
import { useTRPC } from "@/trpc/client"

type SupportSheetMode = "case" | "create" | "member-create"

/** Older links (update, reply, adjustment-review) all open the case sheet. */
const legacyCaseTypes = new Set([
  "adjustment-review",
  "member-reply",
  "reply",
  "update",
])

function getSupportSheetMode(type: string | null): SupportSheetMode | null {
  if (type === "create" || type === "member-create" || type === "case") {
    return type
  }

  return type && legacyCaseTypes.has(type) ? "case" : null
}

const bodyClassName =
  "px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6"

function SupportSheetHeader({
  description,
  title,
}: {
  description?: string
  title: string
}) {
  return (
    <SheetHeader>
      <SheetTitle className="text-2xl [overflow-wrap:anywhere]">
        {title}
      </SheetTitle>
      <SheetDescription className={description ? "text-base" : "sr-only"}>
        {description ?? title}
      </SheetDescription>
    </SheetHeader>
  )
}

function SupportCaseSheetBody({
  assignees,
  canReviewFinancialAdjustments,
  onClose,
  supportCaseId,
  viewer,
}: {
  assignees: SupportCaseOption[]
  canReviewFinancialAdjustments: boolean
  onClose: () => Promise<void>
  supportCaseId: string
  viewer: SupportViewer
}) {
  const trpc = useTRPC()
  const { data: supportCase } = useSuspenseQuery(
    trpc.support.get.queryOptions({ supportCaseId })
  )

  if (!supportCase) {
    return (
      <>
        <SupportSheetHeader title="Case not found" />
        <p className={`${bodyClassName} text-base text-muted-foreground`}>
          It may have been removed, or it belongs to someone else.
        </p>
      </>
    )
  }

  return (
    <>
      <SupportSheetHeader title={supportCase.subject} />
      <div className={bodyClassName}>
        <SupportCaseView
          assignees={assignees}
          canReviewFinancialAdjustments={canReviewFinancialAdjustments}
          onClose={onClose}
          supportCase={supportCase}
          viewer={viewer}
        />
      </div>
    </>
  )
}

/**
 * The /support sheet, addressed by `supportCaseSheetType` (+ `supportCaseId`):
 * `case` shows one case with its messages and reply box; `create` and
 * `member-create` start a new one.
 */
export function SupportCaseSheet({
  assignees = [],
  canCreateSupportCases = true,
  canReviewFinancialAdjustments = false,
  initialCase,
  viewer,
}: {
  assignees?: SupportCaseOption[]
  canCreateSupportCases?: boolean
  canReviewFinancialAdjustments?: boolean
  initialCase?: MemberSupportCaseInitialValues
  viewer: SupportViewer
}) {
  const { setParams, supportCaseId, supportCaseSheetType } =
    useSupportCaseParams()
  const mode = getSupportSheetMode(supportCaseSheetType)
  const presentation = getWorkflowPresentation("support", mode ?? "case")

  async function closeSheet() {
    await setParams({ supportCaseId: null, supportCaseSheetType: null })
  }

  function renderBody() {
    if (mode === "create" || mode === "member-create") {
      const memberForm = viewer === "member"

      return (
        <>
          <SupportSheetHeader
            description={
              memberForm ? "The cooperative office will answer here." : undefined
            }
            title={memberForm ? "Ask for help" : "New case"}
          />
          <div className={bodyClassName}>
            {!canCreateSupportCases ? (
              <RequestClosedNotice>
                New cases are turned off. Contact the cooperative office.
              </RequestClosedNotice>
            ) : memberForm ? (
              <MemberSupportCreateForm
                initialCase={initialCase}
                onClose={closeSheet}
              />
            ) : (
              <StaffSupportCreateForm assignees={assignees} onClose={closeSheet} />
            )}
          </div>
        </>
      )
    }

    if (!supportCaseId) {
      return <SupportSheetHeader title="Case not found" />
    }

    return (
      <Suspense
        fallback={
          <>
            <SupportSheetHeader title="Loading..." />
            <p className={`${bodyClassName} text-base text-muted-foreground`}>
              Loading the case...
            </p>
          </>
        }
      >
        <SupportCaseSheetBody
          assignees={assignees}
          canReviewFinancialAdjustments={canReviewFinancialAdjustments}
          onClose={closeSheet}
          supportCaseId={supportCaseId}
          viewer={viewer}
        />
      </Suspense>
    )
  }

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen
      onOpenChange={(open) => !open && void closeSheet()}
      open={mode !== null}
    >
      {mode !== null ? renderBody() : null}
    </WorkflowPresentation>
  )
}
