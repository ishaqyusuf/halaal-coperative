"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Search } from "lucide-react"
import { useState } from "react"
import {
  OpenMemberPaymentReceiptCreateSheet,
  OpenPaymentReceiptCreateSheet,
} from "@/components/open-payment-receipt-sheet"
import { PaymentReceiptFilterDrawer } from "@/components/payment-receipt-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import {
  clearedPaymentReceiptFilters,
  usePaymentReceiptFilterParams,
} from "@/hooks/use-payment-receipt-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function PaymentReceiptMobileToolbar({
  canCreateReceipt,
  mode,
}: {
  canCreateReceipt: boolean
  mode: "member" | "staff"
}) {
  const { filter, setFilter } = usePaymentReceiptFilterParams()
  const { params, setParams } = useSortParams()
  const [open, setOpen] = useState(false)
  const hasControls = Boolean(filter.q || filter.status || params.sort)

  return (
    <>
      <div className="space-y-3 md:hidden">
        <InputGroup className="h-11">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search payment receipts"
            onChange={(event) =>
              void setFilter({ q: event.target.value || null })
            }
            placeholder="Search receipts..."
            type="search"
            value={filter.q ?? ""}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Filter payment receipts"
              className="size-11"
              onClick={() => setOpen(true)}
              size="icon-sm"
            >
              <MiddayFilterIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex min-h-11 items-center justify-between gap-2">
          <div>
            {hasControls ? (
              <Button
                className="h-11"
                onClick={() =>
                  void Promise.all([
                    setFilter(clearedPaymentReceiptFilters),
                    setParams({ sort: null }),
                  ])
                }
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          {canCreateReceipt ? (
            mode === "member" ? (
              <OpenMemberPaymentReceiptCreateSheet iconOnly />
            ) : (
              <OpenPaymentReceiptCreateSheet iconOnly />
            )
          ) : null}
        </div>
      </div>
      {open ? (
        <PaymentReceiptFilterDrawer onOpenChange={setOpen} open={open} />
      ) : null}
    </>
  )
}
