"use client"

import {
  MemberCreateForm,
  type CreatedMemberSummary,
} from "@/components/forms/member-forms"
import { useMemberSheetFormContext } from "@/components/member/form-context"
import { MemberStatusConfirm } from "@/components/member-status-confirm"
import { useMemberParams } from "@/hooks/use-member-params"

export function MemberContent({
  onCreated,
  sheetType,
}: {
  onCreated: (member: CreatedMemberSummary) => void
  sheetType?: "create" | "import" | "status" | null
}) {
  const { memberSheetType } = useMemberParams()
  const context = useMemberSheetFormContext()
  const activeSheetType = sheetType ?? memberSheetType

  if (activeSheetType === "create") {
    return (
      <div className="px-4 pb-6 sm:px-6">
        <MemberCreateForm
          canManageCollectionSources={context.canManageCollectionSources}
          collectionSourceOptions={context.collectionSourceOptions}
          cooperativeStartDate={context.cooperativeStartDate}
          devMode={context.devMode}
          initialValues={context.initialValues}
          memberNumberPrefix={context.memberNumberPrefix}
          onSuccess={onCreated}
        />
      </div>
    )
  }

  if (activeSheetType === "status") {
    return <MemberStatusConfirm />
  }

  return null
}
