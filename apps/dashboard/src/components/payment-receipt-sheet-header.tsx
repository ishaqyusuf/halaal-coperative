import type { MemberPaymentReceiptRow } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type PaymentReceiptSheetType =
  | "create"
  | "member-create"
  | "member-support"
  | "review"
  | "support"

function getHeaderCopy({
  receipt,
  type,
}: {
  receipt?: MemberPaymentReceiptRow
  type: PaymentReceiptSheetType
}) {
  if (type === "review") {
    return {
      description:
        "Adjust allocation lines if needed, then choose the receipt decision.",
      title: receipt
        ? `Review ${receipt.member.fullName}'s receipt`
        : "Review payment receipt",
    }
  }

  if (type === "support" || type === "member-support") {
    return {
      description:
        type === "support"
          ? "Open a support case when the receipt needs a correction trail or member follow-up."
          : "Ask the cooperative team to review a payment mistake or receipt issue.",
      title: "Open receipt support case",
    }
  }

  if (type === "member-create") {
    return {
      description:
        "Upload payment proof and split the receipt into the right cooperative categories.",
      title: "Submit payment receipt",
    }
  }

  return {
    description:
      "Save receipt proof, select the member, and split the payment into allocation lines.",
    title: "Stage payment receipt",
  }
}

export function PaymentReceiptSheetHeader({
  receipt,
  type,
}: {
  receipt?: MemberPaymentReceiptRow
  type: PaymentReceiptSheetType
}) {
  const copy = getHeaderCopy({ receipt, type })

  return (
    <SheetHeader>
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
    </SheetHeader>
  )
}
