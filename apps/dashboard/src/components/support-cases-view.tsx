"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import type {
  SupportCaseCategory,
  SupportCasePriority,
  SupportCaseRow,
  SupportCaseStatus,
  SupportCaseSummary,
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  addMemberSupportCaseMessageAction,
  addSupportCaseMessageAction,
  createMemberSupportCaseAction,
  createSupportCaseAction,
  reviewSupportCaseFinancialAdjustmentAction,
  updateSupportCaseStatusAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

type Option = {
  id: string
  label: string
}

const categoryOptions: Array<{ label: string; value: SupportCaseCategory }> = [
  { label: "Payment issue", value: "payment_issue" },
  { label: "Account update", value: "account_update" },
  { label: "Shares", value: "shares" },
  { label: "Financing", value: "financing" },
  { label: "Procurement", value: "procurement" },
  { label: "Feature request", value: "feature_request" },
  { label: "Technical", value: "technical" },
  { label: "Other", value: "other" },
]

const priorityOptions: Array<{ label: string; value: SupportCasePriority }> = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]

const statusOptions: Array<{ label: string; value: SupportCaseStatus }> = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Waiting on member", value: "waiting_on_member" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
]

function labelFromValue(value: string) {
  return value.replace(/_/g, " ")
}

function statusTone(status: SupportCaseStatus) {
  if (status === "resolved" || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "waiting_on_member") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-sky-200 bg-sky-50 text-sky-700"
}

function financialAdjustmentApprovalLabel(
  status: SupportCaseRow["financialAdjustmentApprovalStatus"]
) {
  if (status === "approved") return "Approved"
  if (status === "rejected") return "Rejected"
  if (status === "pending") return "Needs review"

  return "Not required"
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function linkedRecordLabel(supportCase: SupportCaseRow) {
  if (!supportCase.linkedRecordId || !supportCase.linkedRecordType) {
    return null
  }

  const label =
    supportCase.linkedRecordType === "receipt"
      ? "Receipt"
      : labelFromValue(supportCase.linkedRecordType)

  return `${label} ${supportCase.linkedRecordId.slice(0, 8)}`
}

export function SupportCasesView({
  assignees,
  canReviewFinancialAdjustments = false,
  cases,
  memberOptions,
  summary,
}: {
  assignees: Option[]
  canReviewFinancialAdjustments?: boolean
  cases: SupportCaseRow[]
  memberOptions: Option[]
  summary: SupportCaseSummary
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [assignedToUserId, setAssignedToUserId] = useState("")
  const [category, setCategory] =
    useState<SupportCaseCategory>("payment_issue")
  const [priority, setPriority] = useState<SupportCasePriority>("normal")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [moneyImpactRequested, setMoneyImpactRequested] = useState(false)
  const [messageByCaseId, setMessageByCaseId] = useState<
    Record<string, string>
  >({})
  const [resolutionByCaseId, setResolutionByCaseId] = useState<
    Record<string, string>
  >({})
  const [requiresAdjustmentByCaseId, setRequiresAdjustmentByCaseId] = useState<
    Record<string, boolean>
  >({})
  const [adjustmentApprovalNotesByCaseId, setAdjustmentApprovalNotesByCaseId] =
    useState<Record<string, string>>({})
  const [statusByCaseId, setStatusByCaseId] = useState<
    Record<string, SupportCaseStatus>
  >({})
  const [priorityByCaseId, setPriorityByCaseId] = useState<
    Record<string, SupportCasePriority>
  >({})
  const [assigneeByCaseId, setAssigneeByCaseId] = useState<
    Record<string, string>
  >({})
  const memberSelectOptions = useMemo(
    () => [
      { label: "No member link", value: "" },
      ...memberOptions.map((member) => ({
        label: member.label,
        value: member.id,
      })),
    ],
    [memberOptions]
  )
  const assigneeOptions = useMemo(
    () => [
      { label: "Unassigned", value: "" },
      ...assignees.map((assignee) => ({
        label: assignee.label,
        value: assignee.id,
      })),
    ],
    [assignees]
  )

  function createCase() {
    startTransition(async () => {
      try {
        await createSupportCaseAction(
          objectToFormData({
            assignedToUserId,
            attachmentUrl,
            category,
            description,
            memberId,
            moneyImpactRequested,
            priority,
            subject,
          })
        )
        setAssignedToUserId("")
        setAttachmentUrl("")
        setDescription("")
        setMemberId("")
        setMoneyImpactRequested(false)
        setPriority("normal")
        setSubject("")
        showSuccess("Case opened", "Support case is now tracked.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not open case",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function addMessage(supportCase: SupportCaseRow) {
    startTransition(async () => {
      try {
        await addSupportCaseMessageAction(
          objectToFormData({
            message: messageByCaseId[supportCase.id] ?? "",
            supportCaseId: supportCase.id,
          })
        )
        setMessageByCaseId((current) => {
          const next = { ...current }
          delete next[supportCase.id]
          return next
        })
        showSuccess("Reply saved", "Support case message was recorded.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not save reply",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function updateCase(supportCase: SupportCaseRow) {
    const nextStatus = statusByCaseId[supportCase.id] ?? supportCase.status
    const nextPriority =
      priorityByCaseId[supportCase.id] ?? supportCase.priority
    const nextAssignee =
      assigneeByCaseId[supportCase.id] ?? supportCase.assignedToUserId ?? ""

    startTransition(async () => {
      try {
        await updateSupportCaseStatusAction(
          objectToFormData({
            assignedToUserId: nextAssignee,
            priority: nextPriority,
            requiresFinancialAdjustment:
              requiresAdjustmentByCaseId[supportCase.id] ??
              supportCase.requiresFinancialAdjustment,
            resolutionSummary: resolutionByCaseId[supportCase.id] ?? "",
            status: nextStatus,
            supportCaseId: supportCase.id,
          })
        )
        showSuccess("Case updated", "Support status was recorded.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not update case",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function reviewFinancialAdjustment(
    supportCase: SupportCaseRow,
    approvalStatus: "approved" | "rejected"
  ) {
    startTransition(async () => {
      try {
        await reviewSupportCaseFinancialAdjustmentAction(
          objectToFormData({
            approvalNotes:
              adjustmentApprovalNotesByCaseId[supportCase.id] ?? "",
            approvalStatus,
            supportCaseId: supportCase.id,
          })
        )
        setAdjustmentApprovalNotesByCaseId((current) => {
          const next = { ...current }
          delete next[supportCase.id]
          return next
        })
        showSuccess(
          "Adjustment reviewed",
          `Financial adjustment was ${labelFromValue(approvalStatus)}.`
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not review adjustment",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        <SummaryTile label="Open" value={summary.openCases} />
        <SummaryTile
          label="Feature requests"
          value={summary.featureRequestOpenCases}
        />
        <SummaryTile label="High priority" value={summary.highPriorityOpenCases} />
        <SummaryTile label="Urgent" value={summary.urgentOpenCases} />
        <SummaryTile label="Resolved" value={summary.closedCases} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Open support case
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Track member issues, payment questions, account corrections, and
              feature requests before any finance adjustment or product follow
              up is requested.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Subject">
            <Input
              disabled={isPending}
              onChange={(event) => setSubject(event.target.value)}
              value={subject}
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
          <Field label="Category">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={(value) =>
                setCategory(value as SupportCaseCategory)
              }
              options={categoryOptions}
              value={category}
            />
          </Field>
          <Field label="Priority">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={(value) => setPriority(value as SupportCasePriority)}
              options={priorityOptions}
              value={priority}
            />
          </Field>
          <Field label="Assignee">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={setAssignedToUserId}
              options={assigneeOptions}
              value={assignedToUserId}
            />
          </Field>
          <Field label="Attachment URL">
            <Input
              disabled={isPending}
              onChange={(event) => setAttachmentUrl(event.target.value)}
              placeholder="https://..."
              value={attachmentUrl}
            />
          </Field>
          <label className="flex items-center gap-2 self-end text-sm text-muted-foreground">
            <input
              checked={moneyImpactRequested}
              disabled={isPending}
              onChange={(event) =>
                setMoneyImpactRequested(event.target.checked)
              }
              type="checkbox"
            />
            Money impact
          </label>
        </div>
        <Field className="mt-3" label="Description">
          <Textarea
            disabled={isPending}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </Field>
        <div className="mt-3 flex justify-end">
          <Button disabled={isPending} onClick={createCase} type="button">
            Open case
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {cases.length > 0 ? (
          cases.map((supportCase) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={supportCase.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {supportCase.subject}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {supportCase.member
                      ? `${supportCase.member.fullName} (${supportCase.member.memberNumber})`
                      : "No member linked"}{" "}
                    · {labelFromValue(supportCase.category)}
                    {linkedRecordLabel(supportCase)
                      ? ` · ${linkedRecordLabel(supportCase)}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusTone(
                    supportCase.status
                  )}`}
                >
                  {labelFromValue(supportCase.status)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {supportCase.description}
              </p>

              {supportCase.messages.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {supportCase.messages.slice(-3).map((message) => (
                    <div
                      className="rounded-md border border-border p-3 text-sm"
                      key={message.id}
                    >
                      <p className="text-muted-foreground">
                        {message.authorUser?.fullName ?? message.authorType} ·{" "}
                        {formatDate(message.createdAt)}
                      </p>
                      <p className="mt-1 text-foreground">{message.message}</p>
                      {message.attachmentUrl ? (
                        <a
                          className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                          href={message.attachmentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View attachment
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Status">
                  <LabeledSelectInput
                    disabled={isPending}
                    onValueChange={(value) =>
                      setStatusByCaseId((current) => ({
                        ...current,
                        [supportCase.id]: value as SupportCaseStatus,
                      }))
                    }
                    options={statusOptions}
                    value={statusByCaseId[supportCase.id] ?? supportCase.status}
                  />
                </Field>
                <Field label="Priority">
                  <LabeledSelectInput
                    disabled={isPending}
                    onValueChange={(value) =>
                      setPriorityByCaseId((current) => ({
                        ...current,
                        [supportCase.id]: value as SupportCasePriority,
                      }))
                    }
                    options={priorityOptions}
                    value={
                      priorityByCaseId[supportCase.id] ?? supportCase.priority
                    }
                  />
                </Field>
                <Field label="Assignee">
                  <LabeledSelectInput
                    disabled={isPending}
                    onValueChange={(value) =>
                      setAssigneeByCaseId((current) => ({
                        ...current,
                        [supportCase.id]: value,
                      }))
                    }
                    options={assigneeOptions}
                    value={
                      assigneeByCaseId[supportCase.id] ??
                      supportCase.assignedToUserId ??
                      ""
                    }
                  />
                </Field>
              </div>
              <Field className="mt-3" label="Resolution note">
                <Textarea
                  disabled={isPending}
                  onChange={(event) =>
                    setResolutionByCaseId((current) => ({
                      ...current,
                      [supportCase.id]: event.target.value,
                    }))
                  }
                  value={
                    resolutionByCaseId[supportCase.id] ??
                    supportCase.resolutionSummary ??
                    ""
                  }
                />
              </Field>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    checked={
                      requiresAdjustmentByCaseId[supportCase.id] ??
                      supportCase.requiresFinancialAdjustment
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setRequiresAdjustmentByCaseId((current) => ({
                        ...current,
                        [supportCase.id]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Needs finance adjustment
                </label>
                <Button
                  disabled={isPending}
                  onClick={() => updateCase(supportCase)}
                  type="button"
                >
                  Update case
                </Button>
              </div>

              {supportCase.requiresFinancialAdjustment ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-950">
                        Financial adjustment approval
                      </p>
                      <p className="mt-1 text-sm leading-6 text-amber-900">
                        Status:{" "}
                        {labelFromValue(
                          supportCase.financialAdjustmentApprovalStatus
                        )}
                        {supportCase.financialAdjustmentApprovedByUser
                          ? ` · ${supportCase.financialAdjustmentApprovedByUser.fullName}`
                          : ""}
                      </p>
                      {supportCase.financialAdjustmentApprovalNotes ? (
                        <p className="mt-1 text-sm leading-6 text-amber-900">
                          {supportCase.financialAdjustmentApprovalNotes}
                        </p>
                      ) : null}
                    </div>
                    <span className="w-fit rounded-full bg-background px-2 py-1 text-xs font-medium text-amber-900">
                      {financialAdjustmentApprovalLabel(
                        supportCase.financialAdjustmentApprovalStatus
                      )}
                    </span>
                  </div>
                  {canReviewFinancialAdjustments ? (
                    <div className="mt-3 border-t border-amber-200 pt-3">
                      <Field label="Approval note">
                        <Textarea
                          disabled={isPending}
                          onChange={(event) =>
                            setAdjustmentApprovalNotesByCaseId((current) => ({
                              ...current,
                              [supportCase.id]: event.target.value,
                            }))
                          }
                          value={
                            adjustmentApprovalNotesByCaseId[supportCase.id] ??
                            ""
                          }
                        />
                      </Field>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            reviewFinancialAdjustment(supportCase, "rejected")
                          }
                          type="button"
                          variant="outline"
                        >
                          Reject adjustment
                        </Button>
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            reviewFinancialAdjustment(supportCase, "approved")
                          }
                          type="button"
                        >
                          Approve adjustment
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {supportCase.status !== "closed" ? (
                <div className="mt-4 border-t border-border pt-4">
                  <Field label="Reply">
                    <Textarea
                      disabled={isPending}
                      onChange={(event) =>
                        setMessageByCaseId((current) => ({
                          ...current,
                          [supportCase.id]: event.target.value,
                        }))
                      }
                      value={messageByCaseId[supportCase.id] ?? ""}
                    />
                  </Field>
                  <div className="mt-3 flex justify-end">
                    <Button
                      disabled={isPending}
                      onClick={() => addMessage(supportCase)}
                      type="button"
                      variant="outline"
                    >
                      Add reply
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No support cases match the current workspace.
          </div>
        )}
      </section>
    </div>
  )
}

function messageAuthorLabel(message: SupportCaseRow["messages"][number]) {
  if (message.authorType === "member") {
    return "You"
  }

  if (message.authorType === "staff") {
    return message.authorUser?.fullName ?? "Cooperative staff"
  }

  return "System"
}

type MemberSupportCaseInitialValues = {
  attachmentUrl?: string
  category?: SupportCaseCategory
  description?: string
  moneyImpactRequested?: boolean
  subject?: string
}

export function MemberSupportCasesView({
  cases,
  initialCase,
  member,
  summary,
}: {
  cases: SupportCaseRow[]
  initialCase?: MemberSupportCaseInitialValues
  member: {
    fullName: string
    id: string
    memberNumber: string
  }
  summary: SupportCaseSummary
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState<SupportCaseCategory>(
    initialCase?.category ?? "payment_issue"
  )
  const [subject, setSubject] = useState(initialCase?.subject ?? "")
  const [description, setDescription] = useState(
    initialCase?.description ?? ""
  )
  const [attachmentUrl, setAttachmentUrl] = useState(
    initialCase?.attachmentUrl ?? ""
  )
  const [moneyImpactRequested, setMoneyImpactRequested] = useState(
    initialCase?.moneyImpactRequested ?? false
  )
  const [messageByCaseId, setMessageByCaseId] = useState<
    Record<string, string>
  >({})

  function createCase() {
    startTransition(async () => {
      try {
        await createMemberSupportCaseAction(
          objectToFormData({
            category,
            description,
            attachmentUrl,
            moneyImpactRequested,
            subject,
          })
        )
        setCategory("payment_issue")
        setAttachmentUrl("")
        setDescription("")
        setMoneyImpactRequested(false)
        setSubject("")
        showSuccess("Case opened", "Your support request was recorded.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not open case",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function addMessage(supportCase: SupportCaseRow) {
    startTransition(async () => {
      try {
        await addMemberSupportCaseMessageAction(
          objectToFormData({
            message: messageByCaseId[supportCase.id] ?? "",
            supportCaseId: supportCase.id,
          })
        )
        setMessageByCaseId((current) => {
          const next = { ...current }
          delete next[supportCase.id]
          return next
        })
        showSuccess("Reply sent", "Your message was added to the case.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not send reply",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        <SummaryTile label="Open" value={summary.openCases} />
        <SummaryTile
          label="Feature requests"
          value={summary.featureRequestOpenCases}
        />
        <SummaryTile label="Resolved" value={summary.closedCases} />
        <SummaryTile label="Total" value={summary.totalCases} />
        <SummaryTile label="Urgent" value={summary.urgentOpenCases} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Open support case
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Subject">
            <Input
              disabled={isPending}
              onChange={(event) => setSubject(event.target.value)}
              value={subject}
            />
          </Field>
          <Field label="Category">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={(value) =>
                setCategory(value as SupportCaseCategory)
              }
              options={categoryOptions}
              value={category}
            />
          </Field>
        </div>
        <Field className="mt-3" label="Description">
          <Textarea
            disabled={isPending}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </Field>
        <Field className="mt-3" label="Supporting document URL">
          <Input
            disabled={isPending}
            onChange={(event) => setAttachmentUrl(event.target.value)}
            placeholder="https://..."
            value={attachmentUrl}
          />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            checked={moneyImpactRequested}
            disabled={isPending}
            onChange={(event) => setMoneyImpactRequested(event.target.checked)}
            type="checkbox"
          />
          This may affect my payment or balance
        </label>
        <div className="mt-3 flex justify-end">
          <Button disabled={isPending} onClick={createCase} type="button">
            Open case
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {cases.length > 0 ? (
          cases.map((supportCase) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={supportCase.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {supportCase.subject}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {labelFromValue(supportCase.category)} ·{" "}
                    {formatDate(supportCase.createdAt)}
                    {linkedRecordLabel(supportCase)
                      ? ` · ${linkedRecordLabel(supportCase)}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusTone(
                    supportCase.status
                  )}`}
                >
                  {labelFromValue(supportCase.status)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {supportCase.description}
              </p>

              {supportCase.resolutionSummary ? (
                <div className="mt-4 rounded-md border border-border p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    Resolution
                  </p>
                  <p className="mt-1 text-foreground">
                    {supportCase.resolutionSummary}
                  </p>
                </div>
              ) : null}

              {supportCase.requiresFinancialAdjustment ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-950">
                    Finance review
                  </p>
                  <p className="mt-1 text-amber-900">
                    {labelFromValue(
                      supportCase.financialAdjustmentApprovalStatus
                    )}
                  </p>
                </div>
              ) : null}

              {supportCase.messages.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {supportCase.messages.map((message) => (
                    <div
                      className="rounded-md border border-border p-3 text-sm"
                      key={message.id}
                    >
                      <p className="text-muted-foreground">
                        {messageAuthorLabel(message)} ·{" "}
                        {formatDate(message.createdAt)}
                      </p>
                      <p className="mt-1 text-foreground">{message.message}</p>
                      {message.attachmentUrl ? (
                        <a
                          className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                          href={message.attachmentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View attachment
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {supportCase.status !== "closed" ? (
                <div className="mt-4 border-t border-border pt-4">
                  <Field label="Reply">
                    <Textarea
                      disabled={isPending}
                      onChange={(event) =>
                        setMessageByCaseId((current) => ({
                          ...current,
                          [supportCase.id]: event.target.value,
                        }))
                      }
                      value={messageByCaseId[supportCase.id] ?? ""}
                    />
                  </Field>
                  <div className="mt-3 flex justify-end">
                    <Button
                      disabled={isPending}
                      onClick={() => addMessage(supportCase)}
                      type="button"
                      variant="outline"
                    >
                      Add reply
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No support cases have been opened for this member profile.
          </div>
        )}
      </section>
    </div>
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
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
