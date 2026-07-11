"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import type {
  FoodPurchaseApplicationRow,
  FoodPurchaseCycleRow,
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  WorkflowChargeSummary,
  type WorkflowChargeOption,
} from "@/components/workflow-charge-summary"
import {
  createFoodPurchaseCycleAction,
  recordFoodPurchaseAccountingAction,
  reviewFoodPurchaseAccountingAction,
  reviewFoodPurchaseApplicationAction,
  submitFoodPurchaseApplicationAction,
  submitOwnFoodPurchaseApplicationAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

type Option = {
  id: string
  label: string
}

type FoodPurchaseSummary = {
  approvedApplications: number
  openCycles: number
  pendingApplications: number
  reportedProfit: number
  submittedAccounting: number
  totalReleasedAmount: number
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMonth(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  })
}

function statusTone(status: string) {
  if (status.includes("approved") || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status.includes("rejected") || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function paymentEvidenceText(application: FoodPurchaseApplicationRow) {
  const approvedAmount = application.approvedAmount ?? 0

  if (approvedAmount <= 0) {
    return null
  }

  const outstandingAmount = Math.max(approvedAmount - application.paidAmount, 0)
  const base = `Paid ${formatCurrency(
    application.paidAmount
  )}, outstanding ${formatCurrency(outstandingAmount)}`

  return application.paidAt
    ? `${base} - settled ${formatDate(application.paidAt)}`
    : base
}

export function FoodPurchaseView({
  applications,
  approvalChargeOptions,
  canRecordAccounting,
  canReviewAccounting,
  canReleaseFunds,
  canReviewApplications,
  canSubmitApplications,
  cycles,
  memberOptions,
  submissionChargeOptions,
  summary,
}: {
  applications: FoodPurchaseApplicationRow[]
  approvalChargeOptions: WorkflowChargeOption[]
  canRecordAccounting: boolean
  canReviewAccounting: boolean
  canReleaseFunds: boolean
  canReviewApplications: boolean
  canSubmitApplications: boolean
  cycles: FoodPurchaseCycleRow[]
  memberOptions: Option[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: FoodPurchaseSummary
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [periodMonth, setPeriodMonth] = useState("")
  const [releasedAmount, setReleasedAmount] = useState("")
  const [releasedAt, setReleasedAt] = useState("")
  const [releaseNotes, setReleaseNotes] = useState("")
  const [cycleId, setCycleId] = useState("")
  const [memberId, setMemberId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const [approvedAmountById, setApprovedAmountById] = useState<
    Record<string, string>
  >({})
  const [approvedPaybackMonthsById, setApprovedPaybackMonthsById] = useState<
    Record<string, string>
  >({})
  const [reviewNotesById, setReviewNotesById] = useState<
    Record<string, string>
  >({})
  const [salesAmountByCycleId, setSalesAmountByCycleId] = useState<
    Record<string, string>
  >({})
  const [purchaseCostByCycleId, setPurchaseCostByCycleId] = useState<
    Record<string, string>
  >({})
  const [operatingExpenseByCycleId, setOperatingExpenseByCycleId] = useState<
    Record<string, string>
  >({})
  const [accountingNotesByCycleId, setAccountingNotesByCycleId] = useState<
    Record<string, string>
  >({})
  const [accountingReviewNotesByCycleId, setAccountingReviewNotesByCycleId] =
    useState<Record<string, string>>({})

  const memberSelectOptions = [
    { label: "Select member", value: "" },
    ...memberOptions.map((member) => ({
      label: member.label,
      value: member.id,
    })),
  ]
  const openCycleOptions = useMemo(
    () => [
      { label: "Select cycle", value: "" },
      ...cycles
        .filter((cycle) => cycle.status === "open")
        .map((cycle) => ({
          label: `${formatMonth(cycle.periodMonth)} - ${formatCurrency(
            cycle.releasedAmount
          )}`,
          value: cycle.id,
        })),
    ],
    [cycles]
  )

  function createCycle() {
    startTransition(async () => {
      try {
        await createFoodPurchaseCycleAction(
          objectToFormData({
            periodMonth,
            releasedAmount,
            releasedAt,
            releaseNotes,
          })
        )
        setPeriodMonth("")
        setReleasedAmount("")
        setReleasedAt("")
        setReleaseNotes("")
        showSuccess(
          "Foodstuff Purchase cycle saved",
          "Committee funds recorded."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save Foodstuff Purchase cycle",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function submitApplication() {
    startTransition(async () => {
      try {
        await submitFoodPurchaseApplicationAction(
          objectToFormData({
            cycleId,
            itemDescription,
            memberId,
            requestedAmount,
            requestedPaybackMonths,
            requestNotes,
          })
        )
        setCycleId("")
        setItemDescription("")
        setMemberId("")
        setRequestedAmount("")
        setRequestedPaybackMonths("1")
        setRequestNotes("")
        showSuccess(
          "Foodstuff Purchase application saved",
          "Request is pending."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save Foodstuff Purchase application",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function reviewApplication(
    application: FoodPurchaseApplicationRow,
    status: "approved" | "rejected" | "under_review"
  ) {
    startTransition(async () => {
      try {
        await reviewFoodPurchaseApplicationAction(
          objectToFormData({
            applicationId: application.id,
            approvedAmount: approvedAmountById[application.id] ?? "",
            approvedPaybackMonths:
              approvedPaybackMonthsById[application.id] ?? "",
            notes: reviewNotesById[application.id] ?? "",
            status,
          })
        )
        showSuccess(
          "Foodstuff Purchase review saved",
          `Application marked ${status.replace(/_/g, " ")}.`
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save Foodstuff Purchase review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function recordAccounting(cycle: FoodPurchaseCycleRow) {
    startTransition(async () => {
      try {
        await recordFoodPurchaseAccountingAction(
          objectToFormData({
            cycleId: cycle.id,
            notes: accountingNotesByCycleId[cycle.id] ?? "",
            operatingExpenseAmount: operatingExpenseByCycleId[cycle.id] ?? "",
            purchaseCostAmount: purchaseCostByCycleId[cycle.id] ?? "",
            salesAmount: salesAmountByCycleId[cycle.id] ?? "",
          })
        )
        showSuccess(
          "Foodstuff Purchase accounting saved",
          "Profit was recorded."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save Foodstuff Purchase accounting",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function reviewAccounting(
    cycle: FoodPurchaseCycleRow,
    decision: "approved" | "rejected"
  ) {
    startTransition(async () => {
      try {
        await reviewFoodPurchaseAccountingAction(
          objectToFormData({
            cycleId: cycle.id,
            decision,
            notes: accountingReviewNotesByCycleId[cycle.id] ?? "",
          })
        )
        showSuccess(
          "Foodstuff Purchase accounting reviewed",
          `Accounting ${decision}.`
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not review Foodstuff Purchase accounting",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryTile label="Open cycles" value={summary.openCycles} />
        <SummaryTile
          label="Pending applications"
          value={summary.pendingApplications}
        />
        <SummaryTile
          label="Approved applications"
          value={summary.approvedApplications}
        />
        <SummaryTile
          label="Released funds"
          value={formatCurrency(summary.totalReleasedAmount)}
        />
        <SummaryTile
          label="Accounting submitted"
          value={summary.submittedAccounting}
        />
        <SummaryTile
          label="Reported profit"
          value={formatCurrency(summary.reportedProfit)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {canReleaseFunds ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              Monthly fund release
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Cycle month">
                <Input
                  disabled={isPending}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  type="month"
                  value={periodMonth}
                />
              </Field>
              <Field label="Release date">
                <Input
                  disabled={isPending}
                  onChange={(event) => setReleasedAt(event.target.value)}
                  type="date"
                  value={releasedAt}
                />
              </Field>
              <Field label="Released amount">
                <Input
                  disabled={isPending}
                  inputMode="decimal"
                  onChange={(event) => setReleasedAmount(event.target.value)}
                  value={releasedAmount}
                />
              </Field>
              <Field className="sm:col-span-2" label="Notes">
                <Textarea
                  disabled={isPending}
                  onChange={(event) => setReleaseNotes(event.target.value)}
                  value={releaseNotes}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Button disabled={isPending} onClick={createCycle} type="button">
                Save cycle
              </Button>
            </div>
          </div>
        ) : null}

        {canSubmitApplications ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              Member application
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Cycle">
                <LabeledSelectInput
                  disabled={isPending}
                  onValueChange={setCycleId}
                  options={openCycleOptions}
                  value={cycleId}
                />
              </Field>
              <Field label="Member">
                <LabeledSelectInput
                  disabled={isPending}
                  onValueChange={setMemberId}
                  options={memberSelectOptions}
                  value={memberId}
                />
              </Field>
              <Field label="Requested amount">
                <Input
                  disabled={isPending}
                  inputMode="decimal"
                  onChange={(event) => setRequestedAmount(event.target.value)}
                  value={requestedAmount}
                />
              </Field>
              <Field label="Payback months">
                <Input
                  disabled={isPending}
                  inputMode="numeric"
                  min="1"
                  onChange={(event) =>
                    setRequestedPaybackMonths(event.target.value)
                  }
                  type="number"
                  value={requestedPaybackMonths}
                />
              </Field>
              <Field label="Item">
                <Input
                  disabled={isPending}
                  onChange={(event) => setItemDescription(event.target.value)}
                  value={itemDescription}
                />
              </Field>
              <Field className="sm:col-span-2" label="Notes">
                <Textarea
                  disabled={isPending}
                  onChange={(event) => setRequestNotes(event.target.value)}
                  value={requestNotes}
                />
              </Field>
              <div className="sm:col-span-2">
                <WorkflowChargeSummary
                  basisAmount={Number(requestedAmount) || 0}
                  charges={submissionChargeOptions}
                  title="Submission charges"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                disabled={isPending || openCycleOptions.length <= 1}
                onClick={submitApplication}
                type="button"
              >
                Save application
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Monthly cycles" />
        {cycles.length ? (
          cycles.map((cycle) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={cycle.id}
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {formatMonth(cycle.periodMonth)}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(
                        cycle.status
                      )}`}
                    >
                      {cycle.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Released {formatCurrency(cycle.releasedAmount)} on{" "}
                    {formatDate(cycle.releasedAt)} by{" "}
                    {cycle.releasedByUser.fullName}
                  </p>
                  {cycle.releaseNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {cycle.releaseNotes}
                    </p>
                  ) : null}
                  {cycle.profitAmount != null ? (
                    <p className="mt-2 text-sm text-foreground">
                      Sales {formatCurrency(cycle.salesAmount ?? 0)}, cost{" "}
                      {formatCurrency(cycle.purchaseCostAmount ?? 0)}, expenses{" "}
                      {formatCurrency(cycle.operatingExpenseAmount ?? 0)},
                      profit {formatCurrency(cycle.profitAmount)}
                    </p>
                  ) : null}
                  {cycle.accountingNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {cycle.accountingNotes}
                    </p>
                  ) : null}
                  {cycle.accountingSubmittedAt ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Accounting submitted by{" "}
                      {cycle.accountingSubmittedByUser?.fullName ?? "committee"}{" "}
                      on {formatDate(cycle.accountingSubmittedAt)}
                    </p>
                  ) : null}
                </div>

                {canRecordAccounting &&
                ["accounting_rejected", "open"].includes(cycle.status) ? (
                  <div className="w-full space-y-2 xl:w-[520px]">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        disabled={isPending}
                        inputMode="decimal"
                        onChange={(event) =>
                          setSalesAmountByCycleId((current) => ({
                            ...current,
                            [cycle.id]: event.target.value,
                          }))
                        }
                        placeholder="Sales"
                        value={salesAmountByCycleId[cycle.id] ?? ""}
                      />
                      <Input
                        disabled={isPending}
                        inputMode="decimal"
                        onChange={(event) =>
                          setPurchaseCostByCycleId((current) => ({
                            ...current,
                            [cycle.id]: event.target.value,
                          }))
                        }
                        placeholder="Cost"
                        value={purchaseCostByCycleId[cycle.id] ?? ""}
                      />
                      <Input
                        disabled={isPending}
                        inputMode="decimal"
                        onChange={(event) =>
                          setOperatingExpenseByCycleId((current) => ({
                            ...current,
                            [cycle.id]: event.target.value,
                          }))
                        }
                        placeholder="Expenses"
                        value={operatingExpenseByCycleId[cycle.id] ?? ""}
                      />
                    </div>
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        setAccountingNotesByCycleId((current) => ({
                          ...current,
                          [cycle.id]: event.target.value,
                        }))
                      }
                      placeholder="Accounting note"
                      value={accountingNotesByCycleId[cycle.id] ?? ""}
                    />
                    <Button
                      disabled={isPending}
                      onClick={() => recordAccounting(cycle)}
                      size="sm"
                      type="button"
                    >
                      Save accounting
                    </Button>
                  </div>
                ) : null}

                {canReviewAccounting &&
                cycle.status === "accounting_submitted" ? (
                  <div className="w-full space-y-2 xl:w-[420px]">
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        setAccountingReviewNotesByCycleId((current) => ({
                          ...current,
                          [cycle.id]: event.target.value,
                        }))
                      }
                      placeholder="Accounting review note"
                      value={accountingReviewNotesByCycleId[cycle.id] ?? ""}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isPending}
                        onClick={() => reviewAccounting(cycle, "approved")}
                        size="sm"
                        type="button"
                      >
                        Approve accounting
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() => reviewAccounting(cycle, "rejected")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Request correction
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            body="Monthly Foodstuff Purchase cycles will appear here."
            title="No Foodstuff Purchase cycles yet"
          />
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Applications" />
        {applications.length ? (
          applications.map((application) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={application.id}
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {application.member.fullName}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(
                        application.status
                      )}`}
                    >
                      {application.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMonth(application.cycle.periodMonth)} - requested{" "}
                    {formatCurrency(application.requestedAmount)} on{" "}
                    {formatDate(application.requestedAt)} over{" "}
                    {application.requestedPaybackMonths} month
                    {application.requestedPaybackMonths === 1 ? "" : "s"}
                  </p>
                  {application.itemDescription ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {application.itemDescription}
                    </p>
                  ) : null}
                  {application.requestNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {application.requestNotes}
                    </p>
                  ) : null}
                  {application.approvedAmount ? (
                    <p className="mt-2 text-sm text-foreground">
                      Approved {formatCurrency(application.approvedAmount)} over{" "}
                      {application.approvedPaybackMonths ??
                        application.requestedPaybackMonths}{" "}
                      month
                      {(application.approvedPaybackMonths ??
                        application.requestedPaybackMonths) === 1
                        ? ""
                        : "s"}
                    </p>
                  ) : null}
                  {paymentEvidenceText(application) ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {paymentEvidenceText(application)}
                    </p>
                  ) : null}
                  {application.reviewNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {application.reviewNotes}
                    </p>
                  ) : null}
                </div>

                {canReviewApplications &&
                application.cycle.status === "open" &&
                ["submitted", "under_review"].includes(application.status) ? (
                  <div className="w-full space-y-2 xl:w-[360px]">
                    <Input
                      disabled={isPending}
                      inputMode="decimal"
                      onChange={(event) =>
                        setApprovedAmountById((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder={`Amount ${application.requestedAmount}`}
                      value={approvedAmountById[application.id] ?? ""}
                    />
                    <Input
                      disabled={isPending}
                      inputMode="numeric"
                      min="1"
                      onChange={(event) =>
                        setApprovedPaybackMonthsById((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder={`Months ${application.requestedPaybackMonths}`}
                      type="number"
                      value={approvedPaybackMonthsById[application.id] ?? ""}
                    />
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        setReviewNotesById((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder="Review note"
                      value={reviewNotesById[application.id] ?? ""}
                    />
                    <WorkflowChargeSummary
                      basisAmount={
                        Number(approvedAmountById[application.id]) ||
                        application.requestedAmount
                      }
                      charges={approvalChargeOptions}
                      title="Approval charges"
                    />
                    <div className="flex flex-wrap gap-2">
                      {application.status === "submitted" ? (
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            reviewApplication(application, "under_review")
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Mark under review
                        </Button>
                      ) : null}
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          reviewApplication(application, "approved")
                        }
                        size="sm"
                        type="button"
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          reviewApplication(application, "rejected")
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            body="Member Foodstuff Purchase applications will appear here."
            title="No Foodstuff Purchase applications yet"
          />
        )}
      </section>
    </div>
  )
}

export function MemberFoodPurchaseView({
  applications,
  chargeOptions,
  cycles,
  member,
}: {
  applications: FoodPurchaseApplicationRow[]
  chargeOptions: WorkflowChargeOption[]
  cycles: FoodPurchaseCycleRow[]
  member: {
    fullName: string
    memberNumber: string
  }
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [cycleId, setCycleId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const openCycles = cycles.filter((cycle) => cycle.status === "open")
  const pendingApplications = applications.filter((application) =>
    ["submitted", "under_review"].includes(application.status)
  )
  const approvedApplications = applications.filter(
    (application) => application.status === "approved"
  )
  const openCycleOptions = useMemo(
    () => [
      { label: "Select cycle", value: "" },
      ...openCycles.map((cycle) => ({
        label: `${formatMonth(cycle.periodMonth)} - ${formatCurrency(
          cycle.releasedAmount
        )}`,
        value: cycle.id,
      })),
    ],
    [openCycles]
  )

  function submitApplication() {
    startTransition(async () => {
      try {
        await submitOwnFoodPurchaseApplicationAction(
          objectToFormData({
            cycleId,
            itemDescription,
            requestedAmount,
            requestedPaybackMonths,
            requestNotes,
          })
        )
        setCycleId("")
        setItemDescription("")
        setRequestedAmount("")
        setRequestedPaybackMonths("1")
        setRequestNotes("")
        showSuccess(
          "Foodstuff Purchase request sent",
          "Your request is pending."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not send request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Open cycles" value={openCycles.length} />
        <SummaryTile
          label="Pending requests"
          value={pendingApplications.length}
        />
        <SummaryTile
          label="Approved requests"
          value={approvedApplications.length}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Apply for Foodstuff Purchase
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Cycle">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={setCycleId}
              options={openCycleOptions}
              value={cycleId}
            />
          </Field>
          <Field label="Requested amount">
            <Input
              disabled={isPending}
              inputMode="decimal"
              onChange={(event) => setRequestedAmount(event.target.value)}
              value={requestedAmount}
            />
          </Field>
          <Field label="Payback months">
            <Input
              disabled={isPending}
              inputMode="numeric"
              min="1"
              onChange={(event) =>
                setRequestedPaybackMonths(event.target.value)
              }
              type="number"
              value={requestedPaybackMonths}
            />
          </Field>
          <Field label="Item">
            <Input
              disabled={isPending}
              onChange={(event) => setItemDescription(event.target.value)}
              value={itemDescription}
            />
          </Field>
          <Field className="sm:col-span-2" label="Notes">
            <Textarea
              disabled={isPending}
              onChange={(event) => setRequestNotes(event.target.value)}
              value={requestNotes}
            />
          </Field>
          <div className="sm:col-span-2">
            <WorkflowChargeSummary
              basisAmount={Number(requestedAmount) || 0}
              charges={chargeOptions}
              title="Applicable charges"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            disabled={isPending || openCycleOptions.length <= 1}
            onClick={submitApplication}
            type="button"
          >
            Send request
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title="My applications" />
        {applications.length ? (
          applications.map((application) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={application.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {application.itemDescription ??
                        "Foodstuff Purchase request"}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(
                        application.status
                      )}`}
                    >
                      {application.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMonth(application.cycle.periodMonth)} - requested{" "}
                    {formatCurrency(application.requestedAmount)} on{" "}
                    {formatDate(application.requestedAt)} over{" "}
                    {application.requestedPaybackMonths} month
                    {application.requestedPaybackMonths === 1 ? "" : "s"}
                  </p>
                  {application.requestNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {application.requestNotes}
                    </p>
                  ) : null}
                  {application.approvedAmount ? (
                    <p className="mt-2 text-sm text-foreground">
                      Approved {formatCurrency(application.approvedAmount)} over{" "}
                      {application.approvedPaybackMonths ??
                        application.requestedPaybackMonths}{" "}
                      month
                      {(application.approvedPaybackMonths ??
                        application.requestedPaybackMonths) === 1
                        ? ""
                        : "s"}
                    </p>
                  ) : null}
                  {paymentEvidenceText(application) ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {paymentEvidenceText(application)}
                    </p>
                  ) : null}
                  {application.reviewNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {application.reviewNotes}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            body="Foodstuff Purchase applications you submit will appear here."
            title="No Foodstuff Purchase applications yet"
          />
        )}
      </section>
    </div>
  )
}

function SummaryTile({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return <p className="text-sm font-medium text-foreground">{title}</p>
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

function Field({
  children,
  className = "",
  label,
}: {
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <label className={`space-y-1 text-sm ${className}`}>
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}
