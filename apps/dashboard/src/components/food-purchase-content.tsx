"use client"

import { useMemo, useState, useTransition, type ReactNode } from "react"
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

export type FoodPurchaseOption = {
  id: string
  label: string
}

function formatMonth(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  })
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

function useOpenCycleOptions(cycles: FoodPurchaseCycleRow[]) {
  return useMemo(
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
}

export function FoodPurchaseReleaseContent({
  onClose,
}: {
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [periodMonth, setPeriodMonth] = useState("")
  const [releasedAmount, setReleasedAmount] = useState("")
  const [releasedAt, setReleasedAt] = useState("")
  const [releaseNotes, setReleaseNotes] = useState("")

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
        onClose()
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

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
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
    </>
  )
}

export function FoodPurchaseApplicationCreateContent({
  chargeOptions,
  cycles,
  memberOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  cycles: FoodPurchaseCycleRow[]
  memberOptions: FoodPurchaseOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [cycleId, setCycleId] = useState("")
  const [memberId, setMemberId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const openCycleOptions = useOpenCycleOptions(cycles)
  const memberSelectOptions = [
    { label: "Select member", value: "" },
    ...memberOptions.map((member) => ({
      label: member.label,
      value: member.id,
    })),
  ]

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
        onClose()
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

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
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
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
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
    </>
  )
}

export function MemberFoodPurchaseApplicationCreateContent({
  chargeOptions,
  cycles,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  cycles: FoodPurchaseCycleRow[]
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [cycleId, setCycleId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const openCycleOptions = useOpenCycleOptions(cycles)

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
        onClose()
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
    <>
      <div className="grid gap-3 sm:grid-cols-2">
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
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
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
    </>
  )
}

export function FoodPurchaseApplicationReviewContent({
  application,
  chargeOptions,
  onClose,
}: {
  application: FoodPurchaseApplicationRow
  chargeOptions: WorkflowChargeOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [approvedAmount, setApprovedAmount] = useState("")
  const [approvedPaybackMonths, setApprovedPaybackMonths] = useState("")
  const [reviewNotes, setReviewNotes] = useState("")

  function reviewApplication(status: "approved" | "rejected" | "under_review") {
    startTransition(async () => {
      try {
        await reviewFoodPurchaseApplicationAction(
          objectToFormData({
            applicationId: application.id,
            approvedAmount,
            approvedPaybackMonths,
            notes: reviewNotes,
            status,
          })
        )
        showSuccess(
          "Foodstuff Purchase review saved",
          `Application marked ${status.replace(/_/g, " ")}.`
        )
        onClose()
        router.refresh()
      } catch (error) {
        showError(
          "Could not save Foodstuff Purchase review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Approved amount">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setApprovedAmount(event.target.value)}
            placeholder={`${application.requestedAmount}`}
            value={approvedAmount}
          />
        </Field>
        <Field label="Payback months">
          <Input
            disabled={isPending}
            inputMode="numeric"
            min="1"
            onChange={(event) => setApprovedPaybackMonths(event.target.value)}
            placeholder={`${application.requestedPaybackMonths}`}
            type="number"
            value={approvedPaybackMonths}
          />
        </Field>
        <Field className="sm:col-span-2" label="Review note">
          <Textarea
            disabled={isPending}
            onChange={(event) => setReviewNotes(event.target.value)}
            value={reviewNotes}
          />
        </Field>
      </div>
      <WorkflowChargeSummary
        basisAmount={Number(approvedAmount) || application.requestedAmount}
        charges={chargeOptions}
        title="Approval charges"
      />
      <div className="flex flex-wrap gap-2">
        {application.status === "submitted" ? (
          <Button
            disabled={isPending}
            onClick={() => reviewApplication("under_review")}
            type="button"
            variant="outline"
          >
            Mark under review
          </Button>
        ) : null}
        <Button
          disabled={isPending}
          onClick={() => reviewApplication("approved")}
          type="button"
        >
          Approve
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewApplication("rejected")}
          type="button"
          variant="outline"
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

export function FoodPurchaseAccountingContent({
  cycle,
  onClose,
}: {
  cycle: FoodPurchaseCycleRow
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [salesAmount, setSalesAmount] = useState("")
  const [purchaseCostAmount, setPurchaseCostAmount] = useState("")
  const [operatingExpenseAmount, setOperatingExpenseAmount] = useState("")
  const [notes, setNotes] = useState("")

  function recordAccounting() {
    startTransition(async () => {
      try {
        await recordFoodPurchaseAccountingAction(
          objectToFormData({
            cycleId: cycle.id,
            notes,
            operatingExpenseAmount,
            purchaseCostAmount,
            salesAmount,
          })
        )
        showSuccess(
          "Foodstuff Purchase accounting saved",
          "Profit was recorded."
        )
        onClose()
        router.refresh()
      } catch (error) {
        showError(
          "Could not save Foodstuff Purchase accounting",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Sales">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setSalesAmount(event.target.value)}
            value={salesAmount}
          />
        </Field>
        <Field label="Cost">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setPurchaseCostAmount(event.target.value)}
            value={purchaseCostAmount}
          />
        </Field>
        <Field label="Expenses">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setOperatingExpenseAmount(event.target.value)}
            value={operatingExpenseAmount}
          />
        </Field>
        <Field className="sm:col-span-3" label="Accounting note">
          <Textarea
            disabled={isPending}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button disabled={isPending} onClick={recordAccounting} type="button">
          Save accounting
        </Button>
      </div>
    </>
  )
}

export function FoodPurchaseAccountingReviewContent({
  cycle,
  onClose,
}: {
  cycle: FoodPurchaseCycleRow
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState("")

  function reviewAccounting(decision: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await reviewFoodPurchaseAccountingAction(
          objectToFormData({
            cycleId: cycle.id,
            decision,
            notes,
          })
        )
        showSuccess(
          "Foodstuff Purchase accounting reviewed",
          `Accounting ${decision}.`
        )
        onClose()
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
    <div className="space-y-3">
      <Field label="Review note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() => reviewAccounting("approved")}
          type="button"
        >
          Approve accounting
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewAccounting("rejected")}
          type="button"
          variant="outline"
        >
          Request correction
        </Button>
      </div>
    </div>
  )
}
