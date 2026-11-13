"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { createQaReference, formatCurrency, qaToday } from "@halaalvest/utils"
import type {
  ProjectFinancingRequestRow,
  ProjectFinancingStructure,
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { MemberCombobox } from "@/components/member-combobox"
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
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { createQaProjectFinancingRequest } from "@/lib/dev-form-fill"
import { useTRPC } from "@/trpc/client"

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

function useRefreshProjectFinancing() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()

  return async (
    onClose: () => Promise<void>,
    projectFinancingRequestId?: string
  ) => {
    await onClose()

    const invalidations = [
      queryClient.invalidateQueries(
        trpc.projectFinancing.list.infiniteQueryFilter()
      ),
    ]

    if (projectFinancingRequestId) {
      invalidations.push(
        queryClient.invalidateQueries(
          trpc.projectFinancing.get.queryFilter({
            projectFinancingRequestId,
          })
        )
      )
    }

    await Promise.all(invalidations)
    router.refresh()
  }
}

export function ProjectFinancingRequestCreateContent({
  chargeOptions,
  onClose,
}: {
  chargeOptions: WorkflowChargeOption[]
  onClose: () => Promise<void>
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
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
  const requestedAmountValue = Number(requestedAmount)
  const requestedMonthsValue = Number(requestedPaybackMonths)
  const canSubmit =
    Boolean(memberId && businessName.trim()) &&
    requestedAmountValue > 0 &&
    (proposedStructure === "repayable_facility"
      ? Number.isInteger(requestedMonthsValue) && requestedMonthsValue > 0
      : requestedPaybackMonths === "")

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
        showSuccess(
          "Project financing request saved",
          "Request is pending review."
        )
        await refreshProjectFinancing(onClose)
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
      <DashboardStateQuickFill
        className="mb-3"
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
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Member">
          <MemberCombobox
            disabled={isPending}
            onValueChange={setMemberId}
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
            onValueChange={(value) => {
              const structure = value as ProjectFinancingStructure
              setProposedStructure(structure)
              if (structure !== "repayable_facility") {
                setRequestedPaybackMonths("")
              }
            }}
            options={structureOptions}
            value={proposedStructure}
          />
        </Field>
        <Field label="Payback months">
          <Input
            disabled={isPending || proposedStructure !== "repayable_facility"}
            inputMode="numeric"
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
            placeholder={
              proposedStructure === "repayable_facility"
                ? "Required for repayable facilities"
                : "Not applicable"
            }
            value={requestedPaybackMonths}
          />
        </Field>
        <Field className="md:col-span-2" label="Purpose">
          <Textarea
            disabled={isPending}
            onChange={(event) => setProjectPurpose(event.target.value)}
            value={projectPurpose}
          />
        </Field>
        <Field className="md:col-span-2" label="Description">
          <Textarea
            disabled={isPending}
            onChange={(event) => setBusinessDescription(event.target.value)}
            value={businessDescription}
          />
        </Field>
        <div className="md:col-span-2">
          <WorkflowChargeSummary
            basisAmount={Number(requestedAmount) || 0}
            charges={chargeOptions}
            title="Submission charges"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          disabled={isPending || !canSubmit}
          onClick={submitRequest}
          type="button"
        >
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
  onClose: () => Promise<void>
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [businessName, setBusinessName] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [proposedStructure, setProposedStructure] =
    useState<ProjectFinancingStructure>("undecided")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("")
  const requestedAmountValue = Number(requestedAmount)
  const requestedMonthsValue = Number(requestedPaybackMonths)
  const canSubmit =
    Boolean(businessName.trim()) &&
    requestedAmountValue > 0 &&
    (proposedStructure === "repayable_facility"
      ? Number.isInteger(requestedMonthsValue) && requestedMonthsValue > 0
      : requestedPaybackMonths === "")

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
        showSuccess(
          "Project financing request sent",
          "Request is pending review."
        )
        await refreshProjectFinancing(onClose)
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
      <DashboardStateQuickFill
        className="mb-3"
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
      <div className="grid gap-3 md:grid-cols-2">
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
            onValueChange={(value) => {
              const structure = value as ProjectFinancingStructure
              setProposedStructure(structure)
              if (structure !== "repayable_facility") {
                setRequestedPaybackMonths("")
              }
            }}
            options={structureOptions}
            value={proposedStructure}
          />
        </Field>
        <Field label="Payback months">
          <Input
            disabled={isPending || proposedStructure !== "repayable_facility"}
            inputMode="numeric"
            onChange={(event) => setRequestedPaybackMonths(event.target.value)}
            placeholder={
              proposedStructure === "repayable_facility"
                ? "Required for repayable facilities"
                : "Not applicable"
            }
            value={requestedPaybackMonths}
          />
        </Field>
        <Field className="md:col-span-2" label="Purpose">
          <Textarea
            disabled={isPending}
            onChange={(event) => setProjectPurpose(event.target.value)}
            value={projectPurpose}
          />
        </Field>
        <Field className="md:col-span-2" label="Description">
          <Textarea
            disabled={isPending}
            onChange={(event) => setBusinessDescription(event.target.value)}
            value={businessDescription}
          />
        </Field>
        <div className="md:col-span-2">
          <WorkflowChargeSummary
            basisAmount={Number(requestedAmount) || 0}
            charges={chargeOptions}
            title="Applicable charges"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          disabled={isPending || !canSubmit}
          onClick={submitRequest}
          type="button"
        >
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
  onClose: () => Promise<void>
  request: ProjectFinancingRequestRow
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [approvedAmount, setApprovedAmount] = useState("")
  const [approvedPaybackMonths, setApprovedPaybackMonths] = useState("")
  const [approvedStructure, setApprovedStructure] = useState(
    defaultReviewStructure(request)
  )
  const [notes, setNotes] = useState("")
  const effectiveApprovedAmount =
    Number(approvedAmount) || request.requestedAmount
  const effectiveApprovedMonths =
    Number(approvedPaybackMonths) || request.requestedPaybackMonths || 0
  const canApprove =
    approvedStructure !== "undecided" &&
    effectiveApprovedAmount > 0 &&
    (approvedStructure === "repayable_facility"
      ? Number.isInteger(effectiveApprovedMonths) && effectiveApprovedMonths > 0
      : approvedPaybackMonths === "")

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
        await refreshProjectFinancing(onClose, request.id)
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
      <DashboardStateQuickFill
        draft={{ approvedAmount, approvedPaybackMonths, notes }}
        enabled={!isPending}
        isDirty={Boolean(approvedAmount || approvedPaybackMonths || notes)}
        onFill={() => {
          setApprovedAmount(String(request.requestedAmount))
          setApprovedPaybackMonths(String(request.requestedPaybackMonths))
          setNotes(
            "Approved within the committee decision and affordability evidence."
          )
        }}
        restore={(draft) => {
          setApprovedAmount(draft.approvedAmount)
          setApprovedPaybackMonths(draft.approvedPaybackMonths)
          setNotes(draft.notes)
        }}
      />
      <section className="border-y border-border py-4">
        <p className="font-medium text-foreground">{request.businessName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {request.member.fullName} · Requested{" "}
          {formatCurrency(request.requestedAmount)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          Proposed {formatProjectFinancingStructure(request.proposedStructure)}
        </p>
      </section>
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
            disabled={isPending || approvedStructure !== "repayable_facility"}
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
          onValueChange={(value) => {
            const structure = value as ProjectFinancingStructure
            setApprovedStructure(structure)
            if (structure !== "repayable_facility") {
              setApprovedPaybackMonths("")
            }
          }}
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
      <div className="grid gap-2 sm:grid-cols-3">
        {request.status === "submitted" ? (
          <Button
            className="h-11 w-full md:h-9"
            disabled={isPending}
            onClick={() => reviewRequest("under_review")}
            type="button"
            variant="outline"
          >
            Mark under review
          </Button>
        ) : null}
        <Button
          className="h-11 w-full md:h-9"
          disabled={isPending || !canApprove}
          onClick={() => reviewRequest("approved")}
          type="button"
        >
          Approve
        </Button>
        <Button
          className="h-11 w-full md:h-9"
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
  onClose: () => Promise<void>
  request: ProjectFinancingRequestRow
}) {
  const refreshProjectFinancing = useRefreshProjectFinancing()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [disbursedAt, setDisbursedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
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
        await refreshProjectFinancing(onClose, request.id)
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
      <DashboardStateQuickFill
        className="mb-3"
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
      <section className="mb-4 border-y border-border py-4">
        <p className="font-medium text-foreground">{request.businessName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved {formatCurrency(request.approvedAmount ?? 0)} ·{" "}
          {formatProjectFinancingStructure(request.approvedStructure)}
        </p>
      </section>
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
          className="h-11 w-full md:h-9 md:w-auto"
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

function formatProjectFinancingDate(value: Date | string | null) {
  if (!value) return "Not recorded"

  return new Date(value).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatProjectFinancingStructure(
  value: ProjectFinancingStructure | null
) {
  return value ? value.replaceAll("_", " ") : "Not set"
}

export function ProjectFinancingRequestDetailsContent({
  request,
}: {
  request: ProjectFinancingRequestRow
}) {
  const approvedAmount = request.approvedAmount ?? 0
  const paidAmount = request.paidAmount ?? 0
  const outstandingAmount = Math.max(0, approvedAmount - paidAmount)

  return (
    <div className="space-y-6">
      <section className="border-y border-border py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {request.businessName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.member.fullName} · {request.member.memberNumber}
            </p>
          </div>
          <span className="border border-border px-2 py-1 text-xs capitalize">
            {request.status.replaceAll("_", " ")}
          </span>
        </div>
        {request.businessDescription ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {request.businessDescription}
          </p>
        ) : null}
      </section>

      <DetailsSection title="Request">
        <DetailsGrid>
          <Detail
            label="Requested amount"
            value={formatCurrency(request.requestedAmount)}
          />
          <Detail
            label="Proposed structure"
            value={formatProjectFinancingStructure(request.proposedStructure)}
          />
          <Detail
            label="Payback term"
            value={
              request.requestedPaybackMonths
                ? `${request.requestedPaybackMonths} months`
                : "Not proposed"
            }
          />
          <Detail
            label="Requested on"
            value={formatProjectFinancingDate(request.requestedAt)}
          />
        </DetailsGrid>
        {request.projectPurpose ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Purpose: {request.projectPurpose}
          </p>
        ) : null}
      </DetailsSection>

      <DetailsSection title="Review and approval">
        <DetailsGrid>
          <Detail
            label="Approved amount"
            value={
              request.approvedAmount
                ? formatCurrency(request.approvedAmount)
                : "Not approved"
            }
          />
          <Detail
            label="Approved structure"
            value={formatProjectFinancingStructure(request.approvedStructure)}
          />
          <Detail
            label="Approved payback"
            value={
              request.approvedPaybackMonths
                ? `${request.approvedPaybackMonths} months`
                : "Not applicable"
            }
          />
          <Detail
            label="Monthly payback"
            value={
              request.approvedMonthlyPayback
                ? formatCurrency(request.approvedMonthlyPayback)
                : "Not applicable"
            }
          />
          <Detail
            label="Reviewed on"
            value={formatProjectFinancingDate(request.reviewedAt)}
          />
          <Detail
            label="Reviewed by"
            value={request.reviewedByUser?.fullName ?? "Not reviewed"}
          />
        </DetailsGrid>
        {request.reviewNotes ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Review note: {request.reviewNotes}
          </p>
        ) : null}
      </DetailsSection>

      <DetailsSection title="Funding evidence">
        <DetailsGrid>
          <Detail
            label="Disbursed on"
            value={formatProjectFinancingDate(request.disbursedAt)}
          />
          <Detail
            label="Reference"
            value={request.disbursementReference ?? "Not recorded"}
          />
          <Detail
            label="Disbursed by"
            value={request.disbursedByUser?.fullName ?? "Not recorded"}
          />
        </DetailsGrid>
        {request.disbursementNotes ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {request.disbursementNotes}
          </p>
        ) : null}
      </DetailsSection>

      <DetailsSection title="Payment evidence">
        {request.approvedStructure === "repayable_facility" ? (
          <DetailsGrid>
            <Detail label="Paid" value={formatCurrency(paidAmount)} />
            <Detail
              label="Outstanding"
              value={formatCurrency(outstandingAmount)}
            />
            <Detail
              label="Last payment"
              value={formatProjectFinancingDate(request.paidAt)}
            />
          </DetailsGrid>
        ) : (
          <p className="border-y border-border py-4 text-sm text-muted-foreground">
            Payment posting is not enabled for partnership or profit-sharing
            structures.
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
