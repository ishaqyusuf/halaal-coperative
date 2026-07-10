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
  MemberShareApplicationRow,
  MemberUnitSharePosition,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { createOwnMemberShareApplicationAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

type MemberSummary = {
  fullName: string
  id: string
  memberNumber: string
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
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

export function MemberSharesView({
  applications,
  member,
  policy,
  position,
}: {
  applications: MemberShareApplicationRow[]
  member: MemberSummary
  policy: TenantSharePolicySettings
  position: MemberUnitSharePosition
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const remainingOptionalUnits = Math.max(
    0,
    position.maximumUnits - position.totalPendingUnits
  )
  const [requestedUnits, setRequestedUnits] = useState(
    remainingOptionalUnits > 0 ? "1" : ""
  )
  const [notes, setNotes] = useState("")
  const requestedUnitCount = Number(requestedUnits)
  const canSubmit =
    Number.isInteger(requestedUnitCount) &&
    requestedUnitCount > 0 &&
    requestedUnitCount <= remainingOptionalUnits
  const requestedValue = canSubmit
    ? requestedUnitCount * policy.unitAmount
    : 0

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
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile
          detail={formatCurrency(position.compulsoryUnits * position.unitAmount)}
          label="Compulsory"
          value={`${position.compulsoryUnits} units`}
        />
        <SummaryTile
          detail={formatCurrency(
            position.approvedOptionalUnits * position.unitAmount
          )}
          label="Approved optional"
          value={`${position.approvedOptionalUnits} units`}
        />
        <SummaryTile
          detail={formatCurrency(
            position.pendingOptionalUnits * position.unitAmount
          )}
          label="Pending optional"
          value={`${position.pendingOptionalUnits} units`}
        />
        <SummaryTile
          detail={`${position.totalPendingUnits}/${position.maximumUnits} units reserved`}
          label="Available"
          value={`${remainingOptionalUnits} units`}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Request optional shares
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
            {formatCurrency(policy.unitAmount)} per share
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
          <Field label="Units">
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
          </Field>
          <Field label="Request value">
            <Input disabled readOnly value={formatCurrency(requestedValue)} />
          </Field>
        </div>
        <Field className="mt-3" label="Note">
          <Textarea
            disabled={isPending || remainingOptionalUnits === 0}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional request context"
            value={notes}
          />
        </Field>
        <div className="mt-3 flex justify-end">
          <Button
            disabled={isPending || remainingOptionalUnits === 0 || !canSubmit}
            onClick={createApplication}
            type="button"
          >
            Submit request
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {applications.length > 0 ? (
          applications.map((application) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={application.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {application.requestedUnits} requested units
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(application.shareValueSnapshot)} at{" "}
                    {formatCurrency(application.unitAmountSnapshot)} per share
                    · {formatDate(application.createdAt)}
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
              {application.notes ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {application.notes}
                </p>
              ) : null}
              {application.reviewNotes ? (
                <div className="mt-3 rounded-md border border-border p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    Review note
                  </p>
                  <p className="mt-1 text-foreground">
                    {application.reviewNotes}
                  </p>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No share requests have been submitted for this member profile.
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

function SummaryTile({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}
