"use client"

import { useState, useTransition } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  createQaReference,
  formatCurrency,
  qaFirstOfNextMonth,
  qaToday,
} from "@halaalvest/utils"
import type { ProcurementRequestRow } from "@halaalvest/db"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { MemberCombobox } from "@/components/member-combobox"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import { RequestDecision } from "@/components/requests/request-decision"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { RequestStatusBadge } from "@/components/requests/request-status-badge"
import { RequestSteps } from "@/components/requests/request-steps"
import { useRequestRefresh } from "@/components/requests/use-request-refresh"
import { WorkflowChargeSummary } from "@/components/workflow-charge-summary"
import { useProcurementParams } from "@/hooks/use-procurement-params"
import { createQaProcurementRequest } from "@/lib/dev-form-fill"
import {
  createOwnProcurementRequestAction,
  createProcurementRequestAction,
  recordProcurementPurchaseAction,
  reviewProcurementRequestAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import {
  firstOfNextMonthInputValue,
  formatMonths,
  getRepaymentStatusLabel,
  getRequestNextStep,
  isPendingRequest,
  monthlyAmount,
  readableReference,
  todayInputValue,
} from "@/lib/requests/request-status-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

export type ProcurementMemberOption = {
  id: string
  label: string
}

function useRefreshProcurement() {
  const refresh = useRequestRefresh()
  const trpc = useTRPC()

  return (onClose: () => Promise<void>, procurementRequestId?: string) =>
    refresh(onClose, [
      trpc.procurement.list.infiniteQueryFilter(),
      ...(procurementRequestId
        ? [trpc.procurement.get.queryFilter({ procurementRequestId })]
        : []),
    ])
}

/** Charges are read only when a form that shows them is open. */
function useProcurementCharges(trigger: "approval" | "submission") {
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.procurement.chargeOptions.queryOptions(
      { trigger },
      { retry: 1, staleTime: 5 * 60_000 }
    )
  )

  return data ?? []
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function costLine(amount: number, months: number | null | undefined) {
  const monthly = months ? monthlyAmount(amount, months) : null
  const over = formatMonths(months)

  return [
    formatCurrency(amount),
    over ? `over ${over}` : null,
    monthly ? `(${formatCurrency(monthly)} a month)` : null,
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * New request. Staff pick the member; a member asks for themselves
 * (`selfService`). Both confirm the amount and charges before saving.
 */
export function ProcurementRequestForm({
  onClose,
  selfService = false,
}: {
  onClose: () => Promise<void>
  selfService?: boolean
}) {
  const refreshProcurement = useRefreshProcurement()
  const chargeOptions = useProcurementCharges("submission")
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [memberId, setMemberId] = useState("")
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")
  const cost = Number(requestedCost)
  const months = Number(requestedRepaymentMonths)
  const monthly = monthlyAmount(cost, months)
  const canSubmit =
    (selfService || Boolean(memberId)) &&
    Boolean(itemName.trim()) &&
    monthly !== null

  function submitRequest() {
    startTransition(async () => {
      const values = {
        itemDescription,
        itemName,
        requestedCost,
        requestedRepaymentMonths,
        vendorName,
      }

      try {
        if (selfService) {
          await createOwnProcurementRequestAction(objectToFormData(values))
        } else {
          await createProcurementRequestAction(
            objectToFormData({ ...values, memberId })
          )
        }
        setConfirmOpen(false)
        showSuccess(
          selfService ? "Request sent" : "Request saved",
          "The cooperative will check it."
        )
        await refreshProcurement(onClose)
      } catch (error) {
        showError("Could not save the request", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{
          itemDescription,
          itemName,
          requestedCost,
          requestedRepaymentMonths,
          vendorName,
        }}
        enabled={!isPending}
        isDirty={Boolean(itemName || vendorName || requestedCost)}
        onFill={() => {
          const values = createQaProcurementRequest()
          setItemDescription(values.itemDescription)
          setItemName(values.itemName)
          setRequestedCost(values.requestedCost)
          setRequestedRepaymentMonths(values.requestedRepaymentMonths)
          setVendorName(values.vendorName)
        }}
        restore={(draft) => {
          setItemDescription(draft.itemDescription)
          setItemName(draft.itemName)
          setRequestedCost(draft.requestedCost)
          setRequestedRepaymentMonths(draft.requestedRepaymentMonths)
          setVendorName(draft.vendorName)
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
      <RequestField label="What item?">
        <Input
          disabled={isPending}
          onChange={(event) => setItemName(event.target.value)}
          placeholder="For example, a fridge"
          value={itemName}
        />
      </RequestField>
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Cost (₦)">
          <Input
            disabled={isPending}
            inputMode="decimal"
            onChange={(event) => setRequestedCost(event.target.value)}
            value={requestedCost}
          />
        </RequestField>
        <RequestField
          hint={
            monthly ? `About ${formatCurrency(monthly)} a month` : undefined
          }
          label="Pay back over (months)"
        >
          <Input
            disabled={isPending}
            inputMode="numeric"
            onChange={(event) =>
              setRequestedRepaymentMonths(event.target.value)
            }
            value={requestedRepaymentMonths}
          />
        </RequestField>
      </div>
      <RequestField label="Shop or seller" optional>
        <Input
          disabled={isPending}
          onChange={(event) => setVendorName(event.target.value)}
          value={vendorName}
        />
      </RequestField>
      <RequestField label="More details" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setItemDescription(event.target.value)}
          value={itemDescription}
        />
      </RequestField>
      <WorkflowChargeSummary
        basisAmount={cost || 0}
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
          { label: "Item", value: itemName.trim() },
          { label: "Cost", value: costLine(cost, months) },
        ]}
        onConfirm={submitRequest}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title={selfService ? "Send this request?" : "Save this request?"}
      >
        <WorkflowChargeSummary
          basisAmount={cost || 0}
          charges={chargeOptions}
          title="Charges"
        />
      </RequestConfirmDialog>
    </div>
  )
}

/**
 * Everything about one request: where it is, the facts, repayments and the
 * next thing staff can do (decide, or record the purchase).
 */
export function ProcurementRequestDetails({
  canReview,
  onClose,
  request,
}: {
  canReview: boolean
  onClose: () => Promise<void>
  request: ProcurementRequestRow
}) {
  const { setParams } = useProcurementParams()
  const stateInput = { kind: "procurement" as const, status: request.status }
  const nextStep = getRequestNextStep(stateInput)
  const approved = request.approvedCost !== null

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <RequestStatusBadge {...stateInput} />
          {canReview ? (
            <span className="text-base text-muted-foreground">
              {request.member.fullName} · {request.member.memberNumber}
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
            label: "Asked for",
            value:
              approved &&
              request.approvedCost === request.requestedCost &&
              request.approvedRepaymentMonths ===
                request.requestedRepaymentMonths
                ? null
                : costLine(
                    request.requestedCost,
                    request.requestedRepaymentMonths
                  ),
          },
          {
            label: "Approved",
            value: approved
              ? costLine(
                  request.approvedCost ?? 0,
                  request.approvedRepaymentMonths
                )
              : null,
          },
          {
            label: "Still owed",
            value: request.repaymentScheduleItems.length
              ? formatCurrency(request.outstandingAmount)
              : null,
          },
          { label: "Shop or seller", value: request.vendorName },
          {
            label: "Asked on",
            value: formatDayMonthYear(request.requestedAt),
          },
          {
            label: "Bought on",
            value: formatDayMonthYear(request.purchasedAt),
          },
          {
            label: "Receipt or invoice",
            value: readableReference(request.purchaseReference),
          },
          { label: "Note from the office", value: request.reviewNotes },
          { label: "More details", value: request.itemDescription },
        ]}
      />

      {request.repaymentScheduleItems.length ? (
        <RequestSection title="Repayments">
          <ul className="divide-y divide-border border-y border-border">
            {request.repaymentScheduleItems.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-base"
                key={item.id}
              >
                <span>
                  <span className="font-medium">
                    {formatDayMonthYear(item.dueDate)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {getRepaymentStatusLabel(item.status)}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </RequestSection>
      ) : null}

      {canReview && isPendingRequest(request.status) ? (
        <ProcurementDecision onClose={onClose} request={request} />
      ) : null}

      {canReview && request.status === "approved" ? (
        <RequestSection title="Next step">
          <p className="text-base">
            When the item is bought, record it to start the repayments.
          </p>
          <div>
            <Button
              className="h-12 w-full sm:w-auto"
              onClick={() =>
                void setParams({
                  procurementRequestId: request.id,
                  procurementSheetType: "purchase",
                })
              }
              type="button"
            >
              Record purchase
            </Button>
          </div>
        </RequestSection>
      ) : null}
    </div>
  )
}

function ProcurementDecision({
  onClose,
  request,
}: {
  onClose: () => Promise<void>
  request: ProcurementRequestRow
}) {
  const refreshProcurement = useRefreshProcurement()
  const chargeOptions = useProcurementCharges("approval")
  const { showError, showSuccess } = useNotifications()
  const [approvedCost, setApprovedCost] = useState(
    String(request.requestedCost)
  )
  const [approvedMonths, setApprovedMonths] = useState(
    String(request.requestedRepaymentMonths)
  )
  const cost = Number(approvedCost)
  const months = Number(approvedMonths)
  const canApprove = monthlyAmount(cost, months) !== null

  async function decide(
    status: "approved" | "rejected" | "under_review",
    notes = ""
  ) {
    try {
      await reviewProcurementRequestAction(
        objectToFormData({
          approvedCost: status === "approved" ? approvedCost : "",
          approvedRepaymentMonths: status === "approved" ? approvedMonths : "",
          notes,
          procurementRequestId: request.id,
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
      await refreshProcurement(onClose, request.id)
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
          basisAmount={cost || request.requestedCost}
          charges={chargeOptions}
          title="Charges"
        />
      }
      approveFacts={[
        { label: "Item", value: request.itemName },
        { label: "Member", value: request.member.fullName },
        { label: "Amount", value: costLine(cost, months) },
      ]}
      canApprove={canApprove}
      onApprove={() => decide("approved")}
      onDecline={(reason) => decide("rejected", reason)}
      onStartChecking={
        request.status === "submitted"
          ? () => decide("under_review")
          : undefined
      }
    >
      <DashboardStateQuickFill
        draft={{ approvedCost, approvedMonths }}
        enabled
        isDirty={false}
        onFill={() => {
          setApprovedCost(String(request.requestedCost))
          setApprovedMonths(String(request.requestedRepaymentMonths))
        }}
        restore={(draft) => {
          setApprovedCost(draft.approvedCost)
          setApprovedMonths(draft.approvedMonths)
        }}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Approve amount (₦)">
          <Input
            inputMode="decimal"
            onChange={(event) => setApprovedCost(event.target.value)}
            value={approvedCost}
          />
        </RequestField>
        <RequestField
          hint={`Up to ${formatMonths(request.policyMaximumPaybackMonths)}`}
          label="Pay back over (months)"
        >
          <Input
            inputMode="numeric"
            onChange={(event) => setApprovedMonths(event.target.value)}
            value={approvedMonths}
          />
        </RequestField>
      </div>
      <WorkflowChargeSummary
        basisAmount={cost || request.requestedCost}
        charges={chargeOptions}
        title="Charges on approval"
      />
    </RequestDecision>
  )
}

/** Record that the item was bought. This starts the monthly repayments. */
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(() => todayInputValue())
  const [firstDueDate, setFirstDueDate] = useState(() =>
    firstOfNextMonthInputValue()
  )
  const [purchaseReference, setPurchaseReference] = useState("")
  const [purchaseNotes, setPurchaseNotes] = useState("")
  const months = request.approvedRepaymentMonths ?? 0
  const cost = request.approvedCost ?? 0

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
        setConfirmOpen(false)
        showSuccess("Purchase recorded", "Monthly repayments have started.")
        await refreshProcurement(onClose, request.id)
      } catch (error) {
        showError("Could not record the purchase", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{ firstDueDate, purchaseDate, purchaseNotes, purchaseReference }}
        enabled={!isPending}
        isDirty={Boolean(purchaseReference || purchaseNotes)}
        onFill={() => {
          setPurchaseDate(qaToday())
          setFirstDueDate(qaFirstOfNextMonth())
          setPurchaseReference(createQaReference("PO"))
          setPurchaseNotes("Supplier invoice and delivered item verified.")
        }}
        restore={(draft) => {
          setFirstDueDate(draft.firstDueDate)
          setPurchaseDate(draft.purchaseDate)
          setPurchaseNotes(draft.purchaseNotes)
          setPurchaseReference(draft.purchaseReference)
        }}
      />
      <p className="text-base">
        {request.member.fullName} · {costLine(cost, months)}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Date bought">
          <Input
            disabled={isPending}
            onChange={(event) => setPurchaseDate(event.target.value)}
            type="date"
            value={purchaseDate}
          />
        </RequestField>
        <RequestField label="First payment due">
          <Input
            disabled={isPending}
            onChange={(event) => setFirstDueDate(event.target.value)}
            type="date"
            value={firstDueDate}
          />
        </RequestField>
      </div>
      <RequestField label="Receipt or invoice number" optional>
        <Input
          disabled={isPending}
          onChange={(event) => setPurchaseReference(event.target.value)}
          value={purchaseReference}
        />
      </RequestField>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setPurchaseNotes(event.target.value)}
          value={purchaseNotes}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || !purchaseDate || !firstDueDate}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          Record purchase
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel="Record purchase"
        facts={[
          { label: "Item", value: request.itemName },
          { label: "Member", value: request.member.fullName },
          { label: "Repayments", value: costLine(cost, months) },
          {
            label: "First payment due",
            value: formatDayMonthYear(firstDueDate),
          },
        ]}
        onConfirm={recordPurchase}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title="Record this purchase?"
      />
    </div>
  )
}
