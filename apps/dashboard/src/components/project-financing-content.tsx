"use client"

import { useState, useTransition } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { createQaReference, formatCurrency, qaToday } from "@halaalvest/utils"
import type {
  ProjectFinancingRequestRow,
  ProjectFinancingStructure,
} from "@halaalvest/db"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { MemberCombobox } from "@/components/member-combobox"
import { RequestChoice } from "@/components/requests/request-choice"
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
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { createQaProjectFinancingRequest } from "@/lib/dev-form-fill"
import {
  createOwnProjectFinancingRequestAction,
  createProjectFinancingRequestAction,
  recordProjectFinancingDisbursementAction,
  reviewProjectFinancingRequestAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import {
  formatMonths,
  getProjectFinancingTypeLabel,
  getRequestNextStep,
  isPendingRequest,
  monthlyAmount,
  projectFinancingTypeOptions,
  readableReference,
  todayInputValue,
} from "@/lib/requests/request-status-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

export type ProjectFinancingMemberOption = {
  id: string
  label: string
}

const decidedTypeOptions = projectFinancingTypeOptions.filter(
  (option) => option.value !== "undecided"
)

function useRefreshProjectFinancing() {
  const refresh = useRequestRefresh()
  const trpc = useTRPC()

  return (onClose: () => Promise<void>, projectFinancingRequestId?: string) =>
    refresh(onClose, [
      trpc.projectFinancing.list.infiniteQueryFilter(),
      ...(projectFinancingRequestId
        ? [trpc.projectFinancing.get.queryFilter({ projectFinancingRequestId })]
        : []),
    ])
}

/** Charges are read only when a form that shows them is open. */
function useProjectFinancingCharges(trigger: "approval" | "submission") {
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.projectFinancing.chargeOptions.queryOptions(
      { trigger },
      { retry: 1, staleTime: 5 * 60_000 }
    )
  )

  return data ?? []
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function amountLine(
  amount: number,
  type: ProjectFinancingStructure | null,
  months: number | null | undefined
) {
  if (type !== "repayable_facility" || !months) return formatCurrency(amount)

  const monthly = monthlyAmount(amount, months)

  return `${formatCurrency(amount)} over ${formatMonths(months)}${monthly ? ` (${formatCurrency(monthly)} a month)` : ""}`
}

/** Months are asked only when the money is paid back monthly. */
function monthsAreValid(type: ProjectFinancingStructure, months: string) {
  const value = Number(months)

  return type === "repayable_facility"
    ? Number.isInteger(value) && value > 0
    : months === ""
}

/**
 * New funding request. Staff pick the member; a member asks for themselves
 * (`selfService`). Both confirm the amount and charges before saving.
 */
export function ProjectFinancingRequestForm({
  onClose,
  selfService = false,
}: {
  onClose: () => Promise<void>
  selfService?: boolean
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
  const chargeOptions = useProjectFinancingCharges("submission")
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [memberId, setMemberId] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [proposedStructure, setProposedStructure] =
    useState<ProjectFinancingStructure>("undecided")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("")
  const amount = Number(requestedAmount)
  const canSubmit =
    (selfService || Boolean(memberId)) &&
    Boolean(businessName.trim()) &&
    amount > 0 &&
    monthsAreValid(proposedStructure, requestedPaybackMonths)

  function submitRequest() {
    startTransition(async () => {
      const values = {
        businessDescription,
        businessName,
        projectPurpose,
        proposedStructure,
        requestedAmount,
        requestedPaybackMonths,
      }

      try {
        if (selfService) {
          await createOwnProjectFinancingRequestAction(objectToFormData(values))
        } else {
          await createProjectFinancingRequestAction(
            objectToFormData({ ...values, memberId })
          )
        }
        setConfirmOpen(false)
        showSuccess(
          selfService ? "Request sent" : "Request saved",
          "The cooperative will check it."
        )
        await refreshProjectFinancing(onClose)
      } catch (error) {
        showError("Could not save the request", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{
          businessDescription,
          businessName,
          projectPurpose,
          requestedAmount,
          requestedPaybackMonths,
        }}
        enabled={!isPending}
        isDirty={Boolean(businessName || projectPurpose || requestedAmount)}
        onFill={() => {
          const values = createQaProjectFinancingRequest()
          setBusinessDescription(values.description)
          setBusinessName(values.businessName)
          setProjectPurpose(values.purpose)
          setProposedStructure("repayable_facility")
          setRequestedAmount(values.requestedAmount)
          setRequestedPaybackMonths(values.requestedPaybackMonths)
        }}
        restore={(draft) => {
          setBusinessDescription(draft.businessDescription)
          setBusinessName(draft.businessName)
          setProjectPurpose(draft.projectPurpose)
          setRequestedAmount(draft.requestedAmount)
          setRequestedPaybackMonths(draft.requestedPaybackMonths)
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
      <RequestField label="Business name">
        <Input
          disabled={isPending}
          onChange={(event) => setBusinessName(event.target.value)}
          value={businessName}
        />
      </RequestField>
      <RequestField label="Amount (₦)">
        <Input
          disabled={isPending}
          inputMode="decimal"
          onChange={(event) => setRequestedAmount(event.target.value)}
          value={requestedAmount}
        />
      </RequestField>
      <RequestChoice
        disabled={isPending}
        label="How will the money come back?"
        onChange={(value) => {
          setProposedStructure(value)
          if (value !== "repayable_facility") setRequestedPaybackMonths("")
        }}
        options={projectFinancingTypeOptions}
        value={proposedStructure}
      />
      {proposedStructure === "repayable_facility" ? (
        <RequestField
          hint={(() => {
            const monthly = monthlyAmount(
              amount,
              Number(requestedPaybackMonths)
            )
            return monthly
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
      ) : null}
      <RequestField label="What is the money for?" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setProjectPurpose(event.target.value)}
          value={projectPurpose}
        />
      </RequestField>
      <RequestField label="About the business" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setBusinessDescription(event.target.value)}
          value={businessDescription}
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
          { label: "Business", value: businessName.trim() },
          {
            label: "Amount",
            value: amountLine(
              amount,
              proposedStructure,
              Number(requestedPaybackMonths)
            ),
          },
          {
            label: "Paid back by",
            value: getProjectFinancingTypeLabel(proposedStructure),
          },
        ]}
        onConfirm={submitRequest}
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

/**
 * Everything about one funding request: where it is, the facts and the next
 * thing staff can do (decide, or record the payout).
 */
export function ProjectFinancingRequestDetails({
  canReview,
  onClose,
  request,
}: {
  canReview: boolean
  onClose: () => Promise<void>
  request: ProjectFinancingRequestRow
}) {
  const { setParams } = useProjectFinancingParams()
  const type = request.approvedStructure ?? request.proposedStructure
  const repayable = type === "repayable_facility"
  const stateInput = {
    kind: "projectFinancing" as const,
    repayable,
    status: request.status,
  }
  const nextStep = getRequestNextStep(stateInput)
  const approved = request.approvedAmount !== null
  const outstanding = Math.max(
    0,
    (request.approvedAmount ?? 0) - (request.paidAmount ?? 0)
  )

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
              approved && request.approvedAmount === request.requestedAmount
                ? null
                : amountLine(
                    request.requestedAmount,
                    request.proposedStructure,
                    request.requestedPaybackMonths
                  ),
          },
          {
            label: "Approved",
            value: approved
              ? amountLine(
                  request.approvedAmount ?? 0,
                  request.approvedStructure,
                  request.approvedPaybackMonths
                )
              : null,
          },
          { label: "Paid back by", value: getProjectFinancingTypeLabel(type) },
          {
            label: "Still owed",
            value:
              repayable && request.disbursedAt
                ? formatCurrency(outstanding)
                : null,
          },
          {
            label: "Asked on",
            value: formatDayMonthYear(request.requestedAt),
          },
          {
            label: "Paid out on",
            value: formatDayMonthYear(request.disbursedAt),
          },
          {
            label: "Payout reference",
            value: readableReference(request.disbursementReference),
          },
          { label: "Note from the office", value: request.reviewNotes },
          { label: "What the money is for", value: request.projectPurpose },
          { label: "About the business", value: request.businessDescription },
        ]}
      />

      {canReview && isPendingRequest(request.status) ? (
        <ProjectFinancingDecision onClose={onClose} request={request} />
      ) : null}

      {canReview && request.status === "approved" ? (
        <RequestSection title="Next step">
          <p className="text-base">
            When the money is sent to the member, record the payout.
          </p>
          <div>
            <Button
              className="h-12 w-full sm:w-auto"
              onClick={() =>
                void setParams({
                  projectFinancingRequestId: request.id,
                  projectFinancingSheetType: "disbursement",
                })
              }
              type="button"
            >
              Record payout
            </Button>
          </div>
        </RequestSection>
      ) : null}
    </div>
  )
}

function ProjectFinancingDecision({
  onClose,
  request,
}: {
  onClose: () => Promise<void>
  request: ProjectFinancingRequestRow
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
  const chargeOptions = useProjectFinancingCharges("approval")
  const { showError, showSuccess } = useNotifications()
  const [approvedAmount, setApprovedAmount] = useState(
    String(request.requestedAmount)
  )
  const [approvedStructure, setApprovedStructure] =
    useState<ProjectFinancingStructure>(
      request.proposedStructure === "undecided"
        ? "repayable_facility"
        : request.proposedStructure
    )
  const [approvedPaybackMonths, setApprovedPaybackMonths] = useState(
    approvedStructure === "repayable_facility" && request.requestedPaybackMonths
      ? String(request.requestedPaybackMonths)
      : ""
  )
  const amount = Number(approvedAmount)
  const canApprove =
    amount > 0 && monthsAreValid(approvedStructure, approvedPaybackMonths)

  async function decide(
    status: "approved" | "rejected" | "under_review",
    notes = ""
  ) {
    try {
      await reviewProjectFinancingRequestAction(
        objectToFormData({
          approvedAmount: status === "approved" ? approvedAmount : "",
          approvedPaybackMonths:
            status === "approved" ? approvedPaybackMonths : "",
          approvedStructure,
          notes,
          projectFinancingRequestId: request.id,
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
      await refreshProjectFinancing(onClose, request.id)
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
          basisAmount={amount || request.requestedAmount}
          charges={chargeOptions}
          title="Charges"
        />
      }
      approveFacts={[
        { label: "Business", value: request.businessName },
        { label: "Member", value: request.member.fullName },
        {
          label: "Amount",
          value: amountLine(
            amount,
            approvedStructure,
            Number(approvedPaybackMonths)
          ),
        },
        {
          label: "Paid back by",
          value: getProjectFinancingTypeLabel(approvedStructure),
        },
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
      <RequestField label="Approve amount (₦)">
        <Input
          inputMode="decimal"
          onChange={(event) => setApprovedAmount(event.target.value)}
          value={approvedAmount}
        />
      </RequestField>
      <RequestChoice
        label="How will the money come back?"
        onChange={(value) => {
          setApprovedStructure(value)
          if (value !== "repayable_facility") setApprovedPaybackMonths("")
        }}
        options={decidedTypeOptions}
        value={approvedStructure}
      />
      {approvedStructure === "repayable_facility" ? (
        <RequestField label="Pay back over (months)">
          <Input
            inputMode="numeric"
            onChange={(event) => setApprovedPaybackMonths(event.target.value)}
            value={approvedPaybackMonths}
          />
        </RequestField>
      ) : null}
      <WorkflowChargeSummary
        basisAmount={amount || request.requestedAmount}
        charges={chargeOptions}
        title="Charges on approval"
      />
    </RequestDecision>
  )
}

/** Record that the money was sent to the member. */
export function ProjectFinancingDisbursementContent({
  onClose,
  request,
}: {
  onClose: () => Promise<void>
  request: ProjectFinancingRequestRow
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [disbursedAt, setDisbursedAt] = useState(() => todayInputValue())
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const amount = request.approvedAmount ?? 0

  function recordDisbursement() {
    startTransition(async () => {
      try {
        await recordProjectFinancingDisbursementAction(
          objectToFormData({
            disbursedAt: disbursedAt || todayInputValue(),
            notes,
            projectFinancingRequestId: request.id,
            reference,
          })
        )
        setConfirmOpen(false)
        showSuccess("Payout recorded", "The member will see it.")
        await refreshProjectFinancing(onClose, request.id)
      } catch (error) {
        showError("Could not record the payout", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{ disbursedAt, notes, reference }}
        enabled={!isPending}
        isDirty={Boolean(reference || notes)}
        onFill={() => {
          setDisbursedAt(qaToday())
          setReference(createQaReference("PF"))
          setNotes("Release verified against the cooperative bank record.")
        }}
        restore={(draft) => {
          setDisbursedAt(draft.disbursedAt)
          setNotes(draft.notes)
          setReference(draft.reference)
        }}
      />
      <p className="text-base">
        {request.member.fullName} ·{" "}
        {amountLine(
          amount,
          request.approvedStructure,
          request.approvedPaybackMonths
        )}
      </p>
      <RequestField label="Date paid out">
        <Input
          disabled={isPending}
          onChange={(event) => setDisbursedAt(event.target.value)}
          type="date"
          value={disbursedAt}
        />
      </RequestField>
      <RequestField label="Bank or transfer reference" optional>
        <Input
          disabled={isPending}
          onChange={(event) => setReference(event.target.value)}
          value={reference}
        />
      </RequestField>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || !disbursedAt}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          Record payout
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel="Record payout"
        facts={[
          { label: "Business", value: request.businessName },
          { label: "Member", value: request.member.fullName },
          { label: "Amount", value: formatCurrency(amount) },
          { label: "Date paid out", value: formatDayMonthYear(disbursedAt) },
        ]}
        onConfirm={recordDisbursement}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title="Record this payout?"
      />
    </div>
  )
}
