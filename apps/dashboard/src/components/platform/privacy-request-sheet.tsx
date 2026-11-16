"use client"

import { getRoleDisplayName } from "@halaalvest/auth/roles"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { Button } from "@halaalvest/ui/components/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { PrivacyProcessingCountList } from "@/components/privacy-processing-count-list"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { usePlatformParams } from "@/hooks/use-platform-params"
import {
  getPrivacyNextStep,
  getPrivacyRequestWord,
  plural,
  privacyNoteCategoryWords,
  type PrivacyNoteCategory,
} from "@/lib/platform/platform-words"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { formatDateAndTime } from "@/utils/format"
import { PlatformBadge } from "./platform-badge"

const minNote = 20

/** One privacy request (`?privacyRequestId=`): facts and the next step. */
export function PrivacyRequestSheet() {
  const { privacyRequestId, setParams } = usePlatformParams()

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("platformPrivacy", "request")}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) void setParams({ privacyRequestId: null })
      }}
      open={Boolean(privacyRequestId)}
    >
      {privacyRequestId ? (
        <PrivacyRequestContent requestId={privacyRequestId} />
      ) : null}
    </WorkflowPresentation>
  )
}

function SheetFrame({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: React.ReactNode
  title: string
}) {
  return (
    <>
      <SheetHeader className="gap-1 px-4 pt-4 sm:px-6">
        <SheetTitle className="font-heading text-2xl font-semibold">
          {title}
        </SheetTitle>
        <SheetDescription className="text-base text-muted-foreground">
          {description}
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-8 sm:px-6">{children}</div>
    </>
  )
}

function PrivacyRequestContent({ requestId }: { requestId: string }) {
  const trpc = useTRPC()
  const detail = useQuery(
    trpc.accountPrivacy.operatorRequest.queryOptions({ requestId })
  )
  const request = detail.data

  if (detail.isPending) {
    return (
      <SheetFrame description="Loading" title="Privacy request">
        <p className="text-lg text-muted-foreground" role="status">
          Loading…
        </p>
      </SheetFrame>
    )
  }

  if (!request) {
    return (
      <SheetFrame description="Not loaded" title="Privacy request">
        <div className="grid justify-items-start gap-3" role="alert">
          <p className="text-lg">This request could not be loaded.</p>
          <Button
            size="touch"
            className="px-5 text-base"
            onClick={() => void detail.refetch()}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      </SheetFrame>
    )
  }

  const name = request.user?.fullName ?? "Account holder"
  const word = getPrivacyRequestWord(request)
  const nextStep = getPrivacyNextStep(request)
  const accessEnded = Boolean(request.accessRevokedAt)

  return (
    <SheetFrame
      description={request.user?.email ?? "No email on file"}
      title={name}
    >
      <div className="flex flex-wrap items-center gap-3">
        <PlatformBadge word={word} />
        {nextStep ? (
          <p className="text-lg font-medium text-foreground">{nextStep}</p>
        ) : null}
      </div>

      <RequestFacts
        items={[
          { label: "Cooperative", value: request.tenant?.name ?? "Not known" },
          { label: "Asked on", value: formatDateAndTime(request.requestedAt) },
          { label: "Checked on", value: formatDateAndTime(request.verifiedAt) },
          {
            label: "Access ended on",
            value: formatDateAndTime(request.accessRevokedAt),
          },
          { label: "Request number", value: request.id },
        ]}
      />

      {request.verificationEvidence ? (
        <RequestSection title="How we checked it was them">
          <p className="text-base [overflow-wrap:anywhere] whitespace-pre-wrap">
            {request.verificationEvidence}
          </p>
        </RequestSection>
      ) : null}

      {request.status === "submitted" ||
      request.status === "awaiting_information" ? (
        <CheckIdentity requestId={request.id} />
      ) : null}

      {request.status === "verified" && !accessEnded ? (
        <EndAccess name={name} requestId={request.id} />
      ) : null}

      {accessEnded || request.status === "processing" ? (
        <RecordsStillHeld requestId={request.id} />
      ) : null}
    </SheetFrame>
  )
}

function useRefreshPrivacy(requestId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries(
        trpc.accountPrivacy.operatorRequest.queryFilter({ requestId })
      ),
      queryClient.invalidateQueries(
        trpc.accountPrivacy.operatorQueue.queryFilter()
      ),
    ])
}

function NoteField({
  hint,
  id,
  label,
  onChange,
  value,
}: {
  hint: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  const short = value.trim().length < minNote
  return (
    <div className="grid gap-2">
      <label className="text-base font-medium" htmlFor={id}>
        {label}
      </label>
      <Textarea
        className="min-h-28 text-base"
        id={id}
        maxLength={2000}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <p className="text-sm text-muted-foreground">
        {hint}
        {short && value.length > 0 ? ` Write at least ${minNote} letters.` : ""}
      </p>
    </div>
  )
}

function CheckIdentity({ requestId }: { requestId: string }) {
  const trpc = useTRPC()
  const refresh = useRefreshPrivacy(requestId)
  const [note, setNote] = useState("")
  const verify = useMutation(
    trpc.accountPrivacy.verify.mutationOptions({
      onSuccess: async () => {
        setNote("")
        await refresh()
      },
    })
  )

  return (
    <RequestSection title="Check it is really them">
      <NoteField
        hint="Don't write passwords or ID numbers. Saving this does not delete anything."
        id="privacy-check-note"
        label="How did you check?"
        onChange={setNote}
        value={note}
      />
      {verify.isError ? (
        <p className="text-base text-destructive" role="alert">
          The check could not be saved. Close this and open the request again.
        </p>
      ) : null}
      <Button
        className="h-12 justify-self-start px-6 text-base"
        disabled={verify.isPending || note.trim().length < minNote}
        onClick={() =>
          verify.mutate({ requestId, verificationEvidence: note.trim() })
        }
      >
        {verify.isPending ? "Saving…" : "Save check"}
      </Button>
    </RequestSection>
  )
}

function EndAccess({ name, requestId }: { name: string; requestId: string }) {
  const trpc = useTRPC()
  const refresh = useRefreshPrivacy(requestId)
  const [note, setNote] = useState("")
  const [confirming, setConfirming] = useState(false)
  const scope = useQuery(
    trpc.accountPrivacy.revocationScope.queryOptions({ requestId })
  )
  const memberships = scope.data?.memberships ?? []
  const revoke = useMutation(
    trpc.accountPrivacy.revokeAccess.mutationOptions({
      onSuccess: async () => {
        setConfirming(false)
        setNote("")
        await refresh()
      },
      onError: () => void scope.refetch(),
    })
  )
  const cooperatives = plural(memberships.length, "cooperative")

  return (
    <RequestSection title="End their access">
      {scope.isPending ? (
        <p className="text-base text-muted-foreground" role="status">
          Loading their cooperatives…
        </p>
      ) : scope.isError ? (
        <div className="grid justify-items-start gap-3" role="alert">
          <p className="text-base">Their cooperatives could not be loaded.</p>
          <Button
            size="touch"
            className="px-5 text-base"
            onClick={() => void scope.refetch()}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-base">
            {memberships.length
              ? `They can sign in to ${cooperatives}:`
              : "They are not in any cooperative now."}
          </p>
          {memberships.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {memberships.map((membership) => (
                <li
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-base"
                  key={membership.id}
                >
                  <span className="font-medium">{membership.tenant.name}</span>
                  <span className="text-muted-foreground">
                    {getRoleDisplayName(membership.role as CooperativeRole)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <NoteField
        hint="If they run a cooperative, name who takes over. Don't write passwords or ID numbers."
        id="privacy-handover-note"
        label="Who takes over, and which money records must we keep?"
        onChange={setNote}
        value={note}
      />
      {revoke.isError ? (
        <p className="text-base text-destructive" role="alert">
          Access was not ended. {revoke.error.message}
        </p>
      ) : null}
      <Button
        className="h-12 justify-self-start px-6 text-base"
        disabled={
          !scope.data || scope.isFetching || note.trim().length < minNote
        }
        onClick={() => setConfirming(true)}
        variant="destructive"
      >
        End access…
      </Button>

      <RequestConfirmDialog
        confirmLabel="End access"
        description={`${name} will be signed out everywhere${memberships.length ? ` and can no longer sign in to ${cooperatives}` : ""}. Their password, phone number, phone app sign-ins and alerts are removed, and their name and email are replaced. Money records stay, and app store subscriptions are not cancelled. This cannot be undone.`}
        destructive
        facts={memberships.map((membership) => ({
          label: getRoleDisplayName(membership.role as CooperativeRole),
          value: membership.tenant.name,
        }))}
        onConfirm={() =>
          revoke.mutate({
            requestId,
            confirmed: true,
            handoverAndRetentionEvidence: note.trim(),
            reviewedMemberships: memberships.map(({ id, role, tenantId }) => ({
              id,
              role,
              tenantId,
            })),
          })
        }
        onOpenChange={setConfirming}
        open={confirming}
        pending={revoke.isPending}
        title={`End ${name}'s access?`}
      />
    </RequestSection>
  )
}

function RecordsStillHeld({ requestId }: { requestId: string }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<PrivacyNoteCategory>(
    "member_profile_documents"
  )
  const [note, setNote] = useState("")
  const inventory = useQuery(
    trpc.accountPrivacy.processingInventory.queryOptions({ requestId })
  )
  const save = useMutation(
    trpc.accountPrivacy.recordProcessingNote.mutationOptions({
      onSuccess: async () => {
        setNote("")
        await queryClient.invalidateQueries(
          trpc.accountPrivacy.processingInventory.queryFilter({ requestId })
        )
      },
    })
  )

  if (inventory.isPending) {
    return (
      <RequestSection title="What is still kept">
        <p className="text-base text-muted-foreground" role="status">
          Loading…
        </p>
      </RequestSection>
    )
  }

  if (!inventory.data) {
    return (
      <RequestSection title="What is still kept">
        <div className="grid justify-items-start gap-3" role="alert">
          <p className="text-base">This could not be loaded.</p>
          <Button
            size="touch"
            className="px-5 text-base"
            onClick={() => void inventory.refetch()}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      </RequestSection>
    )
  }

  const { counts, notes } = inventory.data
  const linked = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <>
      <RequestSection title="What is still kept">
        <p className="text-base">
          {plural(linked, "record")} still point to this person. Removing them
          is a separate step; nothing here deletes records.
        </p>
        <details className="rounded-lg border border-border p-4 text-base">
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Show every kind of record
          </summary>
          <div className="mt-3 text-sm">
            <PrivacyProcessingCountList counts={counts} />
          </div>
        </details>
      </RequestSection>

      <RequestSection title="What was done">
        {notes.length ? (
          <ol className="grid gap-3">
            {notes.map((entry, index) => (
              <li
                className="rounded-lg border border-border p-4"
                key={`${entry.recordedAt}-${index}`}
              >
                <p className="font-medium">
                  {privacyNoteCategoryWords[entry.category]}
                </p>
                <p className="text-base [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {entry.evidence}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateAndTime(entry.recordedAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-base text-muted-foreground">
            Nothing written yet.
          </p>
        )}
        <div className="grid gap-2">
          <label className="text-base font-medium" htmlFor="privacy-note-kind">
            About
          </label>
          <select
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            id="privacy-note-kind"
            onChange={(event) =>
              setCategory(event.target.value as PrivacyNoteCategory)
            }
            value={category}
          >
            {Object.entries(privacyNoteCategoryWords).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <NoteField
          hint="Say what was removed or kept, where, and why. Don't write passwords or ID numbers."
          id="privacy-done-note"
          label="What did you do?"
          onChange={setNote}
          value={note}
        />
        {save.isError ? (
          <p className="text-base text-destructive" role="alert">
            The note could not be saved. Try again.
          </p>
        ) : null}
        <Button
          className="h-12 justify-self-start px-6 text-base"
          disabled={save.isPending || note.trim().length < minNote}
          onClick={() =>
            save.mutate({ requestId, category, evidence: note.trim() })
          }
        >
          {save.isPending ? "Saving…" : "Save note"}
        </Button>
      </RequestSection>
    </>
  )
}
