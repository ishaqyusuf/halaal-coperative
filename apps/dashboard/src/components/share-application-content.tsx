"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
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

export type ShareApplicationMemberOption = {
  id: string
  label: string
}

export function MemberShareApplicationCreateContent({
  onClose,
  policy,
  remainingOptionalUnits,
}: {
  onClose: () => void
  policy: TenantSharePolicySettings
  remainingOptionalUnits: number
}) {
  const router = useRouter()
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
        setRequestedUnits("")
        setNotes("")
        onClose()
        showSuccess("Request submitted", "Your share request is pending review.")
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
      <div className="mt-3 flex justify-end">
        <Button
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
  onClose: () => void
}) {
  const router = useRouter()
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
        setRequestedUnits("1")
        setNotes("")
        onClose()
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
  onClose: () => void
}) {
  const router = useRouter()
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
        setReviewNotes("")
        showSuccess(
          decision === "approved" ? "Request approved" : "Request rejected",
          "Share application review was recorded."
        )
        onClose()
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
