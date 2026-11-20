"use client"

import type {
  RepaymentHistoryRow,
  RepaymentLoanOption,
  RepaymentScheduleItemDetail,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { Button } from "@halaalvest/ui/components/button"
import {
  CollectionFollowUpForm,
  RepaymentPostForm,
} from "@/components/forms/repayment-forms"
import { LoanFacts, LoanStatusWord } from "@/components/loans/loan-status-word"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import { getInstallmentWord, getRepaymentWord } from "@/lib/loans/loan-words"
import type { RepaymentAssigneeOption } from "@/lib/repayments/load-repayments-page"
import { formatDayMonthYear } from "@/utils/format"

const followUpWords: Record<string, string> = {
  promise_to_pay: "They promised to pay",
  reminded: "Reminded them",
  settled: "Sorted out",
  unreachable: "Could not reach them",
}

export function RepaymentContent({
  assignees,
  canPostRepayment,
  defaultLoanId,
  devMode,
  loans,
  onMutationSuccess,
  repayment,
  scheduleItem,
}: {
  assignees: RepaymentAssigneeOption[]
  canPostRepayment: boolean
  defaultLoanId?: string
  devMode: boolean
  loans: RepaymentLoanOption[]
  onMutationSuccess: () => Promise<void>
  repayment?: RepaymentHistoryRow
  scheduleItem?: RepaymentScheduleItemDetail
}) {
  const { open, repaymentScheduleItemId, repaymentSheetType } =
    useRepaymentParams()

  if (repaymentSheetType === "post" && canPostRepayment) {
    return (
      <RepaymentPostForm
        defaultLoanId={defaultLoanId}
        devMode={devMode}
        loans={loans}
        onSuccess={onMutationSuccess}
      />
    )
  }

  if (repaymentSheetType === "followUp" && repaymentScheduleItemId) {
    return (
      <div className="grid gap-6">
        {scheduleItem ? <InstallmentHeadline item={scheduleItem} /> : null}
        <CollectionFollowUpForm
          assignees={assignees}
          onSuccess={onMutationSuccess}
          repaymentScheduleItemId={repaymentScheduleItemId}
        />
      </div>
    )
  }

  if (repaymentSheetType === "scheduleDetails" && scheduleItem) {
    return (
      <InstallmentDetails
        canPostRepayment={canPostRepayment}
        item={scheduleItem}
        onFollowUp={() =>
          void open({
            repaymentScheduleItemId: scheduleItem.id,
            repaymentSheetType: "followUp",
          })
        }
        onPost={() =>
          void open({ loanId: scheduleItem.loan.id, repaymentSheetType: "post" })
        }
      />
    )
  }

  if (repaymentSheetType === "repaymentDetails" && repayment) {
    return <ReceivedDetails repayment={repayment} />
  }

  return (
    <p className="border-y border-border py-6 text-base text-muted-foreground">
      This could not be found.
    </p>
  )
}

function InstallmentHeadline({ item }: { item: RepaymentScheduleItemDetail }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xl font-semibold text-foreground">
          {item.loan.member.fullName}
        </p>
        <p className="text-base text-muted-foreground">
          {formatCurrency(item.outstandingAmount)} due{" "}
          {formatDayMonthYear(item.dueAt)}
        </p>
      </div>
      <LoanStatusWord word={getInstallmentWord(item.status, item.isLate)} />
    </div>
  )
}

function InstallmentDetails({
  canPostRepayment,
  item,
  onFollowUp,
  onPost,
}: {
  canPostRepayment: boolean
  item: RepaymentScheduleItemDetail
  onFollowUp: () => void
  onPost: () => void
}) {
  return (
    <div className="grid gap-6">
      <InstallmentHeadline item={item} />

      <LoanFacts
        rows={[
          { label: "Due on", value: formatDayMonthYear(item.dueAt) ?? "—" },
          { label: "Amount due", value: formatCurrency(item.totalDue) },
          item.amountPaid > 0 && {
            label: "Paid so far",
            value: formatCurrency(item.amountPaid),
          },
          { label: "Still owed", value: formatCurrency(item.outstandingAmount) },
          { label: "Payment number", value: `${item.installmentNumber}` },
          { label: "Type of loan", value: item.loan.loanProduct.name },
        ]}
      />

      {canPostRepayment ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {item.outstandingAmount > 0 ? (
            <Button className="h-12 text-base" onClick={onPost} type="button">
              Record payment
            </Button>
          ) : null}
          {item.isLate ? (
            <Button
              className="h-12 text-base"
              onClick={onFollowUp}
              type="button"
              variant="outline"
            >
              Add a follow-up note
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold text-foreground">Follow-up notes</h3>
        {item.collectionFollowUps.length === 0 ? (
          <p className="text-base text-muted-foreground">No notes yet.</p>
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {item.collectionFollowUps.map((followUp) => (
              <li className="grid gap-1 py-3 text-base" key={followUp.id}>
                <p className="font-medium text-foreground">
                  {followUpWords[followUp.status] ?? "Followed up"}
                  {followUp.status === "promise_to_pay" &&
                  followUp.promiseToPayAt
                    ? ` by ${formatDayMonthYear(followUp.promiseToPayAt)}`
                    : ""}
                  {followUp.caseStage === "escalated" ? " · needs a senior" : ""}
                </p>
                <p className="text-foreground">{followUp.note}</p>
                <p className="text-muted-foreground">
                  {followUp.actorUser.fullName} ·{" "}
                  {formatDayMonthYear(followUp.createdAt)}
                  {followUp.nextActionAt
                    ? ` · check again ${formatDayMonthYear(followUp.nextActionAt)}`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function ReceivedDetails({ repayment }: { repayment: RepaymentHistoryRow }) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-semibold text-foreground">
          {repayment.member.fullName}
        </p>
        <LoanStatusWord word={getRepaymentWord(repayment.status)} />
      </div>
      <LoanFacts
        rows={[
          { label: "Amount", value: formatCurrency(repayment.amount) },
          {
            label: "Paid on",
            value: formatDayMonthYear(repayment.paidAt) ?? "—",
          },
          { label: "Reference", value: repayment.reference ?? "None" },
          { label: "Recorded by", value: repayment.receivedByUser.fullName },
          { label: "Type of loan", value: repayment.loan.loanProduct.name },
        ]}
      />
      <p className="text-base text-muted-foreground">
        A recorded payment cannot be edited. Ask an admin if it needs to be
        corrected.
      </p>
    </div>
  )
}
