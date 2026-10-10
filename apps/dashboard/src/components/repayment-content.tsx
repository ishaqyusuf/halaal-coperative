"use client"

import { useTransition } from "react"
import type {
  RepaymentHistoryRow,
  RepaymentScheduleItemDetail,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { toast } from "@halaalvest/ui/components/use-toast"
import {
  CollectionFollowUpForm,
  RepaymentPostForm,
} from "@/components/forms/finance-forms"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import type {
  RepaymentAssigneeOption,
  RepaymentLoanOption,
} from "@/lib/repayments/load-repayments-page"
import { refreshCollectionsStatusesAction } from "@/lib/dashboard-actions"

export function RepaymentContent({
  assignees,
  defaultLoanId,
  devMode,
  loans,
  onMutationSuccess,
  repayment,
  scheduleItem,
}: {
  assignees: RepaymentAssigneeOption[]
  defaultLoanId?: string
  devMode: boolean
  loans: RepaymentLoanOption[]
  onMutationSuccess: () => Promise<void>
  repayment?: RepaymentHistoryRow
  scheduleItem?: RepaymentScheduleItemDetail
}) {
  const {
    repaymentScheduleItemId,
    repaymentSheetType,
    setParams,
  } = useRepaymentParams()
  const [isRefreshing, startRefreshTransition] = useTransition()

  if (repaymentSheetType === "refresh") {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-6 text-muted-foreground">
          Reconcile the current repayment schedule and mark installments past
          their due date as overdue. This action is audited and does not post
          money.
        </p>
        <div className="border-t border-border pt-4">
          <Button
            className="h-11 w-full md:h-9 md:w-auto"
            disabled={isRefreshing}
            onClick={() =>
              startRefreshTransition(async () => {
                try {
                  await refreshCollectionsStatusesAction()
                  toast({
                    description: "The repayment servicing queues are up to date.",
                    title: "Collection statuses refreshed",
                  })
                  await onMutationSuccess()
                } catch (error) {
                  toast({
                    description:
                      error instanceof Error
                        ? error.message
                        : "Something went wrong.",
                    title: "Could not refresh statuses",
                    variant: "error",
                  })
                }
              })
            }
            type="button"
            variant="outline"
          >
            Refresh collection statuses
          </Button>
        </div>
      </div>
    )
  }

  if (repaymentSheetType === "post") {
    return (
      <RepaymentPostForm
        defaultLoanId={defaultLoanId}
        devMode={devMode}
        loans={loans}
        onSuccess={onMutationSuccess}
      />
    )
  }

  if (repaymentSheetType === "followUp") {
    if (!repaymentScheduleItemId || !scheduleItem) {
      return (
        <p className="text-sm text-muted-foreground">
          Select a repayment installment before adding follow-up.
        </p>
      )
    }

    return (
      <CollectionFollowUpForm
        assignees={assignees}
        onSuccess={onMutationSuccess}
        repaymentScheduleItemId={repaymentScheduleItemId}
      />
    )
  }

  if (repaymentSheetType === "scheduleDetails") {
    if (!scheduleItem) {
      return (
        <p className="text-sm text-muted-foreground">
          This repayment installment could not be found.
        </p>
      )
    }

    return (
      <RepaymentScheduleDetails
        onFollowUp={() =>
          void setParams({ repaymentSheetType: "followUp" })
        }
        onPost={() =>
          void setParams({
            loanId: scheduleItem.loan.id,
            repaymentScheduleItemId: null,
            repaymentSheetType: "post",
          })
        }
        scheduleItem={scheduleItem}
      />
    )
  }

  if (repaymentSheetType === "repaymentDetails") {
    return repayment ? (
      <RepaymentDetails repayment={repayment} />
    ) : (
      <p className="text-sm text-muted-foreground">
        This repayment could not be found.
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Select a repayment action to continue.
    </p>
  )
}

function RepaymentScheduleDetails({
  onFollowUp,
  onPost,
  scheduleItem,
}: {
  onFollowUp: () => void
  onPost: () => void
  scheduleItem: RepaymentScheduleItemDetail
}) {
  const latest = scheduleItem.latestCollectionFollowUp

  return (
    <div className="space-y-6">
      <section className="border-y border-border py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {scheduleItem.loan.member.fullName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {scheduleItem.loan.member.memberNumber} · {scheduleItem.loan.loanProduct.name}
            </p>
          </div>
          <RepaymentStatusBadge status={scheduleItem.status} />
        </div>
      </section>

      <section className="grid grid-cols-2 divide-x divide-y border-y border-border md:grid-cols-4 md:divide-y-0">
        <DetailMetric label="Installment" value={`#${scheduleItem.installmentNumber}`} />
        <DetailMetric label="Due" value={formatDate(scheduleItem.dueAt)} />
        <DetailMetric label="Total due" value={formatCurrency(scheduleItem.totalDue)} />
        <DetailMetric label="Outstanding" value={formatCurrency(scheduleItem.outstandingAmount)} />
      </section>

      <section className="space-y-3 border-y border-border py-4">
        <h3 className="text-sm font-semibold text-foreground">
          Latest collection activity
        </h3>
        {latest ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow label="Outcome" value={humanize(latest.status)} />
            <DetailRow label="Stage" value={humanize(latest.caseStage)} />
            <DetailRow
              label="Assigned to"
              value={latest.assignedToUser?.fullName ?? "Unassigned"}
            />
            <DetailRow
              label="Next action"
              value={latest.nextActionAt ? formatDate(latest.nextActionAt) : "Not set"}
            />
            <DetailRow label="Note" value={latest.note} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No collection follow-up has been recorded for this installment.
          </p>
        )}
      </section>

      <div className="grid gap-2 border-t border-border pt-4 sm:flex sm:justify-end">
        <Button className="h-11 sm:h-9" onClick={onFollowUp} type="button" variant="outline">
          Record follow-up
        </Button>
        {scheduleItem.outstandingAmount > 0 ? (
          <Button className="h-11 sm:h-9" onClick={onPost} type="button">
            Post repayment
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function RepaymentDetails({ repayment }: { repayment: RepaymentHistoryRow }) {
  return (
    <div className="space-y-6">
      <section className="border-y border-border py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {repayment.member.fullName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {repayment.member.memberNumber} · {repayment.loan.loanProduct.name}
            </p>
          </div>
          <RepaymentStatusBadge status={repayment.status} />
        </div>
      </section>

      <section className="grid grid-cols-2 divide-x divide-y border-y border-border md:grid-cols-4 md:divide-y-0">
        <DetailMetric label="Amount" value={formatCurrency(repayment.amount)} />
        <DetailMetric label="Paid" value={formatDate(repayment.paidAt)} />
        <DetailMetric label="Reference" value={repayment.reference ?? "Not provided"} />
        <DetailMetric label="Received by" value={repayment.receivedByUser.fullName} />
      </section>

      <p className="border-y border-border py-4 text-sm leading-6 text-muted-foreground">
        This is posted financial evidence. Corrections must use an audited
        reversal workflow; the record cannot be edited or deleted here.
      </p>
    </div>
  )
}

function RepaymentStatusBadge({ status }: { status: string }) {
  const className =
    status === "paid" || status === "posted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "overdue" || status === "reversed"
        ? "border-destructive/20 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground"

  return (
    <Badge className={className} variant="outline">
      {humanize(status)}
    </Badge>
  )
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  )
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function humanize(value: string) {
  return value.replace(/_/g, " ")
}
