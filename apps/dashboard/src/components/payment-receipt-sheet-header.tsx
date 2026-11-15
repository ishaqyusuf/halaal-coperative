import type { MemberPaymentReceiptRow } from "@halaalvest/db"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import type { ReactNode } from "react"
import type { PaymentReceiptSheetType } from "@/hooks/use-payment-receipt-params"

function getHeaderCopy({
  receipt,
  type,
}: {
  receipt?: MemberPaymentReceiptRow
  type: PaymentReceiptSheetType
}) {
  if (type === "review") {
    return {
      description: "Check the split, then approve or send back.",
      title: receipt
        ? `Review ${receipt.member.fullName}'s receipt`
        : "Review receipt",
    }
  }

  if (type === "support" || type === "member-support") {
    return {
      description:
        type === "support"
          ? "Start a support case about this receipt."
          : "Tell the cooperative what is wrong with this payment.",
      title: type === "support" ? "Receipt support" : "Get help",
    }
  }

  if (type === "member-create") {
    return {
      description: "Add your payment proof and say what it is for.",
      title: "Send a receipt",
    }
  }

  return {
    description: "Choose the member, add the proof and split the amount.",
    title: "Add receipt",
  }
}

export function PaymentReceiptSheetHeader({
  action,
  receipt,
  type,
}: {
  /** An extra header action, e.g. "Ask assistant" while reviewing. */
  action?: ReactNode
  receipt?: MemberPaymentReceiptRow
  type: PaymentReceiptSheetType
}) {
  const copy = getHeaderCopy({ receipt, type })

  // Receipt support is a compact dialog (ADR-20261105 PR4, PR5); the other
  // modes, review included, are sheets.
  if (type === "support" || type === "member-support") {
    return (
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
      {action ? <div className="pt-1">{action}</div> : null}
    </SheetHeader>
  )
}
