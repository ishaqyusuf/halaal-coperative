"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementRequestRow } from "@halaalvest/db"
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
import { useTRPC } from "@/trpc/client"

export type ProcurementMemberOption = {
  id: string
  label: string
}

function Field({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function useRefreshProcurement() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()

  return async (
    onClose: () => Promise<void>,
    procurementRequestId?: string
  ) => {
    await onClose()

    const invalidations = [
      queryClient.invalidateQueries(
        trpc.procurement.list.infiniteQueryFilter()
      ),
    ]

    if (procurementRequestId) {
      invalidations.push(
        queryClient.invalidateQueries(
          trpc.procurement.get.queryFilter({ procurementRequestId })
        )
      )
    }

    await Promise.all(invalidations)
    router.refresh()
  }
}

export function ProcurementRequestCreateContent({
  chargeOptions,
  memberOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  memberOptions: ProcurementMemberOption[]
  onClose: () => Promise<void>
}) {
  const refreshProcurement = useRefreshProcurement()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")
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
        await refreshProcurement(onClose)
      } catch (error) {
        showError(
          "Could not save procurement request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
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
          onChange={(event) => setRequestedRepaymentMonths(event.target.value)}
          value={requestedRepaymentMonths}
        />
      </Field>
      <Field className="md:col-span-2" label="Description">
        <Textarea
          disabled={isPending}
          onChange={(event) => setItemDescription(event.target.value)}
          value={itemDescription}
        />
      </Field>
      <div className="md:col-span-2">
        <WorkflowChargeSummary
          basisAmount={Number(requestedCost) || 0}
          charges={chargeOptions}
          title="Submission charges"
        />
      </div>
      <div className="md:col-span-2">
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          disabled={isPending}
          onClick={submitRequest}
          type="button"
        >
          Save request
        </Button>
      </div>
    </div>
  )
}

export function MemberProcurementRequestCreateContent({
  chargeOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  onClose: () => Promise<void>
}) {
  const refreshProcurement = useRefreshProcurement()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")

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
        await refreshProcurement(onClose)
      } catch (error) {
        showError(
          "Could not send procurement request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
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
          onChange={(event) => setRequestedRepaymentMonths(event.target.value)}
          value={requestedRepaymentMonths}
        />
      </Field>
      <Field className="md:col-span-2" label="Description">
        <Textarea
          disabled={isPending}
          onChange={(event) => setItemDescription(event.target.value)}
          value={itemDescription}
        />
      </Field>
      <div className="md:col-span-2">
        <WorkflowChargeSummary
          basisAmount={Number(requestedCost) || 0}
          charges={chargeOptions}
          title="Applicable charges"
        />
      </div>
      <div className="md:col-span-2">
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          disabled={isPending}
          onClick={submitRequest}
          type="button"
        >
          Send request
        </Button>
      </div>
    </div>
  )
}

function formatProcurementEvidenceDate(value: Date | string | null) {
  if (!value) return "Not recorded"

  return new Date(value).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function ProcurementRequestDetailsContent({
  request,
}: {
  request: ProcurementRequestRow
}) {
  return (
    <div className="space-y-6">
      <section className="border-y border-border py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{request.itemName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.member.fullName} · {request.member.memberNumber}
            </p>
          </div>
          <span className="border border-border px-2 py-1 text-xs capitalize">
            {request.status.replaceAll("_", " ")}
          </span>
        </div>
        {request.itemDescription ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {request.itemDescription}
          </p>
        ) : null}
      </section>

      <DetailsSection title="Request and approval">
        <DetailsGrid>
          <Detail
            label="Requested cost"
            value={formatCurrency(request.requestedCost)}
          />
          <Detail
            label="Requested term"
            value={`${request.requestedRepaymentMonths} months`}
          />
          <Detail
            label="Approved cost"
            value={
              request.approvedCost
                ? formatCurrency(request.approvedCost)
                : "Not approved"
            }
          />
          <Detail
            label="Approved term"
            value={
              request.approvedRepaymentMonths
                ? `${request.approvedRepaymentMonths} months`
                : "Not approved"
            }
          />
          <Detail label="Vendor" value={request.vendorName ?? "Not provided"} />
          <Detail
            label="Requested on"
            value={formatProcurementEvidenceDate(request.requestedAt)}
          />
        </DetailsGrid>
        {request.reviewNotes ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Review note: {request.reviewNotes}
          </p>
        ) : null}
      </DetailsSection>

      <DetailsSection title="Purchase evidence">
        <DetailsGrid>
          <Detail
            label="Purchased on"
            value={formatProcurementEvidenceDate(request.purchasedAt)}
          />
          <Detail
            label="Reference"
            value={request.purchaseReference ?? "Not recorded"}
          />
        </DetailsGrid>
        {request.purchaseNotes ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {request.purchaseNotes}
          </p>
        ) : null}
      </DetailsSection>

      <DetailsSection title="Repayment schedule">
        {request.repaymentScheduleItems.length ? (
          <div className="divide-y divide-border border-y border-border">
            {request.repaymentScheduleItems.map((item) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-3 py-3 text-sm"
                key={item.id}
              >
                <div>
                  <p className="font-medium">
                    Installment {item.installmentNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {formatProcurementEvidenceDate(item.dueDate)} ·{" "}
                    <span className="capitalize">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p>{formatCurrency(item.amount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(item.paidAmount)} paid
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-y border-border py-4 text-sm text-muted-foreground">
            Repayment schedule has not started.
          </p>
        )}
      </DetailsSection>
    </div>
  )
}

function DetailsSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function DetailsGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function ProcurementRequestReviewContent({
  chargeOptions,
  onClose,
  request,
}: {
  chargeOptions: WorkflowChargeOption[]
  onClose: () => Promise<void>
  request: ProcurementRequestRow
}) {
  const refreshProcurement = useRefreshProcurement()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [approvedCost, setApprovedCost] = useState("")
  const [approvedMonths, setApprovedMonths] = useState("")
  const [notes, setNotes] = useState("")

  function reviewRequest(status: "approved" | "rejected" | "under_review") {
    startTransition(async () => {
      try {
        await reviewProcurementRequestAction(
          objectToFormData({
            approvedCost,
            approvedRepaymentMonths: approvedMonths,
            notes,
            procurementRequestId: request.id,
            status,
          })
        )
        showSuccess(
          "Procurement review saved",
          `Request marked ${status.replace(/_/g, " ")}.`
        )
        await refreshProcurement(onClose, request.id)
      } catch (error) {
        showError(
          "Could not save procurement review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-3">
      <section className="border-y border-border py-4">
        <p className="font-medium text-foreground">{request.itemName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {request.member.fullName} · {request.member.memberNumber}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Requested {formatCurrency(request.requestedCost)} over{" "}
          {request.requestedRepaymentMonths} months
        </p>
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Approved cost">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setApprovedCost(event.target.value)}
            placeholder={request.requestedCost.toString()}
            value={approvedCost}
          />
        </Field>
        <Field label="Approved repayment months">
          <Input
            disabled={isPending}
            inputMode="numeric"
            onChange={(event) => setApprovedMonths(event.target.value)}
            placeholder={request.requestedRepaymentMonths.toString()}
            value={approvedMonths}
          />
        </Field>
      </div>
      <WorkflowChargeSummary
        basisAmount={Number(approvedCost) || request.requestedCost}
        charges={chargeOptions}
        title="Approval charges"
      />
      <Field label="Review note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Explain the review decision"
          value={notes}
        />
      </Field>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        {request.status === "submitted" ? (
          <Button
            disabled={isPending}
            onClick={() => reviewRequest("under_review")}
            className="h-11 w-full sm:h-9 sm:w-auto"
            type="button"
            variant="outline"
          >
            Mark under review
          </Button>
        ) : null}
        <Button
          disabled={isPending}
          onClick={() => reviewRequest("approved")}
          className="h-11 w-full sm:h-9 sm:w-auto"
          type="button"
        >
          Approve
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewRequest("rejected")}
          className="h-11 w-full sm:h-9 sm:w-auto"
          type="button"
          variant="outline"
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

export function ProcurementPurchaseContent({
  onClose,
  request,
}: {
  onClose: () => Promise<void>
  request: ProcurementRequestRow
}) {
  const refreshProcurement = useRefreshProcurement()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [purchaseDate, setPurchaseDate] = useState("")
  const [firstDueDate, setFirstDueDate] = useState("")
  const [purchaseReference, setPurchaseReference] = useState("")
  const [purchaseNotes, setPurchaseNotes] = useState("")

  function recordPurchase() {
    startTransition(async () => {
      try {
        await recordProcurementPurchaseAction(
          objectToFormData({
            firstDueDate,
            procurementRequestId: request.id,
            purchaseDate,
            purchaseNotes,
            purchaseReference,
          })
        )
        showSuccess(
          "Procurement purchase recorded",
          "Repayment schedule is now active."
        )
        await refreshProcurement(onClose, request.id)
      } catch (error) {
        showError(
          "Could not record procurement purchase",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-3">
      <section className="border-y border-border py-4">
        <p className="font-medium text-foreground">{request.itemName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {request.member.fullName} · approved for{" "}
          {formatCurrency(request.approvedCost ?? 0)}
        </p>
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Purchase date">
          <Input
            disabled={isPending}
            onChange={(event) => setPurchaseDate(event.target.value)}
            type="date"
            value={purchaseDate}
          />
        </Field>
        <Field label="First repayment due date">
          <Input
            disabled={isPending}
            onChange={(event) => setFirstDueDate(event.target.value)}
            type="date"
            value={firstDueDate}
          />
        </Field>
      </div>
      <Field label="Invoice or purchase reference">
        <Input
          disabled={isPending}
          onChange={(event) => setPurchaseReference(event.target.value)}
          placeholder="Enter invoice or receipt reference"
          value={purchaseReference}
        />
      </Field>
      <Field label="Purchase note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setPurchaseNotes(event.target.value)}
          placeholder="Add purchase or fulfilment notes"
          value={purchaseNotes}
        />
      </Field>
      <Button
        disabled={isPending || !purchaseDate || !firstDueDate}
        onClick={recordPurchase}
        className="h-11 w-full md:h-9 md:w-auto"
        type="button"
      >
        Record purchase
      </Button>
    </div>
  )
}
