"use client"

import { useMemo, useState, useTransition, type ReactNode } from "react"
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
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"
import {
  addMemberSupportCaseMessageAction,
  addSupportCaseMessageAction,
  createMemberSupportCaseAction,
  createSupportCaseAction,
  reviewSupportCaseFinancialAdjustmentAction,
  updateSupportCaseStatusAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

export type SupportCaseOption = {
  id: string
  label: string
}

export type MemberSupportCaseInitialValues = {
  attachmentUrl?: string
  category?: SupportCaseCategory
  description?: string
  moneyImpactRequested?: boolean
  subject?: string
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

export function SupportCaseCreateContent({
  assignees,
  memberOptions,
  onClose,
}: {
  assignees: SupportCaseOption[]
  memberOptions: SupportCaseOption[]
  onClose: () => void
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
        onClose()
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

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
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
            onValueChange={(value) => setCategory(value as SupportCaseCategory)}
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
          <UploadEvidenceInput
            disabled={isPending}
            onUploaded={(upload) => setAttachmentUrl(upload.url)}
            purpose="support_attachment"
            value={attachmentUrl}
          />
          <Input
            className="mt-2"
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
    </>
  )
}

export function SupportCaseUpdateContent({
  assignees,
  onClose,
  supportCase,
}: {
  assignees: SupportCaseOption[]
  onClose: () => void
  supportCase: SupportCaseRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<SupportCaseStatus>(supportCase.status)
  const [priority, setPriority] = useState<SupportCasePriority>(
    supportCase.priority
  )
  const [assignedToUserId, setAssignedToUserId] = useState(
    supportCase.assignedToUserId ?? ""
  )
  const [resolutionSummary, setResolutionSummary] = useState(
    supportCase.resolutionSummary ?? ""
  )
  const [requiresFinancialAdjustment, setRequiresFinancialAdjustment] =
    useState(supportCase.requiresFinancialAdjustment)
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

  function updateCase() {
    startTransition(async () => {
      try {
        await updateSupportCaseStatusAction(
          objectToFormData({
            assignedToUserId,
            priority,
            requiresFinancialAdjustment,
            resolutionSummary,
            status,
            supportCaseId: supportCase.id,
          })
        )
        onClose()
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

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Status">
          <LabeledSelectInput
            disabled={isPending}
            onValueChange={(value) => setStatus(value as SupportCaseStatus)}
            options={statusOptions}
            value={status}
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
      </div>
      <Field className="mt-3" label="Resolution note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setResolutionSummary(event.target.value)}
          value={resolutionSummary}
        />
      </Field>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            checked={requiresFinancialAdjustment}
            disabled={isPending}
            onChange={(event) =>
              setRequiresFinancialAdjustment(event.target.checked)
            }
            type="checkbox"
          />
          Needs finance adjustment
        </label>
        <Button disabled={isPending} onClick={updateCase} type="button">
          Update case
        </Button>
      </div>
    </>
  )
}

export function SupportCaseFinancialAdjustmentReviewContent({
  onClose,
  supportCase,
}: {
  onClose: () => void
  supportCase: SupportCaseRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [approvalNotes, setApprovalNotes] = useState("")

  function reviewFinancialAdjustment(approvalStatus: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await reviewSupportCaseFinancialAdjustmentAction(
          objectToFormData({
            approvalNotes,
            approvalStatus,
            supportCaseId: supportCase.id,
          })
        )
        setApprovalNotes("")
        showSuccess(
          "Adjustment reviewed",
          `Financial adjustment was ${labelFromValue(approvalStatus)}.`
        )
        onClose()
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
    <>
      <Field label="Approval note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setApprovalNotes(event.target.value)}
          value={approvalNotes}
        />
      </Field>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={() => reviewFinancialAdjustment("rejected")}
          type="button"
          variant="outline"
        >
          Reject adjustment
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewFinancialAdjustment("approved")}
          type="button"
        >
          Approve adjustment
        </Button>
      </div>
    </>
  )
}

export function SupportCaseReplyContent({
  onClose,
  supportCase,
}: {
  onClose: () => void
  supportCase: SupportCaseRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")

  function addMessage() {
    startTransition(async () => {
      try {
        await addSupportCaseMessageAction(
          objectToFormData({
            message,
            supportCaseId: supportCase.id,
          })
        )
        setMessage("")
        onClose()
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

  return (
    <>
      <Field label="Reply">
        <Textarea
          disabled={isPending}
          onChange={(event) => setMessage(event.target.value)}
          value={message}
        />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button disabled={isPending} onClick={addMessage} type="button">
          Add reply
        </Button>
      </div>
    </>
  )
}

export function MemberSupportCaseCreateContent({
  initialCase,
  onClose,
}: {
  initialCase?: MemberSupportCaseInitialValues
  onClose: () => void
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

  function createCase() {
    startTransition(async () => {
      try {
        await createMemberSupportCaseAction(
          objectToFormData({
            attachmentUrl,
            category,
            description,
            moneyImpactRequested,
            subject,
          })
        )
        setCategory("payment_issue")
        setAttachmentUrl("")
        setDescription("")
        setMoneyImpactRequested(false)
        setSubject("")
        onClose()
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

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
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
            onValueChange={(value) => setCategory(value as SupportCaseCategory)}
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
        <UploadEvidenceInput
          disabled={isPending}
          onUploaded={(upload) => setAttachmentUrl(upload.url)}
          purpose="support_attachment"
          value={attachmentUrl}
        />
        <Input
          className="mt-2"
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
          onChange={(event) =>
            setMoneyImpactRequested(event.target.checked)
          }
          type="checkbox"
        />
        This may affect my payment or balance
      </label>
      <div className="mt-3 flex justify-end">
        <Button disabled={isPending} onClick={createCase} type="button">
          Open case
        </Button>
      </div>
    </>
  )
}

export function MemberSupportCaseReplyContent({
  onClose,
  supportCase,
}: {
  onClose: () => void
  supportCase: SupportCaseRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")

  function addMessage() {
    startTransition(async () => {
      try {
        await addMemberSupportCaseMessageAction(
          objectToFormData({
            message,
            supportCaseId: supportCase.id,
          })
        )
        setMessage("")
        onClose()
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
    <>
      <Field label="Reply">
        <Textarea
          disabled={isPending}
          onChange={(event) => setMessage(event.target.value)}
          value={message}
        />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button disabled={isPending} onClick={addMessage} type="button">
          Add reply
        </Button>
      </div>
    </>
  )
}
