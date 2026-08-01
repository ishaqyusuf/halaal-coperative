"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { OpenMemberStatusSheet } from "@/components/open-member-sheet"
import { useMemberParams } from "@/hooks/use-member-params"
import type { Member } from "./columns"

function useMemberRowActions(member: Member) {
  const router = useRouter()
  const { setParams } = useMemberParams()
  const viewDetails = useCallback(() => {
    router.push(`/members/${member.id}`)
  }, [member.id, router])
  const changeStatus = useCallback(
    (status: string) => {
      void setParams({
        memberSheetType: "status",
        selectedMemberId: member.id,
        selectedMemberStatus: status,
      })
    },
    [member.id, setParams]
  )

  return {
    changeStatus,
    viewDetails,
  }
}

export function MemberDesktopActions({
  canManageMembers,
  member,
}: {
  canManageMembers: boolean
  member: Member
}) {
  const { viewDetails } = useMemberRowActions(member)

  return (
    <div className="flex w-full items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="h-8 w-8 p-0" variant="ghost" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open member actions</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={viewDetails}>
            View details
          </DropdownMenuItem>

          {canManageMembers ? (
            <>
              {member.status !== "active" ? (
                <OpenMemberStatusSheet
                  label="Activate"
                  memberId={member.id}
                  status="active"
                />
              ) : null}
              {member.status !== "suspended" ? (
                <OpenMemberStatusSheet
                  label="Suspend"
                  memberId={member.id}
                  status="suspended"
                />
              ) : null}
              {member.status !== "inactive" ? (
                <OpenMemberStatusSheet
                  label="Mark inactive"
                  memberId={member.id}
                  status="inactive"
                />
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function MemberMobileActionsDrawer({
  canManageMembers,
  member,
  onOpenChange,
  open,
}: {
  canManageMembers: boolean
  member: Member
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { changeStatus, viewDetails } = useMemberRowActions(member)

  function runAction(action: () => void) {
    onOpenChange(false)
    action()
  }

  return (
    <MobileActionsDrawer
      description={member.memberNumber}
      onOpenChange={onOpenChange}
      open={open}
      title={member.fullName}
    >
      <div className="space-y-2">
        <Button
          className="h-11 w-full justify-start"
          onClick={() => runAction(viewDetails)}
          type="button"
          variant="ghost"
        >
          View details
        </Button>

        {canManageMembers && member.status !== "active" ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => runAction(() => changeStatus("active"))}
            type="button"
            variant="ghost"
          >
            Activate
          </Button>
        ) : null}
        {canManageMembers && member.status !== "suspended" ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => runAction(() => changeStatus("suspended"))}
            type="button"
            variant="ghost"
          >
            Suspend
          </Button>
        ) : null}
        {canManageMembers && member.status !== "inactive" ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => runAction(() => changeStatus("inactive"))}
            type="button"
            variant="ghost"
          >
            Mark inactive
          </Button>
        ) : null}
      </div>
    </MobileActionsDrawer>
  )
}
