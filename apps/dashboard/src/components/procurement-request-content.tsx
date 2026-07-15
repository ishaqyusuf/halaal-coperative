"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
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

export function ProcurementRequestCreateContent({
  chargeOptions,
  memberOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  memberOptions: ProcurementMemberOption[]
  onClose: () => void
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
        onClose()
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
        <Button disabled={isPending} onClick={submitRequest} type="button">
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
  onClose: () => void
}) {
  const router = useRouter()
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
        onClose()
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
        <Button disabled={isPending} onClick={submitRequest} type="button">
          Send request
        </Button>
      </div>
    </div>
  )
}

export function ProcurementRequestReviewContent({
  chargeOptions,
  onClose,
  request,
}: {
  chargeOptions: WorkflowChargeOption[]
  onClose: () => void
  request: ProcurementRequestRow
}) {
  const router = useRouter()
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
        onClose()
        router.refresh()
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
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          disabled={isPending}
          inputMode="decimal"
          onChange={(event) => setApprovedCost(event.target.value)}
          placeholder={`Cost ${request.requestedCost}`}
          value={approvedCost}
        />
        <Input
          disabled={isPending}
          inputMode="numeric"
          onChange={(event) => setApprovedMonths(event.target.value)}
          placeholder={`Months ${request.requestedRepaymentMonths}`}
          value={approvedMonths}
        />
      </div>
      <WorkflowChargeSummary
        basisAmount={Number(approvedCost) || request.requestedCost}
        charges={chargeOptions}
        title="Approval charges"
      />
      <Input
        disabled={isPending}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Review note"
        value={notes}
      />
      <div className="flex flex-wrap gap-2">
        {request.status === "submitted" ? (
          <Button
            disabled={isPending}
            onClick={() => reviewRequest("under_review")}
            size="sm"
            type="button"
            variant="outline"
          >
            Mark under review
          </Button>
        ) : null}
        <Button
          disabled={isPending}
          onClick={() => reviewRequest("approved")}
          size="sm"
          type="button"
        >
          Approve
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewRequest("rejected")}
          size="sm"
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
  onClose: () => void
  request: ProcurementRequestRow
}) {
  const router = useRouter()
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
        onClose()
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
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          disabled={isPending}
          onChange={(event) => setPurchaseDate(event.target.value)}
          type="date"
          value={purchaseDate}
        />
        <Input
          disabled={isPending}
          onChange={(event) => setFirstDueDate(event.target.value)}
          type="date"
          value={firstDueDate}
        />
      </div>
      <Input
        disabled={isPending}
        onChange={(event) => setPurchaseReference(event.target.value)}
        placeholder="Invoice/reference"
        value={purchaseReference}
      />
      <Input
        disabled={isPending}
        onChange={(event) => setPurchaseNotes(event.target.value)}
        placeholder="Purchase note"
        value={purchaseNotes}
      />
      <Button
        disabled={isPending || !purchaseDate || !firstDueDate}
        onClick={recordPurchase}
        size="sm"
        type="button"
      >
        Record purchase
      </Button>
    </div>
  )
}
