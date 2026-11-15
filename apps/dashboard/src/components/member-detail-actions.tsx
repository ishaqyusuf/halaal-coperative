"use client"

import { TenantLink as Link, useTenantRouter } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"
import { FileTextIcon, MoreHorizontalIcon, SparklesIcon } from "lucide-react"
import { useState } from "react"
import {
  askAssistant,
  memberHistoryDraft,
} from "@/components/quick-assistant/quick-assistant-requests"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"
import { useMemberParams } from "@/hooks/use-member-params"
import { getMemberStatusChangeCopy } from "@/lib/members/member-status-words"

const statusMoves = ["active", "suspended", "inactive"] as const

type MemberAction = {
  href?: string
  label: string
  onSelect?: () => void
}

/**
 * Member detail header: Statement stays visible; the rest sit under More (a
 * menu on wider screens, a bottom drawer on phones).
 */
export function MemberDetailActions({
  canManageMembers,
  memberId,
  memberNumber,
  status,
}: {
  canManageMembers: boolean
  memberId: string
  memberNumber: string
  status: string
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useTenantRouter()
  // Fills the assistant's composer only; the staff user sends it.
  const ask = () =>
    askAssistant(memberHistoryDraft(memberNumber), () =>
      router.push("/assistant")
    )
  const { setParams: setDetailParams } = useMemberDetailParams()
  const { setParams: setMemberParams } = useMemberParams()
  const statementHref = `/members/${memberId}/statement`

  const actions: MemberAction[] = [
    { label: "Ask assistant", onSelect: ask },
    {
      href: `/members/${memberId}/statement-export`,
      label: "Download statement",
    },
    ...(canManageMembers
      ? [
          {
            label: "Send sign-in email",
            onSelect: () =>
              void setDetailParams({
                memberDetailDocumentId: null,
                memberDetailSheetType: "portal-access",
              }),
          },
          ...statusMoves
            .filter((move) => move !== status)
            .map((move) => ({
              label: getMemberStatusChangeCopy(move).action,
              onSelect: () =>
                void setMemberParams({
                  memberSheetType: "status",
                  selectedMemberId: memberId,
                  selectedMemberStatus: move,
                }),
            })),
        ]
      : []),
  ]

  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <Link
        className={cn(
          buttonVariants({ variant: "outline" }),
          "flex-1 sm:flex-none"
        )}
        href={statementHref}
      >
        <FileTextIcon data-icon="inline-start" />
        Statement
      </Link>

      <Button
        className="hidden sm:inline-flex"
        onClick={ask}
        type="button"
        variant="outline"
      >
        <SparklesIcon data-icon="inline-start" />
        Ask assistant
      </Button>

      <div className="hidden sm:block">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <MoreHorizontalIcon data-icon="inline-start" />
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {actions.slice(1).map((action) =>
              action.href ? (
                <DropdownMenuItem
                  key={action.label}
                  render={<a href={action.href} />}
                >
                  {action.label}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={action.label} onClick={action.onSelect}>
                  {action.label}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button
        aria-label="More actions"
        className="size-12 shrink-0 sm:hidden"
        onClick={() => setDrawerOpen(true)}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <MoreHorizontalIcon />
      </Button>

      <MobileActionsDrawer
        onOpenChange={setDrawerOpen}
        open={drawerOpen}
        title="More actions"
      >
        <div className="flex flex-col gap-2">
          {actions.map((action) =>
            action.href ? (
              <a
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-12 w-full justify-start"
                )}
                href={action.href}
                key={action.label}
                onClick={() => setDrawerOpen(false)}
              >
                {action.label}
              </a>
            ) : (
              <Button
                className="h-12 w-full justify-start"
                key={action.label}
                onClick={() => {
                  setDrawerOpen(false)
                  action.onSelect?.()
                }}
                type="button"
                variant="ghost"
              >
                {action.label}
              </Button>
            )
          )}
        </div>
      </MobileActionsDrawer>
    </div>
  )
}
