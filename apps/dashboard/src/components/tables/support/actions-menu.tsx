"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import type { SupportCaseRow } from "@halaalvest/db"
import {
  CheckCircle2,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
} from "lucide-react"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"

export function SupportActionsMenu({
  canReviewFinancialAdjustments,
  mode,
  supportCase,
}: {
  canReviewFinancialAdjustments: boolean
  mode: "member" | "staff"
  supportCase: SupportCaseRow
}) {
  const { setParams } = useSupportCaseParams()

  function open(
    type: "adjustment-review" | "member-reply" | "reply" | "update"
  ) {
    void setParams({
      supportCaseId: supportCase.id,
      supportCaseSheetType: type,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for ${supportCase.subject}`}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {mode === "staff" ? (
          <DropdownMenuItem onClick={() => open("update")}>
            <Pencil />
            Update case
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => open("member-reply")}>
            <MessageSquarePlus />
            {supportCase.status === "closed"
              ? "View conversation"
              : "View and reply"}
          </DropdownMenuItem>
        )}
        {mode === "staff" && supportCase.status !== "closed" ? (
          <DropdownMenuItem onClick={() => open("reply")}>
            <MessageSquarePlus />
            Add reply
          </DropdownMenuItem>
        ) : null}
        {mode === "staff" &&
        supportCase.requiresFinancialAdjustment &&
        canReviewFinancialAdjustments ? (
          <DropdownMenuItem onClick={() => open("adjustment-review")}>
            <CheckCircle2 />
            Review adjustment
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
