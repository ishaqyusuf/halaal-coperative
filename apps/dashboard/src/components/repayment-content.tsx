"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CollectionFollowUpForm,
  RepaymentPostForm,
} from "@/components/forms/finance-forms"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import { refreshCollectionsStatusesAction } from "@/lib/dashboard-actions"

export function RepaymentContent({
  assignees,
  devMode,
  loans,
  scheduleItems,
}: {
  assignees: Array<{ id: string; label: string }>
  devMode: boolean
  loans: Array<any>
  scheduleItems: Array<any>
}) {
  const { repaymentScheduleItemId, repaymentSheetType } = useRepaymentParams()
  const loanOptions = loans
    .filter((loan) => ["disbursed", "active"].includes(loan.status))
    .map((loan) => ({
      id: loan.id,
      label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
    }))
  const scheduleItemOptions = scheduleItems
    .filter((item) =>
      ["pending", "due", "overdue", "partially_paid"].includes(item.status)
    )
    .map((item) => ({
      id: item.id,
      label: `${item.loan.member.fullName} · installment ${item.installmentNumber} · due ${item.dueAt.toISOString().slice(0, 10)}`,
    }))

  if (repaymentSheetType === "refresh") {
    return (
      <form
        action={refreshCollectionsStatusesAction}
        className="grid gap-4 px-6"
      >
        <p className="text-sm text-muted-foreground">
          Refresh overdue and collection case statuses from the current repayment
          schedule.
        </p>
        <Button type="submit" variant="outline">
          Refresh collections status
        </Button>
      </form>
    )
  }

  if (repaymentSheetType === "post") {
    return (
      <div className="px-6">
        <RepaymentPostForm
          devMode={devMode}
          loans={loanOptions}
          scheduleItems={scheduleItemOptions}
        />
      </div>
    )
  }

  if (repaymentSheetType === "followUp") {
    if (!repaymentScheduleItemId) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select a repayment schedule item before adding follow-up.
        </div>
      )
    }

    return (
      <div className="px-6">
        <CollectionFollowUpForm
          assignees={assignees}
          repaymentScheduleItemId={repaymentScheduleItemId}
        />
      </div>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a repayment action to continue.
    </div>
  )
}
