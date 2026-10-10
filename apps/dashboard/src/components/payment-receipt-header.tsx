"use client"

import type { ReactNode } from "react"
import {
  OpenMemberPaymentReceiptCreateSheet,
  OpenPaymentReceiptCreateSheet,
} from "@/components/open-payment-receipt-sheet"
import { PaymentReceiptColumnVisibility } from "@/components/payment-receipt-column-visibility"
import { PaymentReceiptMobileToolbar } from "@/components/payment-receipt-mobile-toolbar"
import { PaymentReceiptSearchFilter } from "@/components/payment-receipt-search-filter"

export function PaymentReceiptHeader({
  action,
  canCreateReceipt = true,
  mode = "staff",
}: {
  action?: ReactNode
  canCreateReceipt?: boolean
  mode?: "member" | "staff"
}) {
  return (
    <div className="border-y border-border bg-transparent py-3">
      <div className="hidden items-center justify-between gap-3 md:flex">
        <PaymentReceiptSearchFilter />
        <div className="flex items-center gap-2">
          <PaymentReceiptColumnVisibility />
          {action === undefined ? (
            canCreateReceipt ? (
              mode === "member" ? (
                <OpenMemberPaymentReceiptCreateSheet />
              ) : (
                <OpenPaymentReceiptCreateSheet />
              )
            ) : null
          ) : (
            action
          )}
        </div>
      </div>
      <PaymentReceiptMobileToolbar
        canCreateReceipt={canCreateReceipt}
        mode={mode}
      />
    </div>
  )
}
