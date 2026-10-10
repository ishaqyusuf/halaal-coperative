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

const sheetDescriptions = {
  editPlan: "Update or close the member commitment without losing its history.",
  markBatchRowCollected: "Confirm the paid amount and record any variance from the expected deduction.",
  markBatchRowException: "Hold this deduction row for review without posting it to the ledger.",
  payment: "Allocate one payment across commitment savings, extra savings, and loan servicing.",
  plan: "Set a dated, member-specific monthly commitment that can change over time.",
  postBatchRow: "Post this collected deduction as audited member contribution evidence.",
  postBatchRows: "Post every selected collected row into the member contribution ledger.",
  preference: "Choose how an unsplit payment remainder is allocated for this member.",
  stageBatch: "Prepare one source and period for deduction review before ledger posting.",
} as const

export function ContributionSheetHeader() {
  const { contributionSheetType } = useContributionParams()
  const title = contributionSheetType
    ? sheetTitles[contributionSheetType]
    : "Contributions"
  const description = contributionSheetType
    ? sheetDescriptions[contributionSheetType]
    : "Manage member commitment and collection evidence."

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
  )
}
