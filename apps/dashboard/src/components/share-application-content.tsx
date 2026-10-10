"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import { useQueryClient } from "@tanstack/react-query"
import type {
  MemberShareApplicationRow,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  createMemberShareApplicationAction,
  createOwnMemberShareApplicationAction,
  reviewMemberShareApplicationAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { useTRPC } from "@/trpc/client"

export type ShareApplicationMemberOption = {
  id: string
  label: string
}

export function MemberShareApplicationCreateContent({
  onClose,
  policy,
  remainingOptionalUnits,
}: {
  onClose: () => Promise<unknown> | void
  policy: TenantSharePolicySettings
  remainingOptionalUnits: number
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [requestedUnits, setRequestedUnits] = useState(
    remainingOptionalUnits > 0 ? "1" : ""
  )
  const [notes, setNotes] = useState("")
  const requestedUnitCount = Number(requestedUnits)
  const canSubmit =
    Number.isInteger(requestedUnitCount) &&
    requestedUnitCount > 0 &&
    requestedUnitCount <= remainingOptionalUnits
  const requestedValue = canSubmit ? requestedUnitCount * policy.unitAmount : 0

  function createApplication() {
    startTransition(async () => {
      try {
        await createOwnMemberShareApplicationAction(
          objectToFormData({
            notes,
            requestedUnits,
          })
        )
        await queryClient.invalidateQueries(
          trpc.shareApplications.list.infiniteQueryFilter()
        )
        setRequestedUnits("")
        setNotes("")
        await onClose()
        showSuccess(
          "Request submitted",
          "Your share request is pending review."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not submit share request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Units
          </p>
          <Input
            disabled={isPending || remainingOptionalUnits === 0}
            inputMode="numeric"
            max={remainingOptionalUnits}
            min="1"
            onChange={(event) => setRequestedUnits(event.target.value)}
            step="1"
            type="number"
            value={requestedUnits}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Request value
          </p>
          <Input disabled readOnly value={formatCurrency(requestedValue)} />
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Note</p>
        <Textarea
          disabled={isPending || remainingOptionalUnits === 0}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional request context"
          value={notes}
        />
      </div>
      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          disabled={isPending || remainingOptionalUnits === 0 || !canSubmit}
          onClick={createApplication}
          type="button"
        >
          Submit request
        </Button>
      </div>
    </>
  )
}

export function ShareApplicationCreateContent({
  memberOptions,
  onClose,
}: {
  memberOptions: ShareApplicationMemberOption[]
  onClose: () => Promise<unknown> | void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState(memberOptions[0]?.id ?? "")
  const [requestedUnits, setRequestedUnits] = useState("1")
  const [notes, setNotes] = useState("")
  const memberSelectOptions = useMemo(
    () =>
      memberOptions.map((member) => ({
        label: member.label,
        value: member.id,
      })),
    [memberOptions]
  )

  function createApplication() {
    startTransition(async () => {
      try {
        await createMemberShareApplicationAction(
          objectToFormData({
            memberId,
            notes,
            requestedUnits,
          })
        )
        await queryClient.invalidateQueries(
          trpc.shareApplications.list.infiniteQueryFilter()
        )
        setRequestedUnits("1")
        setNotes("")
        await onClose()
        showSuccess("Request saved", "Share application is pending review.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not save share request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Member
          </p>
          <LabeledSelectInput
            disabled={isPending || memberSelectOptions.length === 0}
            onValueChange={setMemberId}
            options={memberSelectOptions}
            placeholder="Select member"
            value={memberId}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Units
          </p>
          <Input
            disabled={isPending || memberSelectOptions.length === 0}
            inputMode="numeric"
            min="1"
            onChange={(event) => setRequestedUnits(event.target.value)}
            step="1"
            type="number"
            value={requestedUnits}
          />
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Note</p>
        <Textarea
          disabled={isPending || memberSelectOptions.length === 0}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional request context"
          value={notes}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          disabled={isPending || memberSelectOptions.length === 0 || !memberId}
          onClick={createApplication}
          type="button"
        >
          Save request
        </Button>
      </div>
    </>
  )
}

export function ShareApplicationReviewContent({
  application,
  onClose,
}: {
  application: MemberShareApplicationRow
  onClose: () => Promise<unknown> | void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [reviewNotes, setReviewNotes] = useState("")

  function reviewApplication(decision: "approved" | "rejected") {
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
            reviewNotes,
          })
        )
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.shareApplications.list.infiniteQueryFilter()
          ),
          queryClient.invalidateQueries(
            trpc.shareApplications.get.queryFilter({
              memberShareApplicationId: application.id,
            })
          ),
        ])
        setReviewNotes("")
        showSuccess(
          decision === "approved" ? "Request approved" : "Request rejected",
          "Share application review was recorded."
        )
        await onClose()
        router.refresh()
      } catch (error) {
        showError(
          "Could not review share request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <Textarea
        disabled={isPending}
        onChange={(event) => setReviewNotes(event.target.value)}
        placeholder="Review note"
        value={reviewNotes}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={() => reviewApplication("rejected")}
          type="button"
          variant="outline"
        >
          Reject
        </Button>
        <Button
          disabled={isPending}
          onClick={() => reviewApplication("approved")}
          type="button"
        >
          Approve
        </Button>
      </div>
    </>
  )
}

function formatShareApplicationDate(value: Date | string | null) {
  if (!value) return "Not reviewed"

  return new Date(value).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function MemberShareApplicationDetailsContent({
  application,
}: {
  application: MemberShareApplicationRow
}) {
  const facts = [
    ["Status", application.status],
    ["Requested units", `${application.requestedUnits} units`],
    ["Unit amount", formatCurrency(application.unitAmountSnapshot)],
    ["Request value", formatCurrency(application.shareValueSnapshot)],
    ["Requested", formatShareApplicationDate(application.createdAt)],
    ["Reviewed", formatShareApplicationDate(application.reviewedAt)],
  ]

  return (
    <div>
      <dl className="divide-y divide-border border-y border-border">
        {facts.map(([label, value]) => (
          <div
            className="flex items-start justify-between gap-4 py-3"
            key={label}
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-right text-sm font-medium text-foreground capitalize">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="divide-y divide-border">
        <section className="py-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your note
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {application.notes || "No note was added."}
          </p>
        </section>
        <section className="py-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Finance review
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {application.reviewNotes ||
              (application.status === "pending"
                ? "This request is still waiting for finance review."
                : "No review note was recorded.")}
          </p>
        </section>
      </div>
    </div>
  )
}
