"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  FileCheck2Icon,
  FilePlus2Icon,
  IdCardIcon,
  KeyRoundIcon,
  PencilIcon,
  WalletCardsIcon,
} from "lucide-react"
import {
  type MemberDetailSheetType,
  useMemberDetailParams,
} from "@/hooks/use-member-detail-params"
import { useMemberParams } from "@/hooks/use-member-params"
import { getMemberStatusChangeCopy } from "@/lib/members/member-status-words"

function useOpenMemberDetailSheet() {
  const { setParams } = useMemberDetailParams()

  return (type: MemberDetailSheetType, documentId?: string | null) =>
    setParams({
      memberDetailDocumentId: documentId ?? null,
      memberDetailSheetType: type,
    })
}

export function OpenMemberDetailPortalAccessSheet() {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button
      onClick={() => openSheet("portal-access")}
      type="button"
      variant="outline"
    >
      <KeyRoundIcon data-icon="inline-start" />
      Send sign-in email
    </Button>
  )
}

export function OpenMemberDetailCommitmentSheet() {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button
      onClick={() => openSheet("commitment")}
      type="button"
      variant="outline"
    >
      <WalletCardsIcon data-icon="inline-start" />
      Change
    </Button>
  )
}

export function OpenMemberDetailKycSheet({
  label = "Update KYC",
}: {
  label?: string
}) {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button onClick={() => openSheet("kyc")} type="button" variant="outline">
      <IdCardIcon data-icon="inline-start" />
      {label}
    </Button>
  )
}

export function OpenMemberDetailEditSheet() {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button onClick={() => openSheet("edit")} type="button" variant="outline">
      <PencilIcon data-icon="inline-start" />
      Edit details
    </Button>
  )
}

/** Opens the status AlertDialog (`memberSheetType=status`). */
export function OpenMemberStatusDialog({
  memberId,
  status,
}: {
  memberId: string
  status: "active" | "inactive" | "suspended"
}) {
  const { setParams } = useMemberParams()

  return (
    <Button
      onClick={() =>
        setParams({
          memberSheetType: "status",
          selectedMemberId: memberId,
          selectedMemberStatus: status,
        })
      }
      type="button"
      variant="outline"
    >
      {getMemberStatusChangeCopy(status).action}
    </Button>
  )
}

export function OpenMemberDetailDocumentSheet() {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button
      onClick={() => openSheet("document")}
      type="button"
      variant="outline"
    >
      <FilePlus2Icon data-icon="inline-start" />
      Add document
    </Button>
  )
}

export function OpenMemberDetailDocumentReviewSheet({
  documentId,
}: {
  documentId: string
}) {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button
      onClick={() => openSheet("document-review", documentId)}
      type="button"
      variant="outline"
    >
      <FileCheck2Icon data-icon="inline-start" />
      Check
    </Button>
  )
}
