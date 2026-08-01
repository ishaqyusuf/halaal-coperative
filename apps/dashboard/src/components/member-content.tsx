"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useNotifications } from "@halaalvest/notifications-react"
import { useQueryClient } from "@tanstack/react-query"
import { useTransition } from "react"
import {
  MemberCreateForm,
  type CreatedMemberSummary,
} from "@/components/forms/member-forms"
import { useMemberSheetFormContext } from "@/components/member/form-context"
import { useMemberParams } from "@/hooks/use-member-params"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"
import { useTRPC } from "@/trpc/client"

export function MemberContent({
  onCreated,
  sheetType,
}: {
  onCreated: (member: CreatedMemberSummary) => void
  sheetType?: "create" | "details" | "edit" | "import" | "status" | null
}) {
  const {
    memberSheetType,
    selectedMemberId,
    selectedMemberStatus,
    setParams,
  } = useMemberParams()
  const context = useMemberSheetFormContext()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const activeSheetType = sheetType ?? memberSheetType

  function updateStatus(formData: FormData) {
    startTransition(async () => {
      try {
        await updateMemberStatusAction(formData)
        await queryClient.invalidateQueries(
          trpc.members.list.infiniteQueryFilter()
        )
        showSuccess(
          "Member status updated",
          "The registry now shows the new status."
        )
        void setParams({
          memberSheetType: null,
          selectedMemberId: null,
          selectedMemberStatus: null,
        })
      } catch (error) {
        showError(
          "Could not update member status",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  if (activeSheetType === "create") {
    return (
      <div className="px-4 sm:px-6">
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
      <form action={updateStatus} className="grid gap-4 px-4 sm:px-6">
        <input name="memberId" type="hidden" value={selectedMemberId ?? ""} />
        <input name="status" type="hidden" value={selectedMemberStatus ?? ""} />
        <p className="text-sm text-muted-foreground">
          Update this member&apos;s status to{" "}
          {(selectedMemberStatus ?? "").replaceAll("_", " ") || "selected"}. The
          change is saved immediately when submitted.
        </p>
        <Button
          disabled={!selectedMemberId || !selectedMemberStatus || isPending}
          type="submit"
        >
          {isPending ? "Updating..." : "Update member status"}
        </Button>
      </form>
    )
  }

  return null
}
