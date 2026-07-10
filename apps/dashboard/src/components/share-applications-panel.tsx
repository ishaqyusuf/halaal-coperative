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
  reviewMemberShareApplicationAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

type MemberOption = {
  id: string
  label: string
}

function statusLabel(status: MemberShareApplicationRow["status"]) {
  switch (status) {
    case "approved":
      return "Approved"
    case "rejected":
      return "Rejected"
    case "cancelled":
      return "Cancelled"
    default:
      return "Pending"
  }
}

function statusClassName(status: MemberShareApplicationRow["status"]) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

export function ShareApplicationsPanel({
  applications,
  memberOptions,
  policy,
}: {
  applications: MemberShareApplicationRow[]
  memberOptions: MemberOption[]
  policy: TenantSharePolicySettings
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState(memberOptions[0]?.id ?? "")
  const [requestedUnits, setRequestedUnits] = useState("1")
  const [notes, setNotes] = useState("")
  const [reviewNotesById, setReviewNotesById] = useState<
    Record<string, string>
  >({})
  const memberSelectOptions = useMemo(
    () =>
      memberOptions.map((member) => ({
        label: member.label,
        value: member.id,
      })),
    [memberOptions]
  )
  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  )
  const reviewedApplications = applications.filter(
    (application) => application.status !== "pending"
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

  function reviewApplication(
    application: MemberShareApplicationRow,
    decision: "approved" | "rejected"
  ) {
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
            reviewNotes: reviewNotesById[application.id] ?? "",
          })
        )
        setReviewNotesById((current) => {
          const next = { ...current }
          delete next[application.id]
          return next
        })
        showSuccess(
          decision === "approved" ? "Request approved" : "Request rejected",
          "Share application review was recorded."
        )
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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Additional share applications
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Optional share requests are staged until finance approval posts
            them to share capital.
          </p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          {policy.compulsoryShareUnits}-{policy.maximumShareUnits} units at{" "}
          {formatCurrency(policy.unitAmount)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
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

      <div className="mt-6 space-y-3">
        {pendingApplications.length > 0 ? (
          pendingApplications.map((application) => (
            <div
              className="rounded-md border border-border p-3"
              key={application.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {application.memberName}{" "}
                    <span className="text-muted-foreground">
                      {application.memberNumber}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.requestedUnits} units worth{" "}
                    {formatCurrency(application.shareValueSnapshot)}
                  </p>
                  {application.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {application.notes}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusClassName(
                    application.status
                  )}`}
                >
                  {statusLabel(application.status)}
                </span>
              </div>
              <Textarea
                className="mt-3"
                disabled={isPending}
                onChange={(event) =>
                  setReviewNotesById((current) => ({
                    ...current,
                    [application.id]: event.target.value,
                  }))
                }
                placeholder="Review note"
                value={reviewNotesById[application.id] ?? ""}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  disabled={isPending}
                  onClick={() => reviewApplication(application, "rejected")}
                  type="button"
                  variant="outline"
                >
                  Reject
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => reviewApplication(application, "approved")}
                  type="button"
                >
                  Approve
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No pending share applications.
          </div>
        )}
      </div>

      {reviewedApplications.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Recent reviews
          </p>
          <div className="divide-y divide-border rounded-md border border-border">
            {reviewedApplications.slice(0, 5).map((application) => (
              <div
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                key={application.id}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {application.memberName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {application.approvedUnits ?? application.requestedUnits}{" "}
                    units, {formatCurrency(application.shareValueSnapshot)}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusClassName(
                    application.status
                  )}`}
                >
                  {statusLabel(application.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
