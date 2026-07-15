"use client"

import { Suspense } from "react"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { MemberDetailContent } from "@/components/member-detail-content"
import { MemberDetailSheetHeader } from "@/components/member-detail-sheet-header"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"

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

  function closeSheet() {
    void setParams({
      memberDetailDocumentId: null,
      memberDetailSheetType: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
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
      </SheetContent>
    </Sheet>
  )
}
