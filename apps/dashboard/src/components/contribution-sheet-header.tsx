"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useContributionParams } from "@/hooks/use-contribution-params"

const sheetTitles = {
  editPlan: "Manage commitment plan",
  markBatchRowCollected: "Mark deduction row collected",
  markBatchRowException: "Mark deduction row exception",
  payment: "Record member payment",
  plan: "Set monthly commitment",
  postBatchRow: "Post deduction row",
  postBatchRows: "Post collected deduction rows",
  preference: "Payment preference",
  stageBatch: "Stage collection source batch",
} as const

export function ContributionSheetHeader() {
  const { contributionSheetType } = useContributionParams()
  const title = contributionSheetType
    ? sheetTitles[contributionSheetType]
    : "Contributions"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Manage member commitments, payment posting, collection source batches,
        and allocation preferences without leaving the contribution ledger.
      </SheetDescription>
    </SheetHeader>
  )
}
