"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import {
  MemberDetailContent,
  type MemberDetailMember,
} from "@/components/member-detail-content"
import { MemberDetailSheetHeader } from "@/components/member-detail-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

type MemberDetailDocument = {
  id: string
  reviewNotes?: string | null
  reviewStatus: string
}

type ActiveCommitmentPlan = {
  amount: number | string
} | null

export function MemberDetailSheet({
  activePlan,
  canChangeWorkplace,
  commitmentStartsAtGoLive,
  devMode,
  documents,
  member,
}: {
  activePlan: ActiveCommitmentPlan
  canChangeWorkplace: boolean
  commitmentStartsAtGoLive: boolean
  devMode: boolean
  documents: MemberDetailDocument[]
  member: MemberDetailMember
}) {
  const router = useRouter()
  const { memberDetailSheetType, setParams } = useMemberDetailParams()
  const isOpen = Boolean(memberDetailSheetType)
  const presentation = getWorkflowPresentation(
    "memberDetail",
    memberDetailSheetType
  )

  function closeSheet() {
    void setParams({
      memberDetailDocumentId: null,
      memberDetailSheetType: null,
    })
  }

  function handleSuccess() {
    closeSheet()
    router.refresh()
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
            <div className="px-6 text-sm text-muted-foreground">Loading...</div>
          }
        >
          <MemberDetailSheetHeader
            commitmentStartsAtGoLive={commitmentStartsAtGoLive}
            presentation={
              presentation.presentation === "sheet" ? "sheet" : "dialog"
            }
          />
          <MemberDetailContent
            activePlan={activePlan}
            canChangeWorkplace={canChangeWorkplace}
            commitmentStartsAtGoLive={commitmentStartsAtGoLive}
            devMode={devMode}
            documents={documents}
            member={member}
            onSuccess={handleSuccess}
          />
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
