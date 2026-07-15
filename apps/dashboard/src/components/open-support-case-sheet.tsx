"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CheckCircle2Icon,
  MessageSquarePlusIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"

function useOpenSupportCaseSheet() {
  const { setParams } = useSupportCaseParams()

  return (supportCaseSheetType: string, supportCaseId?: string | null) =>
    setParams({
      supportCaseId: supportCaseId ?? null,
      supportCaseSheetType,
    })
}

export function OpenSupportCaseCreateSheet() {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button onClick={() => openSheet("create")} type="button">
      <PlusIcon data-icon="inline-start" />
      Open case
    </Button>
  )
}

export function OpenMemberSupportCaseCreateSheet() {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button onClick={() => openSheet("member-create")} type="button">
      <PlusIcon data-icon="inline-start" />
      Open case
    </Button>
  )
}

export function OpenSupportCaseUpdateSheet({
  supportCaseId,
}: {
  supportCaseId: string
}) {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button
      onClick={() => openSheet("update", supportCaseId)}
      size="sm"
      type="button"
      variant="outline"
    >
      <PencilIcon data-icon="inline-start" />
      Update case
    </Button>
  )
}

export function OpenSupportCaseAdjustmentReviewSheet({
  supportCaseId,
}: {
  supportCaseId: string
}) {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button
      onClick={() => openSheet("adjustment-review", supportCaseId)}
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Review adjustment
    </Button>
  )
}

export function OpenSupportCaseReplySheet({
  supportCaseId,
}: {
  supportCaseId: string
}) {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button
      onClick={() => openSheet("reply", supportCaseId)}
      size="sm"
      type="button"
      variant="outline"
    >
      <MessageSquarePlusIcon data-icon="inline-start" />
      Add reply
    </Button>
  )
}

export function OpenMemberSupportCaseReplySheet({
  supportCaseId,
}: {
  supportCaseId: string
}) {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button
      onClick={() => openSheet("member-reply", supportCaseId)}
      size="sm"
      type="button"
      variant="outline"
    >
      <MessageSquarePlusIcon data-icon="inline-start" />
      Add reply
    </Button>
  )
}
