"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CheckCircle2Icon,
  LifeBuoyIcon,
  PlusIcon,
  ReceiptTextIcon,
} from "lucide-react"
import { usePaymentReceiptParams } from "@/hooks/use-payment-receipt-params"

function useOpenPaymentReceiptSheet() {
  const { setParams } = usePaymentReceiptParams()

  return (paymentReceiptSheetType: string, paymentReceiptId?: string | null) =>
    setParams({
      paymentReceiptId: paymentReceiptId ?? null,
      paymentReceiptSheetType,
    })
}

export function OpenPaymentReceiptCreateSheet() {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button onClick={() => openSheet("create")} type="button">
      <ReceiptTextIcon data-icon="inline-start" />
      Stage receipt
    </Button>
  )
}

export function OpenMemberPaymentReceiptCreateSheet() {
  const openSheet = useOpenPaymentReceiptSheet()

  return (
    <Button onClick={() => openSheet("member-create")} type="button">
      <PlusIcon data-icon="inline-start" />
      Submit receipt
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
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Review receipt
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
      size="sm"
      type="button"
      variant="outline"
    >
      <LifeBuoyIcon data-icon="inline-start" />
      Open support case
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
      size="sm"
      type="button"
      variant="outline"
    >
      <LifeBuoyIcon data-icon="inline-start" />
      Open support case
    </Button>
  )
}
