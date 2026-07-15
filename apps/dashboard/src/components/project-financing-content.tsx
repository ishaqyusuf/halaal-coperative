"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import type {
  ProjectFinancingRequestRow,
  ProjectFinancingStructure,
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  WorkflowChargeSummary,
  type WorkflowChargeOption,
} from "@/components/workflow-charge-summary"
import {
  createOwnProjectFinancingRequestAction,
  createProjectFinancingRequestAction,
  recordProjectFinancingDisbursementAction,
  reviewProjectFinancingRequestAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

export type ProjectFinancingMemberOption = {
  id: string
  label: string
}

const structureOptions: {
  label: string
  value: ProjectFinancingStructure
}[] = [
  { label: "Undecided", value: "undecided" },
  { label: "Repayable facility", value: "repayable_facility" },
  { label: "Investment partnership", value: "investment_partnership" },
  { label: "Profit sharing", value: "profit_sharing" },
]

function defaultReviewStructure(
  request: ProjectFinancingRequestRow
): ProjectFinancingStructure {
  return (
    request.approvedStructure ??
    (request.proposedStructure === "undecided"
      ? "repayable_facility"
      : request.proposedStructure)
  )
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

export function ProjectFinancingRequestCreateContent({
  chargeOptions,
  memberOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  memberOptions: ProjectFinancingMemberOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [proposedStructure, setProposedStructure] =
    useState<ProjectFinancingStructure>("undecided")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("")
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
        await createProjectFinancingRequestAction(
          objectToFormData({
            businessDescription,
            businessName,
            memberId,
            projectPurpose,
            proposedStructure,
            requestedAmount,
            requestedPaybackMonths,
          })
        )
        setBusinessDescription("")
        setBusinessName("")
        setMemberId("")
        setProjectPurpose("")
        setProposedStructure("undecided")
        setRequestedAmount("")
        setRequestedPaybackMonths("")
        onClose()
        showSuccess(
          "Project financing request saved",
          "Request is pending review."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save project financing request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Member">
          <LabeledSelectInput
            disabled={isPending}
            onValueChange={setMemberId}
            options={memberSelectOptions}
            value={memberId}
          />
        </Field>
        <Field label="Business">
          <Input
            disabled={isPending}
            onChange={(event) => setBusinessName(event.target.value)}
            value={businessName}
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
        <Field label="Proposed structure">
          <LabeledSelectInput
            disabled={isPending}
            onValueChange={(value) =>
              setProposedStructure(value as ProjectFinancingStructure)
            }
            options={structureOptions}
            value={proposedStructure}
          />
        </Field>
        <Field label="Payback months">
          <Input
            disabled={isPending}
            inputMode="numeric"
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
            value={requestedPaybackMonths}
          />
        </Field>
        <Field className="md:col-span-2 xl:col-span-3" label="Purpose">
          <Textarea
            disabled={isPending}
            onChange={(event) => setProjectPurpose(event.target.value)}
            value={projectPurpose}
          />
        </Field>
        <Field className="md:col-span-2 xl:col-span-4" label="Description">
          <Textarea
            disabled={isPending}
            onChange={(event) => setBusinessDescription(event.target.value)}
            value={businessDescription}
          />
        </Field>
        <div className="md:col-span-2 xl:col-span-4">
          <WorkflowChargeSummary
            basisAmount={Number(requestedAmount) || 0}
            charges={chargeOptions}
            title="Submission charges"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button disabled={isPending} onClick={submitRequest} type="button">
          Save request
        </Button>
      </div>
    </>
  )
}

export function MemberProjectFinancingRequestCreateContent({
  chargeOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [businessName, setBusinessName] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [proposedStructure, setProposedStructure] =
    useState<ProjectFinancingStructure>("undecided")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("")

  function submitRequest() {
    startTransition(async () => {
      try {
        await createOwnProjectFinancingRequestAction(
          objectToFormData({
            businessDescription,
            businessName,
            projectPurpose,
            proposedStructure,
            requestedAmount,
            requestedPaybackMonths,
          })
        )
        setBusinessDescription("")
        setBusinessName("")
        setProjectPurpose("")
        setProposedStructure("undecided")
        setRequestedAmount("")
        setRequestedPaybackMonths("")
        onClose()
        showSuccess(
          "Project financing request sent",
          "Request is pending review."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not send project financing request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Business">
          <Input
            disabled={isPending}
            onChange={(event) => setBusinessName(event.target.value)}
            value={businessName}
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
        <Field label="Proposed structure">
          <LabeledSelectInput
            disabled={isPending}
            onValueChange={(value) =>
              setProposedStructure(value as ProjectFinancingStructure)
            }
            options={structureOptions}
            value={proposedStructure}
          />
        </Field>
        <Field label="Payback months">
          <Input
            disabled={isPending}
            inputMode="numeric"
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
            value={requestedPaybackMonths}
          />
        </Field>
        <Field className="md:col-span-2 xl:col-span-4" label="Purpose">
          <Textarea
            disabled={isPending}
            onChange={(event) => setProjectPurpose(event.target.value)}
            value={projectPurpose}
          />
        </Field>
        <Field className="md:col-span-2 xl:col-span-4" label="Description">
          <Textarea
            disabled={isPending}
            onChange={(event) => setBusinessDescription(event.target.value)}
            value={businessDescription}
          />
        </Field>
        <div className="md:col-span-2 xl:col-span-4">
          <WorkflowChargeSummary
            basisAmount={Number(requestedAmount) || 0}
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
    </>
  )
}

export function ProjectFinancingReviewContent({
  chargeOptions,
  onClose,
  request,
}: {
  chargeOptions: WorkflowChargeOption[]
  onClose: () => void
  request: ProjectFinancingRequestRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [approvedAmount, setApprovedAmount] = useState("")
  const [approvedPaybackMonths, setApprovedPaybackMonths] = useState("")
  const [approvedStructure, setApprovedStructure] = useState(
    defaultReviewStructure(request)
  )
  const [notes, setNotes] = useState("")

  function reviewRequest(status: "approved" | "rejected" | "under_review") {
    startTransition(async () => {
      try {
        await reviewProjectFinancingRequestAction(
          objectToFormData({
            approvedAmount,
            approvedPaybackMonths,
            approvedStructure,
            notes,
            projectFinancingRequestId: request.id,
            status,
          })
        )
        showSuccess(
          "Project financing review saved",
          `Request marked ${status.replace(/_/g, " ")}.`
        )
        onClose()
        router.refresh()
      } catch (error) {
        showError(
          "Could not save project financing review",
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
            placeholder={`${request.requestedAmount}`}
            value={approvedAmount}
          />
        </Field>
        <Field label="Payback months">
          <Input
            disabled={isPending}
            inputMode="numeric"
            onChange={(event) => setApprovedPaybackMonths(event.target.value)}
            placeholder={
              request.requestedPaybackMonths
                ? `${request.requestedPaybackMonths}`
                : "Payback months"
            }
            value={approvedPaybackMonths}
          />
        </Field>
      </div>
      <Field label="Approved structure">
        <LabeledSelectInput
          disabled={isPending}
          onValueChange={(value) =>
            setApprovedStructure(value as ProjectFinancingStructure)
          }
          options={structureOptions}
          value={approvedStructure}
        />
      </Field>
      <Field label="Review note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </Field>
      <WorkflowChargeSummary
        basisAmount={Number(approvedAmount) || request.requestedAmount}
        charges={chargeOptions}
        title="Approval charges"
      />
      <div className="flex flex-wrap gap-2">
        {request.status === "submitted" ? (
          <Button
            disabled={isPending}
            onClick={() => reviewRequest("under_review")}
            type="button"
            variant="outline"
          >
            Mark under review
          </Button>
        ) : null}
        <Button
          disabled={isPending}
          onClick={() => reviewRequest("approved")}
          type="button"
        >
          Approve
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewRequest("rejected")}
          type="button"
          variant="outline"
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

export function ProjectFinancingDisbursementContent({
  onClose,
  request,
}: {
  onClose: () => void
  request: ProjectFinancingRequestRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [disbursedAt, setDisbursedAt] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  function recordDisbursement() {
    startTransition(async () => {
      try {
        await recordProjectFinancingDisbursementAction(
          objectToFormData({
            disbursedAt: disbursedAt || new Date().toISOString().slice(0, 10),
            notes,
            projectFinancingRequestId: request.id,
            reference,
          })
        )
        showSuccess(
          "Project financing disbursed",
          "Funding evidence was recorded."
        )
        onClose()
        router.refresh()
      } catch (error) {
        showError(
          "Could not record disbursement",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Disbursed at">
          <Input
            disabled={isPending}
            onChange={(event) => setDisbursedAt(event.target.value)}
            type="date"
            value={disbursedAt}
          />
        </Field>
        <Field label="Reference">
          <Input
            disabled={isPending}
            onChange={(event) => setReference(event.target.value)}
            value={reference}
          />
        </Field>
        <Field className="sm:col-span-2" label="Note">
          <Textarea
            disabled={isPending}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button
          disabled={isPending}
          onClick={recordDisbursement}
          type="button"
        >
          Record disbursement
        </Button>
      </div>
    </>
  )
}
