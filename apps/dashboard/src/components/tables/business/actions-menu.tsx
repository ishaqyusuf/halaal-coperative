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
import { memo, type ReactNode } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useBusinessParams } from "@/hooks/use-business-params"
import {
  getLatestBusinessProfitEntry,
  type Business,
} from "./columns"

export const BusinessActionsMenu = memo(
  ({ business, isLocked }: { business: Business; isLocked: boolean }) => {
    const { setParams } = useBusinessParams()
    const latest = getLatestBusinessProfitEntry(business)

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

function MobileActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      className="h-11 w-full justify-start"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  )
}

export function BusinessMobileActionsDrawer({
  business,
  isLocked,
  onOpenChange,
  open,
}: {
  business: Business
  isLocked: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { setParams } = useBusinessParams()
  const latest = getLatestBusinessProfitEntry(business)

  function openSheet(
    businessType: "details" | "profit" | "edit" | "editProfit",
    profitEntryId: string | null = null
  ) {
    onOpenChange(false)
    void setParams({
      businessId: business.id,
      businessType,
      profitEntryId,
    })
  }

  return (
    <MobileActionsDrawer
      description={`Choose an action for ${business.name}.`}
      onOpenChange={onOpenChange}
      open={open}
      title="Business actions"
    >
      <div className="space-y-2">
        <MobileActionButton onClick={() => openSheet("details")}>
          View details
        </MobileActionButton>
        <MobileActionButton
          disabled={isLocked}
          onClick={() => openSheet("profit")}
        >
          Add profit entry
        </MobileActionButton>
        <MobileActionButton
          disabled={isLocked}
          onClick={() => openSheet("edit")}
        >
          Edit business
        </MobileActionButton>
        <MobileActionButton
          disabled={
            isLocked || !latest?.id || latest.hasPublishedAllocations
          }
          onClick={() =>
            latest?.id ? openSheet("editProfit", latest.id) : undefined
          }
        >
          Edit latest profit
        </MobileActionButton>
        {latest?.id ? (
          <Link
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11 w-full justify-start"
            )}
            href={`/settings/finance/business/profits/${latest.id}/migration`}
            onClick={() => onOpenChange(false)}
          >
            Open migration
          </Link>
        ) : null}
      </div>
    </MobileActionsDrawer>
  )
}
