"use client"

import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import type {
  ProjectFinancingRequestRow,
  ProjectFinancingStructure,
  ProjectFinancingSummary,
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

type Option = {
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

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatStructure(value: ProjectFinancingStructure | null) {
  if (!value) return "Not set"

  return value.replace(/_/g, " ")
}

function defaultReviewStructure(
  request: ProjectFinancingRequestRow
): ProjectFinancingStructure {
  const structure =
    request.approvedStructure ??
    (request.proposedStructure === "undecided"
      ? "repayable_facility"
      : request.proposedStructure)

  return structure
}

function statusTone(status: ProjectFinancingRequestRow["status"]) {
  if (status === "approved" || status === "active" || status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function repaymentEvidenceText(request: ProjectFinancingRequestRow) {
  if (
    request.approvedStructure !== "repayable_facility" ||
    !request.approvedAmount
  ) {
    return null
  }

  const outstandingAmount = Math.max(
    request.approvedAmount - request.paidAmount,
    0
  )
  const base = `Paid ${formatCurrency(
    request.paidAmount
  )}, outstanding ${formatCurrency(outstandingAmount)}`

  return request.paidAt
    ? `${base} · completed ${formatDate(request.paidAt)}`
    : base
}

function disbursementEvidenceText(request: ProjectFinancingRequestRow) {
  if (!request.disbursedAt) {
    return null
  }

  const parts = [
    `Disbursed ${formatDate(request.disbursedAt)}`,
    request.disbursementReference
      ? `ref ${request.disbursementReference}`
      : null,
    request.disbursedByUser ? `by ${request.disbursedByUser.fullName}` : null,
  ].filter(Boolean)

  return parts.join(" · ")
}

export function ProjectFinancingRequestsView({
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
  requests: ProjectFinancingRequestRow[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: ProjectFinancingSummary
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
  const [approvedAmountById, setApprovedAmountById] = useState<
    Record<string, string>
  >({})
  const [approvedMonthsById, setApprovedMonthsById] = useState<
    Record<string, string>
  >({})
  const [approvedStructureById, setApprovedStructureById] = useState<
    Record<string, ProjectFinancingStructure>
  >({})
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [disbursedAtById, setDisbursedAtById] = useState<
    Record<string, string>
  >({})
  const [disbursementReferenceById, setDisbursementReferenceById] = useState<
    Record<string, string>
  >({})
  const [disbursementNotesById, setDisbursementNotesById] = useState<
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
        router.refresh()
      } catch (error) {
        showError(
          "Could not save project financing request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function reviewRequest(
    request: ProjectFinancingRequestRow,
    status: "approved" | "rejected" | "under_review"
  ) {
    startTransition(async () => {
      try {
        const approvedStructure =
          approvedStructureById[request.id] ?? defaultReviewStructure(request)

        await reviewProjectFinancingRequestAction(
          objectToFormData({
            approvedAmount: approvedAmountById[request.id] ?? "",
            approvedPaybackMonths: approvedMonthsById[request.id] ?? "",
            approvedStructure,
            notes: notesById[request.id] ?? "",
            projectFinancingRequestId: request.id,
            status,
          })
        )
        showSuccess(
          "Project financing review saved",
          `Request marked ${status.replace(/_/g, " ")}.`
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not save project financing review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function recordDisbursement(request: ProjectFinancingRequestRow) {
    startTransition(async () => {
      try {
        await recordProjectFinancingDisbursementAction(
          objectToFormData({
            disbursedAt:
              disbursedAtById[request.id] ??
              new Date().toISOString().slice(0, 10),
            notes: disbursementNotesById[request.id] ?? "",
            projectFinancingRequestId: request.id,
            reference: disbursementReferenceById[request.id] ?? "",
          })
        )
        showSuccess(
          "Project financing disbursed",
          "Funding evidence was recorded."
        )
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
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingRequests} />
        <SummaryTile label="Approved" value={summary.approvedRequests} />
        <SummaryTile
          label="Requested value"
          value={formatCurrency(summary.totalRequestedAmount)}
        />
        <SummaryTile
          label="Approved value"
          value={formatCurrency(summary.totalApprovedAmount)}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              New project financing request
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Capture the member business, requested amount, and proposed
              structure for finance review.
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
              onChange={(event) =>
                setRequestedPaybackMonths(event.target.value)
              }
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
          requests.map((request) => {
            const approvedStructure =
              approvedStructureById[request.id] ??
              defaultReviewStructure(request)

            return (
              <article
                className="rounded-lg border border-border bg-card p-4"
                key={request.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {request.businessName}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(request.status)}`}
                      >
                        {request.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.member.fullName} · requested{" "}
                      {formatCurrency(request.requestedAmount)} ·{" "}
                      {formatStructure(request.proposedStructure)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested {formatDate(request.requestedAt)} by{" "}
                      {request.createdByUser.fullName}
                      {request.requestedPaybackMonths
                        ? ` · ${request.requestedPaybackMonths} months`
                        : ""}
                      {request.estimatedMonthlyPayback
                        ? ` · ${formatCurrency(request.estimatedMonthlyPayback)} monthly`
                        : ""}
                    </p>
                    {request.projectPurpose ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {request.projectPurpose}
                      </p>
                    ) : null}
                    {request.businessDescription ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {request.businessDescription}
                      </p>
                    ) : null}
                    {request.approvedAmount ? (
                      <p className="mt-2 text-sm text-foreground">
                        Approved {formatCurrency(request.approvedAmount)} ·{" "}
                        {formatStructure(request.approvedStructure)}
                        {request.approvedPaybackMonths
                          ? ` · ${request.approvedPaybackMonths} months`
                          : ""}
                        {request.approvedMonthlyPayback
                          ? ` · ${formatCurrency(request.approvedMonthlyPayback)} monthly`
                          : ""}
                      </p>
                    ) : null}
                    {repaymentEvidenceText(request) ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {repaymentEvidenceText(request)}
                      </p>
                    ) : null}
                    {disbursementEvidenceText(request) ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {disbursementEvidenceText(request)}
                      </p>
                    ) : null}
                    {request.disbursementNotes ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {request.disbursementNotes}
                      </p>
                    ) : null}
                    {request.reviewNotes ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {request.reviewNotes}
                      </p>
                    ) : null}
                  </div>

                  {canReview &&
                  ["submitted", "under_review"].includes(request.status) ? (
                    <div className="w-full space-y-2 md:w-[420px]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          disabled={isPending}
                          inputMode="decimal"
                          onChange={(event) =>
                            setApprovedAmountById((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          placeholder={`Amount ${request.requestedAmount}`}
                          value={approvedAmountById[request.id] ?? ""}
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
                          placeholder={
                            request.requestedPaybackMonths
                              ? `Months ${request.requestedPaybackMonths}`
                              : "Payback months"
                          }
                          value={approvedMonthsById[request.id] ?? ""}
                        />
                      </div>
                      <LabeledSelectInput
                        disabled={isPending}
                        onValueChange={(value) =>
                          setApprovedStructureById((current) => ({
                            ...current,
                            [request.id]: value as ProjectFinancingStructure,
                          }))
                        }
                        options={structureOptions}
                        value={approvedStructure}
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
                      <WorkflowChargeSummary
                        basisAmount={
                          Number(approvedAmountById[request.id]) ||
                          request.requestedAmount
                        }
                        charges={approvalChargeOptions}
                        title="Approval charges"
                      />
                      <div className="flex flex-wrap gap-2">
                        {request.status === "submitted" ? (
                          <Button
                            disabled={isPending}
                            onClick={() =>
                              reviewRequest(request, "under_review")
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
                  ) : null}

                  {canReview && request.status === "approved" ? (
                    <div className="w-full space-y-2 md:w-[420px]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          disabled={isPending}
                          onChange={(event) =>
                            setDisbursedAtById((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          type="date"
                          value={disbursedAtById[request.id] ?? ""}
                        />
                        <Input
                          disabled={isPending}
                          onChange={(event) =>
                            setDisbursementReferenceById((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          placeholder="Disbursement reference"
                          value={disbursementReferenceById[request.id] ?? ""}
                        />
                      </div>
                      <Input
                        disabled={isPending}
                        onChange={(event) =>
                          setDisbursementNotesById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Disbursement note"
                        value={disbursementNotesById[request.id] ?? ""}
                      />
                      <Button
                        disabled={isPending}
                        onClick={() => recordDisbursement(request)}
                        size="sm"
                        type="button"
                      >
                        Record disbursement
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-medium text-foreground">
              No project financing requests yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Member business funding requests will appear here for review.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export function MemberProjectFinancingRequestsView({
  chargeOptions,
  member,
  requests,
}: {
  chargeOptions: WorkflowChargeOption[]
  member: {
    fullName: string
    memberNumber: string
  }
  requests: ProjectFinancingRequestRow[]
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
  const pendingRequests = requests.filter((request) =>
    ["submitted", "under_review"].includes(request.status)
  )
  const approvedRequests = requests.filter((request) =>
    ["approved", "active", "completed"].includes(request.status)
  )

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
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Pending" value={pendingRequests.length} />
        <SummaryTile label="Approved" value={approvedRequests.length} />
        <SummaryTile label="Total requests" value={requests.length} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Request business funding
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              onChange={(event) =>
                setRequestedPaybackMonths(event.target.value)
              }
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
                      {request.businessName}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(request.status)}`}
                    >
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Requested {formatCurrency(request.requestedAmount)} ·{" "}
                    {formatStructure(request.proposedStructure)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {formatDate(request.requestedAt)}
                    {request.requestedPaybackMonths
                      ? ` · ${request.requestedPaybackMonths} months`
                      : ""}
                    {request.estimatedMonthlyPayback
                      ? ` · ${formatCurrency(request.estimatedMonthlyPayback)} monthly`
                      : ""}
                  </p>
                  {request.projectPurpose ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {request.projectPurpose}
                    </p>
                  ) : null}
                  {request.businessDescription ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {request.businessDescription}
                    </p>
                  ) : null}
                  {request.approvedAmount ? (
                    <p className="mt-2 text-sm text-foreground">
                      Approved {formatCurrency(request.approvedAmount)} ·{" "}
                      {formatStructure(request.approvedStructure)}
                      {request.approvedPaybackMonths
                        ? ` · ${request.approvedPaybackMonths} months`
                        : ""}
                      {request.approvedMonthlyPayback
                        ? ` · ${formatCurrency(request.approvedMonthlyPayback)} monthly`
                        : ""}
                    </p>
                  ) : null}
                  {repaymentEvidenceText(request) ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {repaymentEvidenceText(request)}
                    </p>
                  ) : null}
                  {disbursementEvidenceText(request) ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {disbursementEvidenceText(request)}
                    </p>
                  ) : null}
                  {request.disbursementNotes ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.disbursementNotes}
                    </p>
                  ) : null}
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
              No project financing requests yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Business funding requests you submit will appear here.
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
