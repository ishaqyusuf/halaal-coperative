"use client"

import type { ReactNode } from "react"
import { OpenPaymentReceiptCreateSheet } from "@/components/open-payment-receipt-sheet"
import { PaymentReceiptColumnVisibility } from "@/components/payment-receipt-column-visibility"
import { PaymentReceiptSearchFilter } from "@/components/payment-receipt-search-filter"

export function PaymentReceiptHeader({
  action,
  description = "Review staged transfer proofs, allocation intent, and support escalations.",
  title = "Payment receipts",
}: {
  action?: ReactNode
  description?: string
  title?: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <PaymentReceiptSearchFilter />
        <div className="flex items-center gap-2">
          <PaymentReceiptColumnVisibility />
          {action === undefined ? <OpenPaymentReceiptCreateSheet /> : action}
        </div>
      </div>
    </div>
  )
}
