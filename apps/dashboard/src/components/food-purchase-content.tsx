"use client"

import { useState, useTransition } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { createQaAmount, formatCurrency, qaToday } from "@halaalvest/utils"
import type {
  FoodPurchaseApplicationRow,
  FoodPurchaseCycleRow,
} from "@halaalvest/db"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { MemberCombobox } from "@/components/member-combobox"
import { RequestChoice } from "@/components/requests/request-choice"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import { RequestDecision } from "@/components/requests/request-decision"
import { RequestFacts } from "@/components/requests/request-facts"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { RequestStatusBadge } from "@/components/requests/request-status-badge"
import { RequestSteps } from "@/components/requests/request-steps"
import { useRequestRefresh } from "@/components/requests/use-request-refresh"
import { WorkflowChargeSummary } from "@/components/workflow-charge-summary"
import {
  createFoodPurchaseCycleAction,
  recordFoodPurchaseAccountingAction,
  reviewFoodPurchaseAccountingAction,
  reviewFoodPurchaseApplicationAction,
  submitFoodPurchaseApplicationAction,
  submitOwnFoodPurchaseApplicationAction,
} from "@/lib/dashboard-actions"
import { createQaFoodPurchaseRequest } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import {
  formatMonths,
  formatMonthYear,
  getRequestNextStep,
  isPendingRequest,
  monthlyAmount,
  todayInputValue,
} from "@/lib/requests/request-status-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

export type FoodPurchaseOption = {
  id: string
  label: string
}

function useRefreshFoodPurchase() {
  const refresh = useRequestRefresh()
  const trpc = useTRPC()

  return (onClose: () => Promise<void>, applicationId?: string) =>
    refresh(onClose, [
      trpc.foodPurchase.list.infiniteQueryFilter(),
      ...(applicationId
        ? [
            trpc.foodPurchase.get.queryFilter({
              foodPurchaseApplicationId: applicationId,
            }),
          ]
        : []),
    ])
}

/** Charges are read only when a form that shows them is open. */
function useFoodPurchaseCharges(trigger: "approval" | "submission") {
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.foodPurchase.chargeOptions.queryOptions(
      { trigger },
      { retry: 1, staleTime: 5 * 60_000 }
    )
  )

  return data ?? []
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function amountLine(amount: number, months: number | null | undefined) {
  const monthly = months ? monthlyAmount(amount, months) : null
  const over = formatMonths(months)

  return [
    formatCurrency(amount),
    over ? `over ${over}` : null,
    monthly && months && months > 1
      ? `(${formatCurrency(monthly)} a month)`
      : null,
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * New foodstuff request for an open month. Staff pick the member; a member
 * asks for themselves (`selfService`). Both confirm before saving.
 */
export function FoodPurchaseApplicationForm({
  cycles,
  onClose,
  selfService = false,
}: {
  cycles: FoodPurchaseCycleRow[]
  onClose: () => Promise<void>
  selfService?: boolean
}) {
  const refreshFoodPurchase = useRefreshFoodPurchase()
  const chargeOptions = useFoodPurchaseCharges("submission")
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const openCycles = cycles.filter((cycle) => cycle.status === "open")
  const [cycleId, setCycleId] = useState(openCycles[0]?.id ?? "")
  const [memberId, setMemberId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const selectedCycle = openCycles.find((cycle) => cycle.id === cycleId)
  const amount = Number(requestedAmount)
  const months = Number(requestedPaybackMonths)
  const canSubmit =
    (selfService || Boolean(memberId)) &&
    Boolean(selectedCycle) &&
    monthlyAmount(amount, months) !== null

  function submitApplication() {
    startTransition(async () => {
      const values = {
        cycleId,
        itemDescription,
        requestedAmount,
        requestedPaybackMonths,
        requestNotes,
      }

      try {
        if (selfService) {
          await submitOwnFoodPurchaseApplicationAction(objectToFormData(values))
        } else {
          await submitFoodPurchaseApplicationAction(
            objectToFormData({ ...values, memberId })
          )
        }
        setConfirmOpen(false)
        showSuccess(
          selfService ? "Request sent" : "Request saved",
          "The cooperative will check it."
        )
        await refreshFoodPurchase(onClose)
      } catch (error) {
        showError("Could not save the request", errorMessage(error))
      }
    })
  }

  if (!openCycles.length) {
    return (
      <p className="text-base">
        There is no open month for foodstuff requests right now.
      </p>
    )
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{
          itemDescription,
          requestedAmount,
          requestedPaybackMonths,
          requestNotes,
        }}
        enabled={!isPending}
        isDirty={Boolean(requestedAmount || itemDescription || requestNotes)}
        onFill={() => {
          const values = createQaFoodPurchaseRequest()
          setItemDescription(values.itemDescription)
          setRequestedAmount(values.requestedAmount)
          setRequestedPaybackMonths(values.requestedPaybackMonths)
          setRequestNotes(values.notes)
        }}
        restore={(draft) => {
          setItemDescription(draft.itemDescription)
          setRequestedAmount(draft.requestedAmount)
          setRequestedPaybackMonths(draft.requestedPaybackMonths)
          setRequestNotes(draft.requestNotes)
        }}
      />
      {selfService ? null : (
        <RequestField label="Member">
          <MemberCombobox
            disabled={isPending}
            onValueChange={setMemberId}
            value={memberId}
          />
        </RequestField>
      )}
      {openCycles.length > 1 ? (
        <RequestChoice
          disabled={isPending}
          label="Month"
          onChange={setCycleId}
          options={openCycles.map((cycle) => ({
            label: formatMonthYear(cycle.periodMonth),
            value: cycle.id,
          }))}
          value={cycleId}
        />
      ) : (
        <p className="text-base">
          <span className="font-medium">Month: </span>
          {formatMonthYear(openCycles[0]!.periodMonth)}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Amount (₦)">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setRequestedAmount(event.target.value)}
            value={requestedAmount}
          />
        </RequestField>
        <RequestField
          hint={(() => {
            const monthly = monthlyAmount(amount, months)
            return monthly && months > 1
              ? `About ${formatCurrency(monthly)} a month`
              : undefined
          })()}
          label="Pay back over (months)"
        >
          <Input
            disabled={isPending}
            inputMode="numeric"
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
            value={requestedPaybackMonths}
          />
        </RequestField>
      </div>
      <RequestField label="What food?" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setItemDescription(event.target.value)}
          placeholder="For example, rice and beans"
          value={itemDescription}
        />
      </RequestField>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setRequestNotes(event.target.value)}
          value={requestNotes}
        />
      </RequestField>
      <WorkflowChargeSummary
        basisAmount={amount || 0}
        charges={chargeOptions}
        title="Charges"
      />
      <RequestFormActions>
        <Button
          disabled={isPending || !canSubmit}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          {selfService ? "Send request" : "Save request"}
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel={selfService ? "Send request" : "Save request"}
        facts={[
          {
            label: "Month",
            value: selectedCycle
              ? formatMonthYear(selectedCycle.periodMonth)
              : "",
          },
          { label: "Amount", value: amountLine(amount, months) },
        ]}
        onConfirm={submitApplication}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title={selfService ? "Send this request?" : "Save this request?"}
      >
        <WorkflowChargeSummary
          basisAmount={amount || 0}
          charges={chargeOptions}
          title="Charges"
        />
      </RequestConfirmDialog>
    </div>
  )
}

/** Everything about one foodstuff request, and the decision while it waits. */
export function FoodPurchaseApplicationDetails({
  application,
  canReview,
  onClose,
}: {
  application: FoodPurchaseApplicationRow
  canReview: boolean
  onClose: () => Promise<void>
}) {
  const stateInput = {
    approvedAmount: application.approvedAmount,
    kind: "foodPurchase" as const,
    paidAmount: application.paidAmount,
    status: application.status,
  }
  const nextStep = getRequestNextStep(stateInput)
  const approved = application.approvedAmount !== null
  const owed = approved
    ? Math.max(0, (application.approvedAmount ?? 0) - application.paidAmount)
    : null

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <RequestStatusBadge {...stateInput} />
          {canReview ? (
            <span className="text-base text-muted-foreground">
              {application.member.memberNumber}
            </span>
          ) : null}
        </div>
        <RequestSteps {...stateInput} />
        {canReview ? null : nextStep ? (
          <p className="text-base text-foreground">{nextStep}</p>
        ) : null}
      </div>

      <RequestFacts
        items={[
          {
            label: "Month",
            value: formatMonthYear(application.cycle.periodMonth),
          },
          {
            label: "Asked for",
            value:
              approved &&
              application.approvedAmount === application.requestedAmount &&
              application.approvedPaybackMonths ===
                application.requestedPaybackMonths
                ? null
                : amountLine(
                    application.requestedAmount,
                    application.requestedPaybackMonths
                  ),
          },
          {
            label: "Approved",
            value: approved
              ? amountLine(
                  application.approvedAmount ?? 0,
                  application.approvedPaybackMonths
                )
              : null,
          },
          {
            label: "Paid so far",
            value: approved ? formatCurrency(application.paidAmount) : null,
          },
          {
            label: "Still owed",
            value: owed !== null ? formatCurrency(owed) : null,
          },
          {
            label: "Asked on",
            value: formatDayMonthYear(application.requestedAt),
          },
          { label: "What food", value: application.itemDescription },
          { label: "Note", value: application.requestNotes },
          { label: "Note from the office", value: application.reviewNotes },
        ]}
      />

      {canReview && isPendingRequest(application.status) ? (
        <FoodPurchaseDecision application={application} onClose={onClose} />
      ) : null}
    </div>
  )
}

function FoodPurchaseDecision({
  application,
  onClose,
}: {
  application: FoodPurchaseApplicationRow
  onClose: () => Promise<void>
}) {
  const refreshFoodPurchase = useRefreshFoodPurchase()
  const chargeOptions = useFoodPurchaseCharges("approval")
  const { showError, showSuccess } = useNotifications()
  const [approvedAmount, setApprovedAmount] = useState(
    String(application.requestedAmount)
  )
  const [approvedPaybackMonths, setApprovedPaybackMonths] = useState(
    String(application.requestedPaybackMonths)
  )
  const amount = Number(approvedAmount)
  const months = Number(approvedPaybackMonths)

  async function decide(
    status: "approved" | "rejected" | "under_review",
    notes = ""
  ) {
    try {
      await reviewFoodPurchaseApplicationAction(
        objectToFormData({
          applicationId: application.id,
          approvedAmount: status === "approved" ? approvedAmount : "",
          approvedPaybackMonths:
            status === "approved" ? approvedPaybackMonths : "",
          notes,
          status,
        })
      )
      showSuccess(
        status === "approved"
          ? "Request approved"
          : status === "rejected"
            ? "Request declined"
            : "Marked as being checked",
        status === "under_review" ? "" : "The member will be told."
      )
      await refreshFoodPurchase(onClose, application.id)
      return true
    } catch (error) {
      showError("Could not save the decision", errorMessage(error))
      return false
    }
  }

  return (
    <RequestDecision
      approveExtra={
        <WorkflowChargeSummary
          basisAmount={amount || application.requestedAmount}
          charges={chargeOptions}
          title="Charges"
        />
      }
      approveFacts={[
        { label: "Member", value: application.member.fullName },
        {
          label: "Month",
          value: formatMonthYear(application.cycle.periodMonth),
        },
        { label: "Amount", value: amountLine(amount, months) },
      ]}
      canApprove={monthlyAmount(amount, months) !== null}
      onApprove={() => decide("approved")}
      onDecline={(reason) => decide("rejected", reason)}
      onStartChecking={
        application.status === "submitted"
          ? () => decide("under_review")
          : undefined
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Approve amount (₦)">
          <Input
            inputMode="decimal"
            onChange={(event) => setApprovedAmount(event.target.value)}
            value={approvedAmount}
          />
        </RequestField>
        <RequestField
          hint={`Up to ${formatMonths(application.policyMaximumPaybackMonths)}`}
          label="Pay back over (months)"
        >
          <Input
            inputMode="numeric"
            onChange={(event) => setApprovedPaybackMonths(event.target.value)}
            value={approvedPaybackMonths}
          />
        </RequestField>
      </div>
      <WorkflowChargeSummary
        basisAmount={amount || application.requestedAmount}
        charges={chargeOptions}
        title="Charges on approval"
      />
    </RequestDecision>
  )
}

/** Open a month: record the money given to the committee to buy food. */
export function FoodPurchaseReleaseContent({
  onClose,
}: {
  onClose: () => Promise<void>
}) {
  const refreshFoodPurchase = useRefreshFoodPurchase()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [periodMonth, setPeriodMonth] = useState(() =>
    todayInputValue().slice(0, 7)
  )
  const [releasedAmount, setReleasedAmount] = useState("")
  const [releasedAt, setReleasedAt] = useState(() => todayInputValue())
  const [releaseNotes, setReleaseNotes] = useState("")
  const amount = Number(releasedAmount)

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
        setConfirmOpen(false)
        showSuccess("Month opened", "Members can now ask for foodstuff.")
        await refreshFoodPurchase(onClose)
      } catch (error) {
        showError("Could not open the month", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{ periodMonth, releasedAmount, releasedAt, releaseNotes }}
        enabled={!isPending}
        isDirty={Boolean(releasedAmount || releaseNotes)}
        onFill={() => {
          setPeriodMonth(qaToday().slice(0, 7))
          setReleasedAt(qaToday())
          setReleasedAmount(createQaAmount(800_000, 1_500_000, 50_000))
          setReleaseNotes("Committee release evidence verified by finance.")
        }}
        restore={(draft) => {
          setPeriodMonth(draft.periodMonth)
          setReleasedAmount(draft.releasedAmount)
          setReleasedAt(draft.releasedAt)
          setReleaseNotes(draft.releaseNotes)
        }}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Month">
          <Input
            disabled={isPending}
            onChange={(event) => setPeriodMonth(event.target.value)}
            type="month"
            value={periodMonth}
          />
        </RequestField>
        <RequestField label="Date given">
          <Input
            disabled={isPending}
            onChange={(event) => setReleasedAt(event.target.value)}
            type="date"
            value={releasedAt}
          />
        </RequestField>
      </div>
      <RequestField label="Money given to the committee (₦)">
        <Input
          disabled={isPending}
          inputMode="decimal"
          onChange={(event) => setReleasedAmount(event.target.value)}
          value={releasedAmount}
        />
      </RequestField>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setReleaseNotes(event.target.value)}
          value={releaseNotes}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || !periodMonth || !releasedAt || !(amount > 0)}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          Open month
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel="Open month"
        facts={[
          {
            label: "Month",
            value: periodMonth ? formatMonthYear(`${periodMonth}-01`) : "",
          },
          { label: "Money given", value: formatCurrency(amount || 0) },
          { label: "Date given", value: formatDayMonthYear(releasedAt) },
        ]}
        onConfirm={createCycle}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title="Open this month?"
      />
    </div>
  )
}

/** Month-end figures from the committee. Profit is worked out as you type. */
export function FoodPurchaseAccountingContent({
  cycle,
  onClose,
}: {
  cycle: FoodPurchaseCycleRow
  onClose: () => Promise<void>
}) {
  const refreshFoodPurchase = useRefreshFoodPurchase()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [salesAmount, setSalesAmount] = useState("")
  const [purchaseCostAmount, setPurchaseCostAmount] = useState("")
  const [operatingExpenseAmount, setOperatingExpenseAmount] = useState("")
  const [notes, setNotes] = useState("")
  const sales = Number(salesAmount) || 0
  const cost = Number(purchaseCostAmount) || 0
  const expenses = Number(operatingExpenseAmount) || 0
  const profit = sales - cost - expenses
  const canSave = salesAmount !== "" && purchaseCostAmount !== ""

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
        setConfirmOpen(false)
        showSuccess("Figures sent", "Finance will check them.")
        await refreshFoodPurchase(onClose)
      } catch (error) {
        showError("Could not send the figures", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{
          notes,
          operatingExpenseAmount,
          purchaseCostAmount,
          salesAmount,
        }}
        enabled={!isPending}
        isDirty={Boolean(salesAmount || purchaseCostAmount || notes)}
        onFill={() => {
          const released = cycle.releasedAmount || 1_200_000
          setPurchaseCostAmount(String(Math.round(released * 0.93)))
          setOperatingExpenseAmount(String(Math.round(released * 0.05)))
          setSalesAmount(String(Math.round(released * 1.12)))
          setNotes("Committee sales, supplier cost and expenses reconciled.")
        }}
        restore={(draft) => {
          setNotes(draft.notes)
          setOperatingExpenseAmount(draft.operatingExpenseAmount)
          setPurchaseCostAmount(draft.purchaseCostAmount)
          setSalesAmount(draft.salesAmount)
        }}
      />
      <RequestField label="Money from sales (₦)">
        <Input
          disabled={isPending}
          inputMode="decimal"
          onChange={(event) => setSalesAmount(event.target.value)}
          value={salesAmount}
        />
      </RequestField>
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Cost of the food (₦)">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setPurchaseCostAmount(event.target.value)}
            value={purchaseCostAmount}
          />
        </RequestField>
        <RequestField label="Other costs (₦)" optional>
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setOperatingExpenseAmount(event.target.value)}
            value={operatingExpenseAmount}
          />
        </RequestField>
      </div>
      <p className="text-lg font-semibold">Profit: {formatCurrency(profit)}</p>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || !canSave}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          Send figures
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel="Send figures"
        description="Finance will check them before they are accepted."
        facts={[
          { label: "Sales", value: formatCurrency(sales) },
          { label: "Costs", value: formatCurrency(cost + expenses) },
          { label: "Profit", value: formatCurrency(profit) },
        ]}
        onConfirm={recordAccounting}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title={`Send ${formatMonthYear(cycle.periodMonth)} figures?`}
      />
    </div>
  )
}

/** Finance accepts the month's figures or asks the committee to fix them. */
export function FoodPurchaseAccountingReviewContent({
  cycle,
  onClose,
}: {
  cycle: FoodPurchaseCycleRow
  onClose: () => Promise<void>
}) {
  const refreshFoodPurchase = useRefreshFoodPurchase()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<"approved" | "rejected" | null>(null)
  const [notes, setNotes] = useState("")

  function reviewAccounting(decision: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await reviewFoodPurchaseAccountingAction(
          objectToFormData({ cycleId: cycle.id, decision, notes })
        )
        setConfirm(null)
        showSuccess(
          decision === "approved" ? "Figures accepted" : "Sent back to fix",
          "The committee will be told."
        )
        await refreshFoodPurchase(onClose)
      } catch (error) {
        showError("Could not save", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <RequestFacts
        items={[
          { label: "Money given", value: formatCurrency(cycle.releasedAmount) },
          { label: "Sales", value: formatCurrency(cycle.salesAmount ?? 0) },
          {
            label: "Cost of the food",
            value: formatCurrency(cycle.purchaseCostAmount ?? 0),
          },
          {
            label: "Other costs",
            value: formatCurrency(cycle.operatingExpenseAmount ?? 0),
          },
          { label: "Profit", value: formatCurrency(cycle.profitAmount ?? 0) },
          { label: "Note", value: cycle.accountingNotes },
          {
            label: "Sent by",
            value: cycle.accountingSubmittedByUser?.fullName ?? null,
          },
        ]}
      />
      <RequestFormActions>
        <Button
          disabled={isPending}
          onClick={() => setConfirm("approved")}
          type="button"
        >
          Accept figures
        </Button>
        <Button
          disabled={isPending}
          onClick={() => setConfirm("rejected")}
          type="button"
          variant="outline"
        >
          Ask to fix
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel="Accept figures"
        description="Profit is recorded as evidence only. It is not shared out."
        onConfirm={() => reviewAccounting("approved")}
        onOpenChange={(open) => setConfirm(open ? "approved" : null)}
        open={confirm === "approved"}
        pending={isPending}
        title="Accept these figures?"
      />
      <RequestConfirmDialog
        confirmLabel="Send back"
        destructive
        disabled={!notes.trim()}
        onConfirm={() => reviewAccounting("rejected")}
        onOpenChange={(open) => setConfirm(open ? "rejected" : null)}
        open={confirm === "rejected"}
        pending={isPending}
        title="Ask the committee to fix the figures?"
      >
        <RequestField label="What needs fixing?">
          <Textarea
            disabled={isPending}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </RequestField>
      </RequestConfirmDialog>
    </div>
  )
}
