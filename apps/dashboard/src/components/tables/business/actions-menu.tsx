"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"
import { MoreHorizontal } from "lucide-react"
import { memo } from "react"
import { useBusinessParams } from "@/hooks/use-business-params"
import type { Business } from "./columns"

function latestProfitEntry(business: Business) {
  return business.profitEntries[0] ?? null
}

export const BusinessActionsMenu = memo(
  ({ business, isLocked }: { business: Business; isLocked: boolean }) => {
    const { setParams } = useBusinessParams()
    const latest = latestProfitEntry(business)

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="h-8 w-8 p-0" variant="ghost" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open business actions</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={() =>
              setParams({
                businessId: business.id,
                businessType: "details",
                profitEntryId: null,
              })
            }
          >
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLocked}
            onClick={() =>
              setParams({
                businessId: business.id,
                businessType: "profit",
                profitEntryId: null,
              })
            }
          >
            Add profit entry
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLocked}
            onClick={() =>
              setParams({
                businessId: business.id,
                businessType: "edit",
                profitEntryId: null,
              })
            }
          >
            Edit business
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLocked || !latest?.id || latest.hasPublishedAllocations}
            onClick={() => {
              if (!latest?.id) {
                return
              }

              setParams({
                businessId: business.id,
                businessType: "editProfit",
                profitEntryId: latest.id,
              })
            }}
          >
            Edit latest profit
          </DropdownMenuItem>
          {latest?.id ? (
            <Link
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-auto w-full justify-start px-2 py-1.5 text-sm font-normal"
              )}
              href={`/settings/finance/business/profits/${latest.id}/migration`}
            >
              Open migration
            </Link>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

BusinessActionsMenu.displayName = "BusinessActionsMenu"
