"use client"

import { useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import type {
  SupportCasePriority,
  SupportCaseRow,
  SupportCaseStatus,
} from "@halaalvest/db"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { RequestClosedNotice } from "@/components/requests/request-summary"
import type { SupportCaseOption } from "./support-create-form"
import { SupportConversation } from "./support-conversation"
import { SupportStatusBadge } from "./support-status-badge"
import { useSupportRefresh } from "./use-support-refresh"
import {
  addMemberSupportCaseMessageAction,
  addSupportCaseMessageAction,
  reviewSupportCaseFinancialAdjustmentAction,
  settleSupportCaseSpecialSavingsRefundAction,
  updateSupportCaseStatusAction,
} from "@/lib/dashboard-actions"
import { qaSupportReply } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { todayInputValue } from "@/lib/requests/request-status-words"
import {
  formatSupportDate,
  isSupportCaseFinished,
  supportActiveStatusOptions,
  supportPriorityOptions,
  supportTopicLabels,
  type SupportViewer,
} from "@/lib/support/support-words"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

const financeCheckWords = {
  approved: "Approved",
  not_required: "Not needed",
  pending: "Waiting",
  rejected: "Turned down",
} as const

/**
 * One support case: what was asked, every message, and a reply box. Staff
 * also mark it solved or closed (real AlertDialogs), change who handles it,
 * and settle a money fix when one is needed.
 */
export function SupportCaseView({
  assignees = [],
  canReviewFinancialAdjustments = false,
  onClose,
  supportCase,
  viewer,
}: {
  assignees?: SupportCaseOption[]
  canReviewFinancialAdjustments?: boolean
  onClose: () => Promise<void>
  supportCase: SupportCaseRow
  viewer: SupportViewer
}) {
  const lastAuthor = supportCase.messages.at(-1)?.authorType ?? null
  const isClosed = supportCase.status === "closed"
  const isStaff = viewer === "staff"
  const urgent =
    supportCase.priority === "urgent" || supportCase.priority === "high"

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <SupportStatusBadge
          lastAuthor={lastAuthor}
          status={supportCase.status}
          viewer={viewer}
        />
        {isStaff && urgent && !isSupportCaseFinished(supportCase.status) ? (
          <Badge
            className="border-red-200 bg-red-50 text-sm text-red-800"
            variant="outline"
          >
            {supportCase.priority === "urgent" ? "Urgent" : "High priority"}
          </Badge>
        ) : null}
      </div>

      <RequestFacts
        items={[
          ...(isStaff
            ? [
                {
                  label: "Member",
                  value: supportCase.member
                    ? `${supportCase.member.fullName} (${supportCase.member.memberNumber})`
                    : "No member",
                },
              ]
            : []),
          { label: "About", value: supportTopicLabels[supportCase.category] },
          { label: "Opened", value: formatSupportDate(supportCase.createdAt) },
          ...(isStaff
            ? [
                {
                  label: "Handled by",
                  value: supportCase.assignedToUser?.fullName ?? "No one yet",
                },
              ]
            : []),
        ]}
      />

      {supportCase.resolutionSummary ? (
        <section className="grid gap-2 rounded-(--ui-radius-surface) border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <h3 className="text-base font-semibold text-foreground">
            {isStaff ? "What was done" : "The answer"}
          </h3>
          <p className="text-base leading-7 whitespace-pre-wrap text-foreground">
            {supportCase.resolutionSummary}
          </p>
        </section>
      ) : null}

      <RequestSection title="Messages">
        <SupportConversation messages={supportCase.messages} viewer={viewer} />
      </RequestSection>

      {isClosed ? (
        <RequestClosedNotice>
          This case is closed. You can still read it.
        </RequestClosedNotice>
      ) : (
        <SupportReply
          onClose={onClose}
          supportCase={supportCase}
          viewer={viewer}
        />
      )}

      {isStaff ? (
        <>
          {isClosed ? null : (
            <SupportCaseDetails assignees={assignees} supportCase={supportCase} />
          )}
          <SupportMoneySection
            canReview={canReviewFinancialAdjustments}
            supportCase={supportCase}
          />
        </>
      ) : null}
    </div>
  )
}

function SupportReply({
  onClose,
  supportCase,
  viewer,
}: {
  onClose: () => Promise<void>
  supportCase: SupportCaseRow
  viewer: SupportViewer
}) {
  const refresh = useSupportRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [finish, setFinish] = useState<"close" | "solve" | null>(null)
  const [summary, setSummary] = useState(supportCase.resolutionSummary ?? "")
  const isStaff = viewer === "staff"
  const isSolved = supportCase.status === "resolved"
  const moneyFixWaiting =
    supportCase.requiresFinancialAdjustment &&
    supportCase.financialAdjustmentApprovalStatus !== "approved"

  function sendReply() {
    startTransition(async () => {
      try {
        const formData = objectToFormData({
          message,
          supportCaseId: supportCase.id,
        })
        if (isStaff) {
          await addSupportCaseMessageAction(formData)
        } else {
          await addMemberSupportCaseMessageAction(formData)
        }
        setMessage("")
        showSuccess("Reply sent")
        await refresh({ supportCaseId: supportCase.id })
      } catch (error) {
        showError("Reply not sent", errorMessage(error))
      }
    })
  }

  function finishCase(status: Extract<SupportCaseStatus, "closed" | "resolved">) {
    startTransition(async () => {
      try {
        await updateSupportCaseStatusAction(
          objectToFormData({
            assignedToUserId: supportCase.assignedToUserId ?? "",
            priority: supportCase.priority,
            resolutionSummary: summary.trim(),
            status,
            supportCaseId: supportCase.id,
          })
        )
        setFinish(null)
        showSuccess(status === "closed" ? "Case closed" : "Marked solved")
        await refresh({ onClose, supportCaseId: supportCase.id })
      } catch (error) {
        showError("Not saved", errorMessage(error))
      }
    })
  }

  return (
    <section className="grid gap-4 border-t border-border pt-5">
      {isStaff ? (
        <DashboardStateQuickFill
          draft={message}
          enabled={!isPending}
          isDirty={Boolean(message)}
          onFill={() => setMessage(qaSupportReply)}
          restore={setMessage}
        />
      ) : null}
      <RequestField label="Your reply">
        <Textarea
          className="min-h-28 text-base"
          disabled={isPending}
          onChange={(event) => setMessage(event.target.value)}
          value={message}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || !message.trim()}
          onClick={sendReply}
          type="button"
        >
          {isPending && !finish ? "Sending..." : "Send reply"}
        </Button>
        {isStaff ? (
          <Button
            disabled={isPending || (!isSolved && moneyFixWaiting)}
            onClick={() => setFinish(isSolved ? "close" : "solve")}
            type="button"
            variant="outline"
          >
            {isSolved ? "Close case" : "Mark solved"}
          </Button>
        ) : null}
      </RequestFormActions>
      {isStaff && !isSolved && moneyFixWaiting ? (
        <p className="text-base text-muted-foreground">
          Approve the money fix before marking it solved.
        </p>
      ) : null}

      <RequestConfirmDialog
        confirmLabel="Mark solved"
        description="The member will see it as solved. They can still reply."
        disabled={!summary.trim()}
        onConfirm={() => finishCase("resolved")}
        onOpenChange={(open) => setFinish(open ? "solve" : null)}
        open={finish === "solve"}
        pending={isPending}
        title="Mark this case solved?"
      >
        <RequestField label="What was done?">
          <Textarea
            className="text-base"
            disabled={isPending}
            onChange={(event) => setSummary(event.target.value)}
            value={summary}
          />
        </RequestField>
      </RequestConfirmDialog>

      <RequestConfirmDialog
        confirmLabel="Close case"
        description="A closed case can't be opened again. The member can still read it."
        destructive
        disabled={!summary.trim()}
        onConfirm={() => finishCase("closed")}
        onOpenChange={(open) => setFinish(open ? "close" : null)}
        open={finish === "close"}
        pending={isPending}
        title="Close this case?"
      >
        <RequestField label="What was done?">
          <Textarea
            className="text-base"
            disabled={isPending}
            onChange={(event) => setSummary(event.target.value)}
            value={summary}
          />
        </RequestField>
      </RequestConfirmDialog>
    </section>
  )
}

function SupportCaseDetails({
  assignees,
  supportCase,
}: {
  assignees: SupportCaseOption[]
  supportCase: SupportCaseRow
}) {
  const refresh = useSupportRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [assignedToUserId, setAssignedToUserId] = useState(
    supportCase.assignedToUserId ?? ""
  )
  const [priority, setPriority] = useState<SupportCasePriority>(
    supportCase.priority
  )
  const [status, setStatus] = useState<SupportCaseStatus>(supportCase.status)
  const [needsMoneyFix, setNeedsMoneyFix] = useState(
    supportCase.requiresFinancialAdjustment
  )
  const statusOptions = isSupportCaseFinished(supportCase.status)
    ? [{ label: "Solved", value: "resolved" as const }, ...supportActiveStatusOptions]
    : supportActiveStatusOptions
  const changed =
    assignedToUserId !== (supportCase.assignedToUserId ?? "") ||
    priority !== supportCase.priority ||
    status !== supportCase.status ||
    needsMoneyFix !== supportCase.requiresFinancialAdjustment

  function save() {
    startTransition(async () => {
      try {
        await updateSupportCaseStatusAction(
          objectToFormData({
            assignedToUserId,
            priority,
            requiresFinancialAdjustment: needsMoneyFix,
            resolutionSummary: supportCase.resolutionSummary ?? "",
            status,
            supportCaseId: supportCase.id,
          })
        )
        showSuccess("Saved")
        await refresh({ supportCaseId: supportCase.id })
      } catch (error) {
        showError("Not saved", errorMessage(error))
      }
    })
  }

  return (
    <RequestSection title="Case details">
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Handled by">
          <LabeledSelectInput
            disabled={isPending}
            onValueChange={setAssignedToUserId}
            options={[
              ...(supportCase.assignedToUserId
                ? []
                : [{ label: "No one yet", value: "" }]),
              ...assignees.map((assignee) => ({
                label: assignee.label,
                value: assignee.id,
              })),
            ]}
            triggerClassName="h-12 text-base"
            value={assignedToUserId}
          />
        </RequestField>
        <RequestField label="Priority">
          <LabeledSelectInput
            disabled={isPending}
            onValueChange={(value) => setPriority(value as SupportCasePriority)}
            options={[...supportPriorityOptions]}
            triggerClassName="h-12 text-base"
            value={priority}
          />
        </RequestField>
        <RequestField label="Status">
          <LabeledSelectInput
            disabled={isPending || Boolean(supportCase.specialSavingsWithdrawal)}
            onValueChange={(value) => setStatus(value as SupportCaseStatus)}
            options={[...statusOptions]}
            triggerClassName="h-12 text-base"
            value={status}
          />
        </RequestField>
        <label className="flex min-h-12 items-center gap-3 self-end text-base text-foreground">
          <Checkbox
            checked={needsMoneyFix}
            className="size-5"
            disabled={isPending || Boolean(supportCase.specialSavingsWithdrawal)}
            onCheckedChange={setNeedsMoneyFix}
          />
          Needs a money fix
        </label>
      </div>
      <RequestFormActions>
        <Button
          disabled={isPending || !changed}
          onClick={save}
          type="button"
          variant="outline"
        >
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </RequestFormActions>
    </RequestSection>
  )
}

function SupportMoneySection({
  canReview,
  supportCase,
}: {
  canReview: boolean
  supportCase: SupportCaseRow
}) {
  const refresh = useSupportRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<"approve" | "refund" | "reject" | null>(
    null
  )
  const [note, setNote] = useState("")
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState(todayInputValue())
  const [reference, setReference] = useState("")
  const [refundNote, setRefundNote] = useState("")
  const withdrawal = supportCase.specialSavingsWithdrawal
  const approval = supportCase.financialAdjustmentApprovalStatus

  if (
    !supportCase.moneyImpactRequested &&
    !supportCase.requiresFinancialAdjustment &&
    !withdrawal
  ) {
    return null
  }

  const canDecide =
    canReview &&
    supportCase.requiresFinancialAdjustment &&
    approval !== "approved" &&
    supportCase.status !== "closed" &&
    !withdrawal
  const canRecordRefund =
    supportCase.requiresFinancialAdjustment &&
    approval === "approved" &&
    supportCase.status !== "closed" &&
    !withdrawal

  function review(approvalStatus: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await reviewSupportCaseFinancialAdjustmentAction(
          objectToFormData({
            approvalNotes: note.trim(),
            approvalStatus,
            supportCaseId: supportCase.id,
          })
        )
        setConfirm(null)
        setNote("")
        showSuccess(approvalStatus === "approved" ? "Approved" : "Turned down")
        await refresh({ supportCaseId: supportCase.id })
      } catch (error) {
        showError("Not saved", errorMessage(error))
      }
    })
  }

  function recordRefund() {
    startTransition(async () => {
      try {
        await settleSupportCaseSpecialSavingsRefundAction(
          objectToFormData({
            amount,
            notes: refundNote.trim(),
            paidAt,
            reference: reference.trim(),
            supportCaseId: supportCase.id,
          })
        )
        setConfirm(null)
        showSuccess("Refund recorded", "The case is now solved.")
        await refresh({ supportCaseId: supportCase.id })
      } catch (error) {
        showError("Refund not recorded", errorMessage(error))
      }
    })
  }

  const refundAmount = Number(amount)
  const refundReady =
    Number.isFinite(refundAmount) &&
    refundAmount > 0 &&
    Boolean(paidAt) &&
    Boolean(reference.trim())

  return (
    <RequestSection title="Money">
      <RequestFacts
        items={[
          {
            label: "Member says it is about money",
            value: supportCase.moneyImpactRequested ? "Yes" : "No",
          },
          {
            label: "Money fix",
            value: supportCase.requiresFinancialAdjustment
              ? financeCheckWords[approval]
              : "Not needed",
          },
          {
            label: "Finance note",
            value: supportCase.financialAdjustmentApprovalNotes,
          },
          {
            label: "Checked by",
            value: supportCase.financialAdjustmentApprovedByUser?.fullName,
          },
          ...(withdrawal
            ? [
                {
                  label: "Refund paid",
                  value: `${formatCurrency(withdrawal.amount)} on ${formatSupportDate(withdrawal.paidAt)}`,
                },
                { label: "Payment reference", value: withdrawal.reference },
              ]
            : []),
        ]}
      />

      {canDecide ? (
        <div className="grid gap-3 sm:flex sm:flex-wrap [&_button]:h-12 [&_button]:w-full sm:[&_button]:w-auto">
          <Button
            disabled={isPending}
            onClick={() => setConfirm("approve")}
            type="button"
          >
            Approve money fix
          </Button>
          <Button
            disabled={isPending}
            onClick={() => setConfirm("reject")}
            type="button"
            variant="outline"
          >
            Turn down
          </Button>
        </div>
      ) : supportCase.requiresFinancialAdjustment &&
        approval !== "approved" &&
        !withdrawal ? (
        <p className="text-base text-muted-foreground">
          A finance officer approves money fixes.
        </p>
      ) : null}

      {canRecordRefund ? (
        <div className="grid gap-5">
          <p className="text-base text-foreground">
            If the fix is a refund from special savings, record the bank
            payment here. This also marks the case solved.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <RequestField label="Amount (₦)">
              <Input
                className="h-12 text-base"
                disabled={isPending}
                inputMode="decimal"
                min="0.01"
                onChange={(event) => setAmount(event.target.value)}
                step="0.01"
                type="number"
                value={amount}
              />
            </RequestField>
            <RequestField label="Date paid">
              <Input
                className="h-12 text-base"
                disabled={isPending}
                onChange={(event) => setPaidAt(event.target.value)}
                type="date"
                value={paidAt}
              />
            </RequestField>
            <RequestField className="sm:col-span-2" label="Bank reference">
              <Input
                className="h-12 text-base"
                disabled={isPending}
                onChange={(event) => setReference(event.target.value)}
                value={reference}
              />
            </RequestField>
            <RequestField className="sm:col-span-2" label="Note" optional>
              <Textarea
                className="text-base"
                disabled={isPending}
                onChange={(event) => setRefundNote(event.target.value)}
                value={refundNote}
              />
            </RequestField>
          </div>
          <RequestFormActions>
            <Button
              disabled={isPending || !refundReady}
              onClick={() => setConfirm("refund")}
              type="button"
            >
              Record refund
            </Button>
          </RequestFormActions>
        </div>
      ) : null}

      <RequestConfirmDialog
        confirmLabel="Approve"
        description="This only approves the fix. No money moves until the refund is recorded."
        onConfirm={() => review("approved")}
        onOpenChange={(open) => setConfirm(open ? "approve" : null)}
        open={confirm === "approve"}
        pending={isPending}
        title="Approve the money fix?"
      >
        <RequestField label="Note" optional>
          <Textarea
            className="text-base"
            disabled={isPending}
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </RequestField>
      </RequestConfirmDialog>

      <RequestConfirmDialog
        confirmLabel="Turn down"
        destructive
        disabled={!note.trim()}
        onConfirm={() => review("rejected")}
        onOpenChange={(open) => setConfirm(open ? "reject" : null)}
        open={confirm === "reject"}
        pending={isPending}
        title="Turn down the money fix?"
      >
        <RequestField label="Reason">
          <Textarea
            className="text-base"
            disabled={isPending}
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </RequestField>
      </RequestConfirmDialog>

      <RequestConfirmDialog
        confirmLabel="Record refund"
        description="This takes the money out of the member's special savings."
        facts={[
          {
            label: "Amount",
            value: refundReady ? formatCurrency(refundAmount) : "",
          },
          { label: "Date paid", value: paidAt ? formatSupportDate(paidAt) : "" },
          { label: "Bank reference", value: reference.trim() },
          {
            label: "Member",
            value: supportCase.member?.fullName ?? "",
          },
        ]}
        onConfirm={recordRefund}
        onOpenChange={(open) => setConfirm(open ? "refund" : null)}
        open={confirm === "refund"}
        pending={isPending}
        title="Record this refund?"
      />
    </RequestSection>
  )
}
