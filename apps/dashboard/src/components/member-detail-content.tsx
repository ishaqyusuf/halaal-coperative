"use client"

import {
  MemberCommitmentForm,
  MemberDocumentForm,
  MemberDocumentReviewForm,
  MemberKycForm,
  MemberPortalAccessForm,
} from "@/components/forms/member-forms"
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

function formatIsoDate(value: Date | string | null | undefined) {
  if (!value) return null
  if (typeof value === "string") return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

export function MemberDetailContent({
  activePlan,
  devMode,
  documents,
  member,
  onSuccess,
}: {
  activePlan: ActiveCommitmentPlan
  devMode: boolean
  documents: MemberDetailDocument[]
  member: MemberDetailMember
  onSuccess: () => void
}) {
  const { memberDetailDocumentId, memberDetailSheetType } =
    useMemberDetailParams()
  const selectedDocument = documents.find(
    (document) => document.id === memberDetailDocumentId
  )

  if (memberDetailSheetType === "portal-access") {
    return (
      <div className="px-6">
        <MemberPortalAccessForm memberId={member.id} onSuccess={onSuccess} />
      </div>
    )
  }

  if (memberDetailSheetType === "commitment") {
    return (
      <div className="px-6">
        <MemberCommitmentForm
          defaultAmount={
            activePlan ? String(Number(activePlan.amount)) : undefined
          }
          defaultStartDate={
            activePlan
              ? undefined
              : (formatIsoDate(member.joinedAt) ?? undefined)
          }
          memberId={member.id}
          onSuccess={onSuccess}
        />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Saving closes the existing active commitment from the selected
          effective date.
        </p>
      </div>
    )
  }

  if (memberDetailSheetType === "kyc") {
    return (
      <div className="px-6">
        <MemberKycForm
          defaultValues={{
            governmentIdNumber: member.governmentIdNumber ?? "",
            kycDocumentType: member.kycDocumentType ?? "",
            kycDocumentUrl: member.kycDocumentUrl ?? "",
            kycReviewNotes: member.kycReviewNotes ?? "",
            kycStatus: member.kycStatus,
            memberId: member.id,
          }}
          devMode={devMode}
          onSuccess={onSuccess}
        />
      </div>
    )
  }

  if (memberDetailSheetType === "document") {
    return (
      <div className="px-6">
        <MemberDocumentForm
          defaultMemberId={member.id}
          devMode={devMode}
          onSuccess={onSuccess}
        />
      </div>
    )
  }

  if (memberDetailSheetType === "document-review") {
    if (!selectedDocument) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select a document to review.
        </div>
      )
    }

    return (
      <div className="px-6">
        <MemberDocumentReviewForm
          defaultValues={{
            documentId: selectedDocument.id,
            reviewNotes: selectedDocument.reviewNotes ?? "",
            reviewStatus:
              (selectedDocument.reviewStatus as
                | "pending"
                | "verified"
                | "rejected") ?? "pending",
          }}
          onSuccess={onSuccess}
        />
      </div>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a member action to continue.
    </div>
  )
}
