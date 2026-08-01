"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  ArrowLeftIcon,
  DownloadIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PrinterIcon,
} from "lucide-react"
import { useState } from "react"
import { OpenMemberDetailPortalAccessSheet } from "@/components/open-member-detail-sheet"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"

export function MemberDetailActions({
  canManageMembers,
  memberId,
}: {
  canManageMembers: boolean
  memberId: string
}) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const { setParams } = useMemberDetailParams()
  const statementHref = `/members/${memberId}/statement`
  const exportHref = `/members/${memberId}/statement-export`

  function openPortalAccess() {
    setActionsOpen(false)
    void setParams({
      memberDetailDocumentId: null,
      memberDetailSheetType: "portal-access",
    })
  }

  return (
    <>
      <div className="hidden flex-wrap gap-2 sm:flex">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/members"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Member registry
        </Link>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={statementHref}
        >
          <PrinterIcon data-icon="inline-start" />
          Statement
        </Link>
        <a className={buttonVariants({ variant: "outline" })} href={exportHref}>
          <DownloadIcon data-icon="inline-start" />
          Download
        </a>
        {canManageMembers ? <OpenMemberDetailPortalAccessSheet /> : null}
      </div>

      <div className="flex w-full gap-2 sm:hidden">
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 min-w-0 flex-1"
          )}
          href="/members"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Member registry
        </Link>
        <Button
          aria-label="More member detail actions"
          className="size-11 shrink-0"
          onClick={() => setActionsOpen(true)}
          size="icon-lg"
          type="button"
          variant="outline"
        >
          <MoreHorizontalIcon />
        </Button>
      </div>

      <MobileActionsDrawer
        description="Open statements or manage this member's portal access."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Member actions"
      >
        <div className="space-y-2">
          <Link
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11 w-full justify-start"
            )}
            href={statementHref}
            onClick={() => setActionsOpen(false)}
          >
            <PrinterIcon data-icon="inline-start" />
            Open printable statement
          </Link>
          <a
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11 w-full justify-start"
            )}
            href={exportHref}
            onClick={() => setActionsOpen(false)}
          >
            <DownloadIcon data-icon="inline-start" />
            Download member statement
          </a>
          {canManageMembers ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={openPortalAccess}
              type="button"
              variant="ghost"
            >
              <KeyRoundIcon data-icon="inline-start" />
              Send portal access
            </Button>
          ) : null}
        </div>
      </MobileActionsDrawer>
    </>
  )
}
