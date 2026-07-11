"use client"

import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementRequestRow, ProcurementSummary } from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  WorkflowChargeSummary,
  type WorkflowChargeOption,
} from "@/components/workflow-charge-summary"
import {
  createOwnProcurementRequestAction,
  createProcurementRequestAction,
  recordProcurementPurchaseAction,
  reviewProcurementRequestAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

type Option = {
  id: string
  label: string
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusTone(status: ProcurementRequestRow["status"]) {
  if (status === "approved" || status === "purchased" || status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function getScheduleCounts(request: ProcurementRequestRow) {
  return request.repaymentScheduleItems.reduce(
    (summary, schedule) => {
      const outstanding = Math.max(0, schedule.amount - schedule.paidAmount)

      if (schedule.status === "due") {
        summary.due += 1
      }

      if (schedule.status === "overdue") {
        summary.overdue += 1
      }

      summary.outstanding += outstanding

      return summary
    },
    { due: 0, outstanding: 0, overdue: 0 }
  )
}

function ProcurementScheduleStatus({
  request,
}: {
  request: ProcurementRequestRow
}) {
  if (!request.repaymentScheduleItems.length) {
    return null
  }

  const counts = getScheduleCounts(request)

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      {counts.overdue > 0 ? (
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
          {counts.overdue} overdue
        </span>
      ) : null}
      {counts.due > 0 ? (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
          {counts.due} due
        </span>
      ) : null}
      <span className="rounded-full border border-border px-2 py-0.5 font-medium text-muted-foreground">
        {formatCurrency(counts.outstanding)} outstanding
      </span>
    </div>
  )
}

export function ProcurementRequestsView({
  approvalChargeOptions,
  canReview,
  memberOptions,
  requests,
  submissionChargeOptions,
  summary,
}: {
  approvalChargeOptions: WorkflowChargeOption[]
  canReview: boolean
  memberOptions: Option[]
  requests: ProcurementRequestRow[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: ProcurementSummary
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")
  const [approvedCostById, setApprovedCostById] = useState<
    Record<string, string>
  >({})
  const [approvedMonthsById, setApprovedMonthsById] = useState<
    Record<string, string>
  >({})
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [purchaseDateById, setPurchaseDateById] = useState<
    Record<string, string>
  >({})
  const [firstDueDateById, setFirstDueDateById] = useState<
    Record<string, string>
  >({})
  const [purchaseReferenceById, setPurchaseReferenceById] = useState<
    Record<string, string>
  >({})
  const [purchaseNotesById, setPurchaseNotesById] = useState<
    Record<string, string>
  >({})
  const memberSelectOptions = [
    { label: "Select member", value: "" },
    ...memberOptions.map((member) => ({
      label: member.label,
      value: member.id,
    })),
  ]

  function submitRequest() {
    startTransition(async () => {
      try {
        await createProcurementRequestAction(
          objectToFormData({
            itemDescription,
            itemName,
            memberId,
            requestedCost,
            requestedRepaymentMonths,
            vendorName,
          })
        )
        setItemDescription("")
        setItemName("")
        setMemberId("")
        setRequestedCost("")
        setRequestedRepaymentMonths("")
        setVendorName("")
        showSuccess("Procurement request saved", "Request is pending review.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not save procurement request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function reviewRequest(
    request: ProcurementRequestRow,
    status: "approved" | "rejected" | "under_review"
  ) {
    startTransition(async () => {
      try {
        await reviewProcurementRequestAction(
          objectToFormData({
            approvedCost: approvedCostById[request.id] ?? "",
            approvedRepaymentMonths: approvedMonthsById[request.id] ?? "",
            notes: notesById[request.id] ?? "",
            procurementRequestId: request.id,
            status,
          })
        )
        showSuccess(
          "Procurement review saved",
          `Request marked ${status.replace(/_/g, " ")}.`
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save procurement review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function recordPurchase(request: ProcurementRequestRow) {
    startTransition(async () => {
      try {
        await recordProcurementPurchaseAction(
          objectToFormData({
            firstDueDate: firstDueDateById[request.id] ?? "",
            procurementRequestId: request.id,
            purchaseDate: purchaseDateById[request.id] ?? "",
            purchaseNotes: purchaseNotesById[request.id] ?? "",
            purchaseReference: purchaseReferenceById[request.id] ?? "",
          })
        )
        showSuccess(
          "Procurement purchase recorded",
          "Repayment schedule is now active."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not record procurement purchase",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryTile label="Pending" value={summary.pendingRequests} />
        <SummaryTile label="Approved" value={summary.approvedRequests} />
        <SummaryTile label="Active" value={summary.activeRequests} />
        <SummaryTile label="Due" value={summary.dueScheduleItems} />
        <SummaryTile label="Overdue" value={summary.overdueScheduleItems} />
        <SummaryTile
          label="Outstanding"
          value={formatCurrency(summary.outstandingAmount)}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              New procurement request
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Capture the item, expected cost, and repayment months before
              finance review.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Member">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={setMemberId}
              options={memberSelectOptions}
              value={memberId}
            />
          </Field>
          <Field label="Item">
            <Input
              disabled={isPending}
              onChange={(event) => setItemName(event.target.value)}
              value={itemName}
            />
          </Field>
          <Field label="Vendor">
            <Input
              disabled={isPending}
              onChange={(event) => setVendorName(event.target.value)}
              value={vendorName}
            />
          </Field>
          <Field label="Requested cost">
            <Input
              disabled={isPending}
              inputMode="decimal"
              onChange={(event) => setRequestedCost(event.target.value)}
              value={requestedCost}
            />
          </Field>
          <Field label="Repayment months">
            <Input
              disabled={isPending}
              inputMode="numeric"
              onChange={(event) =>
                setRequestedRepaymentMonths(event.target.value)
              }
              value={requestedRepaymentMonths}
            />
          </Field>
          <Field className="md:col-span-2 xl:col-span-3" label="Description">
            <Textarea
              disabled={isPending}
              onChange={(event) => setItemDescription(event.target.value)}
              value={itemDescription}
            />
          </Field>
          <div className="md:col-span-2 xl:col-span-4">
            <WorkflowChargeSummary
              basisAmount={Number(requestedCost) || 0}
              charges={submissionChargeOptions}
              title="Submission charges"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button disabled={isPending} onClick={submitRequest} type="button">
            Save request
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {requests.length ? (
          requests.map((request) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={request.id}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {request.itemName}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(request.status)}`}
                    >
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.member.fullName} · requested{" "}
                    {formatCurrency(request.requestedCost)} over{" "}
                    {request.requestedRepaymentMonths} months ·{" "}
                    {formatCurrency(request.estimatedMonthlyRepayment)} monthly
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {formatDate(request.requestedAt)} by{" "}
                    {request.createdByUser.fullName}
                    {request.vendorName ? ` · ${request.vendorName}` : ""}
                  </p>
                  {request.itemDescription ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {request.itemDescription}
                    </p>
                  ) : null}
                  {request.approvedCost ? (
                    <p className="mt-2 text-sm text-foreground">
                      Approved {formatCurrency(request.approvedCost)} over{" "}
                      {request.approvedRepaymentMonths} months ·{" "}
                      {formatCurrency(request.approvedMonthlyRepayment ?? 0)}{" "}
                      monthly
                    </p>
                  ) : null}
                  {request.purchasedAt ? (
                    <p className="mt-2 text-sm text-foreground">
                      Purchased {formatDate(request.purchasedAt)} · outstanding{" "}
                      {formatCurrency(request.outstandingAmount)}
                    </p>
                  ) : null}
                  <ProcurementScheduleStatus request={request} />
                  {request.reviewNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {request.reviewNotes}
                    </p>
                  ) : null}
                </div>

                {canReview &&
                ["submitted", "under_review"].includes(request.status) ? (
                  <div className="w-full space-y-2 md:w-[360px]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        disabled={isPending}
                        inputMode="decimal"
                        onChange={(event) =>
                          setApprovedCostById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder={`Cost ${request.requestedCost}`}
                        value={approvedCostById[request.id] ?? ""}
                      />
                      <Input
                        disabled={isPending}
                        inputMode="numeric"
                        onChange={(event) =>
                          setApprovedMonthsById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder={`Months ${request.requestedRepaymentMonths}`}
                        value={approvedMonthsById[request.id] ?? ""}
                      />
                    </div>
                    <WorkflowChargeSummary
                      basisAmount={
                        Number(approvedCostById[request.id]) ||
                        request.requestedCost
                      }
                      charges={approvalChargeOptions}
                      title="Approval charges"
                    />
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        setNotesById((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Review note"
                      value={notesById[request.id] ?? ""}
                    />
                    <div className="flex flex-wrap gap-2">
                      {request.status === "submitted" ? (
                        <Button
                          disabled={isPending}
                          onClick={() => reviewRequest(request, "under_review")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Mark under review
                        </Button>
                      ) : null}
                      <Button
                        disabled={isPending}
                        onClick={() => reviewRequest(request, "approved")}
                        size="sm"
                        type="button"
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() => reviewRequest(request, "rejected")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : canReview && request.status === "approved" ? (
                  <div className="w-full space-y-2 md:w-[360px]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        disabled={isPending}
                        onChange={(event) =>
                          setPurchaseDateById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        type="date"
                        value={purchaseDateById[request.id] ?? ""}
                      />
                      <Input
                        disabled={isPending}
                        onChange={(event) =>
                          setFirstDueDateById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        type="date"
                        value={firstDueDateById[request.id] ?? ""}
                      />
                    </div>
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        setPurchaseReferenceById((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Invoice/reference"
                      value={purchaseReferenceById[request.id] ?? ""}
                    />
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        setPurchaseNotesById((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Purchase note"
                      value={purchaseNotesById[request.id] ?? ""}
                    />
                    <Button
                      disabled={
                        isPending ||
                        !purchaseDateById[request.id] ||
                        !firstDueDateById[request.id]
                      }
                      onClick={() => recordPurchase(request)}
                      size="sm"
                      type="button"
                    >
                      Record purchase
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-medium text-foreground">
              No procurement requests yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Item purchases requested for members will appear here for review.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export function MemberProcurementRequestsView({
  chargeOptions,
  member,
  requests,
}: {
  chargeOptions: WorkflowChargeOption[]
  member: {
    fullName: string
    memberNumber: string
  }
  requests: ProcurementRequestRow[]
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")
  const pendingRequests = requests.filter((request) =>
    ["submitted", "under_review"].includes(request.status)
  )
  const approvedRequests = requests.filter((request) =>
    ["approved", "purchased", "active"].includes(request.status)
  )
  const scheduleSummary = requests.reduce(
    (summary, request) => {
      const counts = getScheduleCounts(request)

      return {
        due: summary.due + counts.due,
        outstanding: summary.outstanding + counts.outstanding,
        overdue: summary.overdue + counts.overdue,
      }
    },
    { due: 0, outstanding: 0, overdue: 0 }
  )

  function submitRequest() {
    startTransition(async () => {
      try {
        await createOwnProcurementRequestAction(
          objectToFormData({
            itemDescription,
            itemName,
            requestedCost,
            requestedRepaymentMonths,
            vendorName,
          })
        )
        setItemDescription("")
        setItemName("")
        setRequestedCost("")
        setRequestedRepaymentMonths("")
        setVendorName("")
        showSuccess("Procurement request sent", "Request is pending review.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not send procurement request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SummaryTile label="Pending" value={pendingRequests.length} />
        <SummaryTile label="Approved" value={approvedRequests.length} />
        <SummaryTile label="Due" value={scheduleSummary.due} />
        <SummaryTile label="Overdue" value={scheduleSummary.overdue} />
        <SummaryTile label="Total requests" value={requests.length} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Request item purchase
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Item">
            <Input
              disabled={isPending}
              onChange={(event) => setItemName(event.target.value)}
              value={itemName}
            />
          </Field>
          <Field label="Vendor">
            <Input
              disabled={isPending}
              onChange={(event) => setVendorName(event.target.value)}
              value={vendorName}
            />
          </Field>
          <Field label="Requested cost">
            <Input
              disabled={isPending}
              inputMode="decimal"
              onChange={(event) => setRequestedCost(event.target.value)}
              value={requestedCost}
            />
          </Field>
          <Field label="Repayment months">
            <Input
              disabled={isPending}
              inputMode="numeric"
              onChange={(event) =>
                setRequestedRepaymentMonths(event.target.value)
              }
              value={requestedRepaymentMonths}
            />
          </Field>
          <Field className="md:col-span-2 xl:col-span-4" label="Description">
            <Textarea
              disabled={isPending}
              onChange={(event) => setItemDescription(event.target.value)}
              value={itemDescription}
            />
          </Field>
          <div className="md:col-span-2 xl:col-span-4">
            <WorkflowChargeSummary
              basisAmount={Number(requestedCost) || 0}
              charges={chargeOptions}
              title="Applicable charges"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button disabled={isPending} onClick={submitRequest} type="button">
            Send request
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {requests.length ? (
          requests.map((request) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={request.id}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {request.itemName}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(request.status)}`}
                    >
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Requested {formatCurrency(request.requestedCost)} over{" "}
                    {request.requestedRepaymentMonths} months ·{" "}
                    {formatCurrency(request.estimatedMonthlyRepayment)} monthly
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {formatDate(request.requestedAt)}
                    {request.vendorName ? ` · ${request.vendorName}` : ""}
                  </p>
                  {request.itemDescription ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {request.itemDescription}
                    </p>
                  ) : null}
                  {request.approvedCost ? (
                    <p className="mt-2 text-sm text-foreground">
                      Approved {formatCurrency(request.approvedCost)} over{" "}
                      {request.approvedRepaymentMonths} months ·{" "}
                      {formatCurrency(request.approvedMonthlyRepayment ?? 0)}{" "}
                      monthly
                    </p>
                  ) : null}
                  {request.purchasedAt ? (
                    <p className="mt-2 text-sm text-foreground">
                      Purchased {formatDate(request.purchasedAt)} · outstanding{" "}
                      {formatCurrency(request.outstandingAmount)}
                    </p>
                  ) : null}
                  <ProcurementScheduleStatus request={request} />
                  {request.reviewNotes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {request.reviewNotes}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-medium text-foreground">
              No procurement requests yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Item purchase requests you submit will appear here.
            </p>
          </div>
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
