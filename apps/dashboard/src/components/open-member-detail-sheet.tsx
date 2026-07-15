"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  FileCheck2Icon,
  FilePlus2Icon,
  IdCardIcon,
  KeyRoundIcon,
  WalletCardsIcon,
} from "lucide-react"
import {
  type MemberDetailSheetType,
  useMemberDetailParams,
} from "@/hooks/use-member-detail-params"

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
      Portal access
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
      New commitment
    </Button>
  )
}

export function OpenMemberDetailKycSheet() {
  const openSheet = useOpenMemberDetailSheet()

  return (
    <Button onClick={() => openSheet("kyc")} type="button" variant="outline">
      <IdCardIcon data-icon="inline-start" />
      Update KYC
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
      Attach document
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
      size="sm"
      type="button"
      variant="outline"
    >
      <FileCheck2Icon data-icon="inline-start" />
      Review document
    </Button>
  )
}
