"use client"

import type { MemberShareApplicationRow } from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Label } from "@halaalvest/ui/components/label"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import { useQueryClient } from "@tanstack/react-query"
import { Minus, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { MemberCombobox } from "@/components/member-combobox"
import {
  createMemberShareApplicationAction,
  createOwnMemberShareApplicationAction,
  reviewMemberShareApplicationAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import {
  formatShareCount,
  getShareRequestStatusWord,
} from "@/lib/shares/share-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

/** Refreshes share reads after a change, closes the overlay, then the route. */
function useShareRequestDone(onClose: () => Promise<unknown> | void) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()

  return async function done() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.shareApplications.list.infiniteQueryFilter()
      ),
      queryClient.invalidateQueries(trpc.shareApplications.get.queryFilter()),
    ])
    await onClose()
    router.refresh()
  }
}

function ShareCountInput({
  disabled,
  max,
  onChange,
  value,
}: {
  disabled?: boolean
  max: number
  onChange: (value: number) => void
  value: number
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        aria-label="One share fewer"
        className="size-12"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <Minus />
      </Button>
      <Input
        aria-label="Number of shares"
        className="h-12 w-24 text-center text-xl font-semibold tabular-nums"
        disabled={disabled}
        inputMode="numeric"
        onChange={(event) => {
          const next = Number(event.target.value.replace(/\D/g, ""))
          onChange(Math.min(max, Math.max(0, next)))
        }}
        value={value ? String(value) : ""}
      />
      <Button
        aria-label="One share more"
        className="size-12"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <Plus />
      </Button>
    </div>
  )
}

/** Member asks for more shares (dialog `member-create`). */
export function MemberShareRequestForm({
  onClose,
  remainingShares,
  unitAmount,
}: {
  onClose: () => Promise<unknown> | void
  remainingShares: number
  unitAmount: number
}) {
  const done = useShareRequestDone(onClose)
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [shares, setShares] = useState(remainingShares > 0 ? 1 : 0)
  const [notes, setNotes] = useState("")
  const canSubmit = shares >= 1 && shares <= remainingShares

  function submit() {
    startTransition(async () => {
      try {
        await createOwnMemberShareApplicationAction(
          objectToFormData({ notes, requestedUnits: String(shares) })
        )
        showSuccess("Request sent", "The office will review it.")
        await done()
      } catch (error) {
        showError(
          "Could not send your request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={{ notes, shares }}
        enabled={remainingShares > 0 && !isPending}
        isDirty={Boolean(notes)}
        onFill={() => {
          setShares(Math.min(2, remainingShares))
          setNotes("Adding to my shares in the cooperative.")
        }}
        restore={(draft) => {
          setShares(draft.shares)
          setNotes(draft.notes)
        }}
      />
      <div className="grid gap-2">
        <Label className="text-base">How many shares?</Label>
        <ShareCountInput
          disabled={isPending}
          max={remainingShares}
          onChange={setShares}
          value={shares}
        />
        <p className="text-base text-muted-foreground">
          {formatCurrency(unitAmount)} each. You can ask for up to{" "}
          {formatShareCount(remainingShares)}.
        </p>
      </div>
      <p className="text-lg">
        Total{" "}
        <span className="font-semibold tabular-nums">
          {formatCurrency(canSubmit ? shares * unitAmount : 0)}
        </span>
      </p>
      <div className="grid gap-2">
        <Label className="text-base" htmlFor="share-request-note">
          Note (optional)
        </Label>
        <Textarea
          className="text-base"
          disabled={isPending}
          id="share-request-note"
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          value={notes}
        />
      </div>
      <Button
        size="touch"
        className="text-base"
        disabled={isPending || !canSubmit}
        onClick={submit}
        type="button"
      >
        {isPending ? "Sending…" : "Send request"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Nothing is taken from your savings until the office approves it.
      </p>
    </div>
  )
}

/** Staff add a request for a member who asked at the office (dialog `create`). */
export function StaffShareRequestForm({
  onClose,
  unitAmount,
}: {
  onClose: () => Promise<unknown> | void
  unitAmount: number
}) {
  const done = useShareRequestDone(onClose)
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [shares, setShares] = useState(1)
  const [notes, setNotes] = useState("")

  function submit() {
    startTransition(async () => {
      try {
        await createMemberShareApplicationAction(
          objectToFormData({ memberId, notes, requestedUnits: String(shares) })
        )
        showSuccess("Request added", "It is waiting for review.")
        await done()
      } catch (error) {
        showError(
          "Could not add the request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label className="text-base">Member</Label>
        <MemberCombobox
          disabled={isPending}
          onValueChange={setMemberId}
          placeholder="Type a name or member number"
          value={memberId}
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-base">How many shares?</Label>
        <ShareCountInput
          disabled={isPending}
          max={1000}
          onChange={setShares}
          value={shares}
        />
        <p className="text-base text-muted-foreground">
          Total {formatCurrency(shares * unitAmount)}
        </p>
      </div>
      <div className="grid gap-2">
        <Label className="text-base" htmlFor="staff-share-request-note">
          Note (optional)
        </Label>
        <Textarea
          className="text-base"
          disabled={isPending}
          id="staff-share-request-note"
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          value={notes}
        />
      </div>
      <Button
        size="touch"
        className="text-base"
        disabled={isPending || !memberId || shares < 1}
        onClick={submit}
        type="button"
      >
        {isPending ? "Saving…" : "Add request"}
      </Button>
    </div>
  )
}

function Fact({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="text-right text-base font-medium break-words text-foreground">
        {children}
      </dd>
    </div>
  )
}

type Decision = "approved" | "rejected"

/**
 * One share request. Staff decide here: Approve or Decline, each behind an
 * AlertDialog (approving posts share capital; declining tells the member why).
 */
export function ShareRequestDetails({
  application,
  canReview,
  onClose,
}: {
  application: MemberShareApplicationRow
  canReview: boolean
  onClose: () => Promise<unknown> | void
}) {
  const done = useShareRequestDone(onClose)
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [reason, setReason] = useState("")
  const status = getShareRequestStatusWord(application.status)
  const shares = formatShareCount(application.requestedUnits)
  const value = formatCurrency(application.shareValueSnapshot)
  const isWaiting = application.status === "pending"

  function review() {
    if (!decision) return

    startTransition(async () => {
      try {
        await reviewMemberShareApplicationAction(
          objectToFormData({
            applicationId: application.id,
            approvedUnits:
              decision === "approved"
                ? String(application.requestedUnits)
                : undefined,
            decision,
            reviewNotes: reason.trim() || undefined,
          })
        )
        showSuccess(
          decision === "approved" ? "Request approved" : "Request declined",
          `${application.memberName} will get an email.`
        )
        setDecision(null)
        await done()
      } catch (error) {
        setDecision(null)
        showError(
          "Could not save the decision",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-6">
      <div>
        <Badge
          className={`text-sm ${memberStateToneClassNames[status.tone]}`}
          variant="outline"
        >
          {status.label}
        </Badge>
        <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-lg">
          {shares} at {formatCurrency(application.unitAmountSnapshot)} each
        </p>
      </div>

      <dl className="divide-y divide-border border-y border-border">
        {canReview ? (
          <Fact label="Member">
            {application.memberName} ({application.memberNumber})
          </Fact>
        ) : null}
        <Fact label="Asked on">
          {formatDayMonthYear(application.createdAt)}
        </Fact>
        {application.reviewedAt ? (
          <Fact label="Decided on">
            {formatDayMonthYear(application.reviewedAt)}
          </Fact>
        ) : null}
        {application.notes ? (
          <Fact label={canReview ? "Member's note" : "Your note"}>
            {application.notes}
          </Fact>
        ) : null}
        {application.reviewNotes ? (
          <Fact label="Office note">{application.reviewNotes}</Fact>
        ) : null}
      </dl>

      {isWaiting && !canReview ? (
        <p className="text-base text-muted-foreground">
          The office has not decided yet. You will get an email.
        </p>
      ) : null}

      {isWaiting && canReview ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="touch"
            className="text-base"
            disabled={isPending}
            onClick={() => setDecision("approved")}
            type="button"
          >
            Approve
          </Button>
          <Button
            size="touch"
            className="text-base"
            disabled={isPending}
            onClick={() => setDecision("rejected")}
            type="button"
            variant="outline"
          >
            Decline
          </Button>
        </div>
      ) : null}

      <ConfirmActionDialog
        actionLabel={decision === "approved" ? "Approve" : "Decline"}
        confirmDisabled={decision === "rejected" && !reason.trim()}
        description={
          decision === "approved"
            ? `${value} is added to ${application.memberName}'s share capital.`
            : `${application.memberName} is told the request was not approved.`
        }
        destructive={decision === "rejected"}
        onCancel={() => setDecision(null)}
        onConfirm={review}
        open={Boolean(decision)}
        pending={isPending}
        title={
          decision === "approved"
            ? `Approve ${shares} for ${application.memberName}?`
            : `Decline ${application.memberName}'s request?`
        }
      >
        <div className="grid gap-2">
          <Label className="text-base" htmlFor="share-decision-reason">
            {decision === "rejected" ? "Reason" : "Note (optional)"}
          </Label>
          <Textarea
            className="text-base"
            disabled={isPending}
            id="share-decision-reason"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            value={reason}
          />
          <p className="text-sm text-muted-foreground">The member sees this.</p>
        </div>
      </ConfirmActionDialog>
    </div>
  )
}
