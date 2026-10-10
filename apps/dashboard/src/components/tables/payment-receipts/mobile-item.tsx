"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import { CheckCircle2, LifeBuoy, MoreHorizontal } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { usePaymentReceiptParams } from "@/hooks/use-payment-receipt-params"
import {
  formatPaymentReceiptDate,
  type PaymentReceipt,
  PaymentReceiptStatusBadge,
} from "./columns"

export function PaymentReceiptMobileItem({
  mode,
  receipt,
}: {
  mode: "member" | "staff"
  receipt: PaymentReceipt
}) {
  const { setParams } = usePaymentReceiptParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const isFinal = receipt.status === "approved" || receipt.status === "rejected"

  function openSheet(type: "member-support" | "review" | "support") {
    setActionsOpen(false)
    void setParams({
      paymentReceiptId: receipt.id,
      paymentReceiptSheetType: type,
    })
  }

  function openReceipt() {
    openSheet(
      mode === "member" ? "member-support" : isFinal ? "support" : "review"
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    openReceipt()
  }

  return (
    <>
      <Item
        aria-label={`Open receipt for ${receipt.member.fullName}`}
        className="cursor-pointer gap-3 border-0 bg-transparent px-0 py-4 hover:bg-muted/50"
        onClick={openReceipt}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm">
              <span className="truncate">{receipt.member.fullName}</span>
            </ItemTitle>
            <ItemDescription className="truncate">
              {receipt.member.memberNumber} ·{" "}
              {formatCurrency(receipt.totalAmount)}
            </ItemDescription>
          </ItemContent>
          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${receipt.member.fullName}'s receipt`}
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

        <ItemContent className="min-w-0 basis-full">
          <PaymentReceiptStatusBadge status={receipt.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="truncate text-right">
              {formatPaymentReceiptDate(receipt.paidAt)}
            </dd>
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="truncate text-right">
              {receipt.paymentReference || "Not provided"}
            </dd>
            <dt className="text-muted-foreground">Allocations</dt>
            <dd className="text-right">{receipt.allocations.length}</dd>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="truncate text-right">
              {formatPaymentReceiptDate(receipt.submittedAt)}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description="Choose how to continue with this receipt."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Receipt actions"
      >
        <div className="space-y-2">
          {mode === "staff" && !isFinal ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openSheet("review")}
              variant="ghost"
            >
              <CheckCircle2 data-icon="inline-start" />
              Review receipt
            </Button>
          ) : null}
          <Button
            className="h-11 w-full justify-start"
            onClick={() =>
              openSheet(mode === "member" ? "member-support" : "support")
            }
            variant="ghost"
          >
            <LifeBuoy data-icon="inline-start" />
            Open support case
          </Button>
        </div>
      </MobileActionsDrawer>
    </>
  )
}
