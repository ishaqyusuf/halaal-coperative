"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"
import { MoreHorizontal } from "lucide-react"
import { memo } from "react"
import type { MembershipApprovalRow } from "./data-table"

export const MembershipApprovalActionsMenu = memo(
  ({ request }: { request: MembershipApprovalRow }) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="h-8 w-8 p-0" variant="ghost" />}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Open membership approval actions</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <Link
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "h-auto w-full justify-start px-2 py-1.5 text-sm font-normal"
          )}
          href={`/membership-approvals/${request.id}`}
        >
          Review request
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
)

MembershipApprovalActionsMenu.displayName = "MembershipApprovalActionsMenu"
