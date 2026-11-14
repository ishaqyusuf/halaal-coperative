"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useNotifications } from "@halaalvest/notifications-react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import { useMemberParams } from "@/hooks/use-member-params"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"
import {
  getMemberStatusChangeCopy,
  getMemberStatusLabel,
} from "@/lib/members/member-status-words"
import { useTRPC } from "@/trpc/client"

/**
 * Body of the member status AlertDialog (`memberSheetType=status`). The
 * registry and the member detail page both host it.
 */
export function MemberStatusConfirm() {
  const { selectedMemberId, selectedMemberStatus, setParams } =
    useMemberParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const copy = getMemberStatusChangeCopy(selectedMemberStatus)

  function updateStatus(formData: FormData) {
    startTransition(async () => {
      try {
        await updateMemberStatusAction(formData)
        await queryClient.invalidateQueries(
          trpc.members.list.infiniteQueryFilter()
        )
        showSuccess(
          "Status changed",
          `The member is now ${getMemberStatusLabel(selectedMemberStatus ?? "").toLowerCase()}.`
        )
        void setParams({
          memberSheetType: null,
          selectedMemberId: null,
          selectedMemberStatus: null,
        })
        router.refresh()
      } catch (error) {
        showError(
          "Could not change status",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <form action={updateStatus} className="grid gap-4">
      <input name="memberId" type="hidden" value={selectedMemberId ?? ""} />
      <input name="status" type="hidden" value={selectedMemberStatus ?? ""} />
      <WorkflowConfirmFooter disabled={isPending}>
        <Button
          disabled={!selectedMemberId || !selectedMemberStatus || isPending}
          type="submit"
          variant={
            selectedMemberStatus === "active" ? "default" : "destructive"
          }
        >
          {isPending ? "Saving..." : copy.action}
        </Button>
      </WorkflowConfirmFooter>
    </form>
  )
}
