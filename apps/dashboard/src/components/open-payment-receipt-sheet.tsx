"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  PlusIcon,
  ReceiptTextIcon,
} from "lucide-react"
import {
  type PaymentReceiptSheetType,
  usePaymentReceiptParams,
} from "@/hooks/use-payment-receipt-params"

function useOpenPaymentReceiptSheet() {
  const { setParams } = usePaymentReceiptParams()

  return (
    paymentReceiptSheetType: PaymentReceiptSheetType,
    paymentReceiptId?: string | null
  ) =>
    setParams({
      paymentReceiptId: paymentReceiptId ?? null,
      paymentReceiptSheetType,
    })
}

export function OpenPaymentReceiptCreateSheet({
  iconOnly = false,
}: {
  iconOnly?: boolean
}) {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button
      aria-label={iconOnly ? "Add receipt" : undefined}
      className={iconOnly ? "size-11" : undefined}
      onClick={() => openSheet("create")}
      size={iconOnly ? "icon-lg" : "default"}
      type="button"
    >
      {iconOnly ? <PlusIcon /> : <ReceiptTextIcon data-icon="inline-start" />}
      {iconOnly ? (
        <span className="sr-only">Add receipt</span>
      ) : (
        "Add receipt"
      )}
    </Button>
  )
}

export function OpenMemberPaymentReceiptCreateSheet({
  iconOnly = false,
}: {
  iconOnly?: boolean
}) {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button
      aria-label={iconOnly ? "Submit payment receipt" : undefined}
      className={iconOnly ? "size-11" : undefined}
      onClick={() => openSheet("member-create")}
      size={iconOnly ? "icon-lg" : "default"}
      type="button"
    >
      <PlusIcon data-icon={iconOnly ? undefined : "inline-start"} />
      {iconOnly ? (
        <span className="sr-only">Submit receipt</span>
      ) : (
        "Submit receipt"
      )}
    </Button>
  )
}

export function OpenPaymentReceiptReviewSheet({
  receiptId,
}: {
  receiptId: string
}) {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button
      onClick={() => openSheet("review", receiptId)}
      type="button"
    >
      Review
    </Button>
  )
}

export function OpenPaymentReceiptSupportSheet({
  receiptId,
}: {
  receiptId: string
}) {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button
      onClick={() => openSheet("support", receiptId)}
      type="button"
      variant="outline"
    >
      Support
    </Button>
  )
}

export function OpenMemberPaymentReceiptSupportSheet({
  receiptId,
}: {
  receiptId: string
}) {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button
      onClick={() => openSheet("member-support", receiptId)}
      type="button"
      variant="outline"
    >
      Get help
    </Button>
  )
}
