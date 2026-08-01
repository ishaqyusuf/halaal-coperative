"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import { MoreHorizontal } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { useBusinessParams } from "@/hooks/use-business-params"
import { BusinessMobileActionsDrawer } from "./actions-menu"
import {
  BusinessStatusBadge,
  getBusinessAllocatableProfit,
  getLatestBusinessProfitEntry,
  type Business,
} from "./columns"

export function BusinessMobileItem({
  business,
  isLocked,
  onSelectedChange,
  selected,
}: {
  business: Business
  isLocked: boolean
  onSelectedChange: (selected: boolean) => void
  selected: boolean
}) {
  const { setParams } = useBusinessParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const latest = getLatestBusinessProfitEntry(business)

  function viewBusiness() {
    void setParams({
      businessId: business.id,
      businessType: "details",
      profitEntryId: null,
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    viewBusiness()
  }

  return (
    <>
      <Item
        aria-label={`Open ${business.name}`}
        className="cursor-pointer gap-3 border-0 bg-transparent px-0 py-4 hover:bg-muted/50"
        onClick={viewBusiness}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <ItemHeader>
          <div
            className="flex size-11 shrink-0 items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              aria-label={`Select ${business.name}`}
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(checked === true)}
            />
          </div>

          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm">
              <span className="truncate">{business.name}</span>
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {business.startDate} to {business.endDate ?? "Ongoing"}
            </ItemDescription>
          </ItemContent>

          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${business.name}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>

        <ItemContent className="min-w-0 basis-full pl-14">
          <ItemDescription className="line-clamp-1">
            {business.notes ?? "No internal note"}
          </ItemDescription>
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
            <dt className="text-[11px] text-muted-foreground">Status</dt>
            <dd className="flex justify-end">
              <BusinessStatusBadge status={business.status} />
            </dd>

            <dt className="text-[11px] text-muted-foreground">Capital</dt>
            <dd className="text-right text-xs font-medium text-foreground">
              {formatCurrency(business.capitalAmount)}
            </dd>

            <dt className="text-[11px] text-muted-foreground">
              Allocatable profit
            </dt>
            <dd className="text-right text-xs font-medium text-foreground">
              {formatCurrency(getBusinessAllocatableProfit(business))}
            </dd>

            <dt className="text-[11px] text-muted-foreground">
              Latest profit
            </dt>
            <dd className="text-right text-xs text-foreground">
              {latest
                ? `${formatCurrency(latest.allocatableProfitAmount)} · ${latest.profitDate}`
                : "Not recorded"}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <BusinessMobileActionsDrawer
        business={business}
        isLocked={isLocked}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
      />
    </>
  )
}
