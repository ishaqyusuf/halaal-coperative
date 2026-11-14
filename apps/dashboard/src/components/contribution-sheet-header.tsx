"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useContributionParams } from "@/hooks/use-contribution-params"

const sheetTitles = {
  editPlan: "Change monthly amount",
  markBatchRowCollected: "Mark as paid",
  markBatchRowException: "Hold for review",
  payment: "Record payment",
  plan: "Set monthly amount",
  postBatchRow: "Post this payment",
  postBatchRows: "Post paid members",
  preference: "Payment order",
  stageBatch: "New workplace batch",
} as const

const sheetDescriptions = {
  editPlan: "Update or end this member's monthly amount.",
  markBatchRowCollected: "Enter what the workplace paid for this member.",
  markBatchRowException: "This member is kept out of posting.",
  payment: "Split one payment across savings and loan.",
  plan: "How much this member pays each month.",
  postBatchRow: "Adds this payment to the member's savings.",
  postBatchRows: "Adds every paid member to their savings.",
  preference: "What an extra payment goes to first.",
  stageBatch: "Start one workplace's payments for a month.",
} as const

export function ContributionSheetHeader() {
  const { contributionSheetType } = useContributionParams()
  const title = contributionSheetType
    ? sheetTitles[contributionSheetType]
    : "Contributions"
  const description = contributionSheetType
    ? sheetDescriptions[contributionSheetType]
    : undefined

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      {description ? <SheetDescription>{description}</SheetDescription> : null}
    </SheetHeader>
  )
}
