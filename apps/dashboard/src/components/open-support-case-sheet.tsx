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

export function OpenSupportCaseCreateSheet({
  iconOnly = false,
}: {
  iconOnly?: boolean
}) {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button
      aria-label={iconOnly ? "Open support case" : undefined}
      className={iconOnly ? "size-11" : undefined}
      onClick={() => openSheet("create")}
      size={iconOnly ? "icon-lg" : "default"}
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      {iconOnly ? null : "Open case"}
    </Button>
  )
}

export function OpenMemberSupportCaseCreateSheet({
  iconOnly = false,
}: {
  iconOnly?: boolean
}) {
  const openSheet = useOpenSupportCaseSheet()

  return (
    <Button
      aria-label={iconOnly ? "Open support case" : undefined}
      className={iconOnly ? "size-11" : undefined}
      onClick={() => openSheet("member-create")}
      size={iconOnly ? "icon-lg" : "default"}
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      {iconOnly ? null : "Open case"}
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
