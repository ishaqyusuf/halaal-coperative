"use client"

import { useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import type { SupportCaseCategory } from "@halaalvest/db"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { MemberCombobox } from "@/components/member-combobox"
import { RequestChoice } from "@/components/requests/request-choice"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { SupportAttachmentField } from "./support-attachment-field"
import { useSupportRefresh } from "./use-support-refresh"
import {
  createMemberSupportCaseAction,
  createSupportCaseAction,
} from "@/lib/dashboard-actions"
import { createQaSupportCase } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import {
  supportSubjectFromMessage,
  supportTopicOptions,
} from "@/lib/support/support-words"

export type SupportCaseOption = {
  id: string
  label: string
}

/** Values another page can pass in the URL (receipts, profile card). */
export type MemberSupportCaseInitialValues = {
  attachmentUrl?: string
  category?: SupportCaseCategory
  description?: string
  moneyImpactRequested?: boolean
  subject?: string
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function CheckRow({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 text-base text-foreground">
      <Checkbox
        checked={checked}
        className="size-5"
        disabled={disabled}
        onCheckedChange={onChange}
      />
      {label}
    </label>
  )
}

/** A member asks for help: what it's about, their message, an optional file. */
export function MemberSupportCreateForm({
  initialCase,
  onClose,
}: {
  initialCase?: MemberSupportCaseInitialValues
  onClose: () => Promise<void>
}) {
  const refresh = useSupportRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState<SupportCaseCategory>(
    initialCase?.category ?? "payment_issue"
  )
  const [message, setMessage] = useState(initialCase?.description ?? "")
  const [attachmentUrl, setAttachmentUrl] = useState(
    initialCase?.attachmentUrl ?? ""
  )
  const [moneyImpactRequested, setMoneyImpactRequested] = useState(
    initialCase?.moneyImpactRequested ?? false
  )

  function send() {
    startTransition(async () => {
      try {
        await createMemberSupportCaseAction(
          objectToFormData({
            attachmentUrl,
            category,
            description: message,
            moneyImpactRequested,
            subject:
              initialCase?.subject?.trim() ||
              supportSubjectFromMessage(message, category),
          })
        )
        showSuccess("Sent", "The office will answer here.")
        await refresh({ onClose })
      } catch (error) {
        showError("Not sent", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-6">
      <DashboardStateQuickFill
        draft={{ message }}
        enabled={!isPending}
        isDirty={Boolean(message)}
        onFill={() => {
          setCategory("payment_issue")
          setMessage(createQaSupportCase().description)
        }}
        restore={(draft) => setMessage(draft.message)}
      />
      <RequestChoice
        disabled={isPending}
        label="What is it about?"
        onChange={setCategory}
        options={supportTopicOptions}
        value={category}
      />
      <RequestField label="Your message">
        <Textarea
          className="min-h-36 text-base"
          disabled={isPending}
          onChange={(event) => setMessage(event.target.value)}
          value={message}
        />
      </RequestField>
      <CheckRow
        checked={moneyImpactRequested}
        disabled={isPending}
        label="It is about my money or balance"
        onChange={setMoneyImpactRequested}
      />
      <SupportAttachmentField
        disabled={isPending}
        onChange={setAttachmentUrl}
        value={attachmentUrl}
      />
      <RequestFormActions>
        <Button
          disabled={isPending || !message.trim()}
          onClick={send}
          type="button"
        >
          {isPending ? "Sending..." : "Send"}
        </Button>
      </RequestFormActions>
    </div>
  )
}

/** Staff log a case for a member (or a general one). */
export function StaffSupportCreateForm({
  assignees,
  onClose,
}: {
  assignees: SupportCaseOption[]
  onClose: () => Promise<void>
}) {
  const refresh = useSupportRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [category, setCategory] = useState<SupportCaseCategory>("payment_issue")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [assignedToUserId, setAssignedToUserId] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [moneyImpactRequested, setMoneyImpactRequested] = useState(false)

  function save() {
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
            priority: urgent ? "urgent" : "normal",
            subject: subject.trim() || supportSubjectFromMessage(description, category),
          })
        )
        showSuccess("Case saved", "It is now in the list.")
        await refresh({ onClose })
      } catch (error) {
        showError("Not saved", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-6">
      <DashboardStateQuickFill
        draft={{ description, subject }}
        enabled={!isPending}
        isDirty={Boolean(subject || description)}
        onFill={() => {
          const values = createQaSupportCase()
          setCategory("payment_issue")
          setSubject(values.subject)
          setDescription(values.description)
        }}
        restore={(draft) => {
          setDescription(draft.description)
          setSubject(draft.subject)
        }}
      />
      <RequestField label="Member" optional>
        <MemberCombobox
          disabled={isPending}
          emptyLabel="No member"
          onValueChange={setMemberId}
          value={memberId}
        />
      </RequestField>
      <RequestField label="What is it about?">
        <LabeledSelectInput
          disabled={isPending}
          onValueChange={(value) => setCategory(value as SupportCaseCategory)}
          options={[...supportTopicOptions]}
          triggerClassName="h-12 text-base"
          value={category}
        />
      </RequestField>
      <RequestField label="Title" optional>
        <Input
          className="h-12 text-base"
          disabled={isPending}
          onChange={(event) => setSubject(event.target.value)}
          value={subject}
        />
      </RequestField>
      <RequestField label="What happened?">
        <Textarea
          className="min-h-32 text-base"
          disabled={isPending}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </RequestField>
      <RequestField label="Assign to" optional>
        <LabeledSelectInput
          disabled={isPending}
          onValueChange={setAssignedToUserId}
          options={[
            { label: "No one yet", value: "" },
            ...assignees.map((assignee) => ({
              label: assignee.label,
              value: assignee.id,
            })),
          ]}
          triggerClassName="h-12 text-base"
          value={assignedToUserId}
        />
      </RequestField>
      <div className="grid">
        <CheckRow
          checked={urgent}
          disabled={isPending}
          label="Urgent"
          onChange={setUrgent}
        />
        <CheckRow
          checked={moneyImpactRequested}
          disabled={isPending}
          label="It is about the member's money"
          onChange={setMoneyImpactRequested}
        />
      </div>
      <SupportAttachmentField
        disabled={isPending}
        onChange={setAttachmentUrl}
        value={attachmentUrl}
      />
      <RequestFormActions>
        <Button
          disabled={isPending || !description.trim()}
          onClick={save}
          type="button"
        >
          {isPending ? "Saving..." : "Save case"}
        </Button>
      </RequestFormActions>
    </div>
  )
}
