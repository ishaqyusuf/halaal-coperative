"use client"

import {
  MemberCommitmentForm,
  MemberDocumentForm,
  MemberDocumentReviewForm,
  MemberKycForm,
  MemberPortalAccessForm,
} from "@/components/forms/member-forms"
import { MemberEditContent } from "@/components/member-edit-content"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"

type MemberDetailDocument = {
  id: string
  reviewNotes?: string | null
  reviewStatus: string
}

export type MemberDetailMember = {
  address?: string | null
  deductionSourceId?: string | null
  email?: string | null
  fullName: string
  governmentIdNumber?: string | null
  id: string
  memberType: string
  occupation?: string | null
  phoneNumber?: string | null
  user?: { email: string | null } | null
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
  canChangeWorkplace,
  commitmentStartsAtGoLive = false,
  devMode,
  documents,
  member,
  onSuccess,
}: {
  activePlan: ActiveCommitmentPlan
  canChangeWorkplace: boolean
  commitmentStartsAtGoLive?: boolean
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

  if (memberDetailSheetType === "edit") {
    return (
      <div className="px-4 pb-6 sm:px-6">
        <MemberEditContent
          canChangeWorkplace={canChangeWorkplace}
          member={member}
          onSuccess={onSuccess}
        />
      </div>
    )
  }

  if (memberDetailSheetType === "portal-access") {
    return (
      <MemberPortalAccessForm
        email={member.user?.email ?? member.email}
        memberId={member.id}
        onSuccess={onSuccess}
      />
    )
  }

  if (memberDetailSheetType === "commitment") {
    return (
      <div>
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
          startsAtGoLive={commitmentStartsAtGoLive}
        />
      </div>
    )
  }

  if (memberDetailSheetType === "kyc") {
    return (
      <div className="px-4 pb-6 sm:px-6">
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
      <div className="px-4 pb-6 sm:px-6">
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
        <div className="text-sm text-muted-foreground">
          This document is no longer here.
        </div>
      )
    }

    return (
      <div>
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
    <div className="px-4 text-sm text-muted-foreground sm:px-6">
      Nothing to show.
    </div>
  )
}
