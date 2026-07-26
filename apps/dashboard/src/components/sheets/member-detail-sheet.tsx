"use client"

import { Suspense } from "react"
import { MemberDetailContent } from "@/components/member-detail-content"
import { MemberDetailSheetHeader } from "@/components/member-detail-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

type MemberDetailDocument = {
  id: string
  reviewNotes?: string | null
  reviewStatus: string
}

type MemberDetailMember = {
  governmentIdNumber?: string | null
  id: string
  joinedAt: Date | string
  kycDocumentType?: string | null
  kycDocumentUrl?: string | null
  kycReviewNotes?: string | null
  kycStatus: "not_started" | "pending" | "verified" | "rejected"
}

type ActiveCommitmentPlan = {
  amount: number | string
} | null

export function MemberDetailSheet({
  activePlan,
  devMode,
  documents,
  member,
}: {
  activePlan: ActiveCommitmentPlan
  devMode: boolean
  documents: MemberDetailDocument[]
  member: MemberDetailMember
}) {
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
                Loading member action...
              </div>
            }
          >
            <MemberDetailSheetHeader />
            <MemberDetailContent
              activePlan={activePlan}
              devMode={devMode}
              documents={documents}
              member={member}
            />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
