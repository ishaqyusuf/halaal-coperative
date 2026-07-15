"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  MemberCreateForm,
  type CreatedMemberSummary,
} from "@/components/forms/member-forms"
import { useMemberSheetFormContext } from "@/components/member/form-context"
import { useMemberParams } from "@/hooks/use-member-params"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"

export function MemberContent({
  onCreated,
  sheetType,
}: {
  onCreated: (member: CreatedMemberSummary) => void
  sheetType?: "create" | "details" | "edit" | "import" | "status" | null
}) {
  const { memberSheetType, selectedMemberId, selectedMemberStatus } =
    useMemberParams()
  const context = useMemberSheetFormContext()
  const activeSheetType = sheetType ?? memberSheetType

  if (activeSheetType === "create") {
    return (
      <div className="px-6">
        <MemberCreateForm
          canManageCollectionSources={context.canManageCollectionSources}
          collectionSourceOptions={context.collectionSourceOptions}
          cooperativeStartDate={context.cooperativeStartDate}
          devMode={context.devMode}
          initialValues={context.initialValues}
          inSheet
          memberNumberPrefix={context.memberNumberPrefix}
          onSuccess={onCreated}
        />
      </div>
    )
  }

  if (activeSheetType === "status") {
    return (
      <form action={updateMemberStatusAction} className="grid gap-4 px-6">
        <input name="memberId" type="hidden" value={selectedMemberId ?? ""} />
        <input
          name="status"
          type="hidden"
          value={selectedMemberStatus ?? ""}
        />
        <p className="text-sm text-muted-foreground">
          Update this member&apos;s status to{" "}
          {(selectedMemberStatus ?? "").replaceAll("_", " ") || "selected"}.
          The change is saved immediately when submitted.
        </p>
        <Button
          disabled={!selectedMemberId || !selectedMemberStatus}
          type="submit"
        >
          Update member status
        </Button>
      </form>
    )
  }

  return null
}
