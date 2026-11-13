"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useState } from "react"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import { AccessReviewDialog, type AccessDecision } from "./access-review-dialog"
import { EnableMembersSheet } from "./enable-members-sheet"
import {
  accessStatusLabel,
  defaultAccessQueue,
  formatAccessAmount,
  formatAccessDate,
} from "./format"

const queueFilters = [
  { value: "pending", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
  { value: "revoked", label: "Revoked" },
] as const

export function AdminAccessView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [status, setStatus] =
    useState<(typeof queueFilters)[number]["value"]>("pending")
  const [enrollmentIntent, setEnrollmentIntent] = useState<{
    enabled: boolean
    termsVersion: string
    amount: number
    currencyCode: string
    termMonths: number
  }>()
  const [enablingMembers, setEnablingMembers] = useState(false)
  const [decision, setDecision] = useState<{
    action: AccessDecision
    termId: string
    memberName: string
  }>()
  const queue = useInfiniteQuery(
    trpc.cooperativeMobileAccess.queue.infiniteQueryOptions(
      { ...defaultAccessQueue, status },
      { getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined }
    )
  )

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.cooperativeMobileAccess.queue.infiniteQueryFilter()
      ),
      queryClient.invalidateQueries(
        trpc.cooperativeMobileAccess.memberStatus.queryFilter()
      ),
    ])
  }

  async function finishDecision() {
    await refresh()
    setDecision(undefined)
  }

  const review = useMutation(
    trpc.cooperativeMobileAccess.review.mutationOptions({
      onSuccess: finishDecision,
    })
  )
  const revoke = useMutation(
    trpc.cooperativeMobileAccess.revoke.mutationOptions({
      onSuccess: finishDecision,
    })
  )
  const reinstate = useMutation(
    trpc.cooperativeMobileAccess.reinstate.mutationOptions({
      onSuccess: finishDecision,
    })
  )
  const enrollment = useMutation(
    trpc.cooperativeMobileAccess.setEnabled.mutationOptions({
      onSuccess: async () => {
        await refresh()
        setEnrollmentIntent(undefined)
      },
    })
  )

  const settings = queue.data?.pages[0]
  const items = queue.data?.pages.flatMap((page) => page.items) ?? []
  const decisionPending =
    review.isPending || revoke.isPending || reinstate.isPending

  function openDecision(
    action: AccessDecision,
    termId: string,
    memberName: string
  ) {
    review.reset()
    revoke.reset()
    reinstate.reset()
    setDecision({ action, termId, memberName })
  }

  function submitDecision(note: string) {
    if (!decision || decisionPending) return
    const { action, termId } = decision
    if (action === "revoke") {
      revoke.mutate({ termId, note })
    } else if (action === "reinstate") {
      reinstate.mutate({ termId, note })
    } else {
      review.mutate({ termId, decision: action, note: note || undefined })
    }
  }

  const enrollmentAction = settings?.enabled
    ? "Pause mobile access"
    : "Turn on mobile access"

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Member access</h2>
          {settings ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {settings.enabled
                ? "Mobile access is on. Enable members directly or approve their requests."
                : "Mobile access is off. Turn it on to enable members."}
            </p>
          ) : null}
        </div>
        {settings ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!settings.enabled}
              onClick={() => setEnablingMembers(true)}
              type="button"
            >
              Enable members
            </Button>
            <Button
              disabled={queue.isFetching}
              onClick={() => void queue.refetch()}
              type="button"
              variant="outline"
            >
              Refresh requests
            </Button>
            <Button
              disabled={queue.isRefetchError}
              type="button"
              variant="outline"
              onClick={() => {
                enrollment.reset()
                setEnrollmentIntent({
                  enabled: !settings.enabled,
                  termsVersion: settings.termsVersion,
                  amount: settings.amount,
                  currencyCode: settings.currencyCode,
                  termMonths: settings.termMonths,
                })
              }}
            >
              {enrollmentAction}
            </Button>
          </div>
        ) : null}
      </div>

      <NativeSelect
        aria-label="Filter mobile access requests by status"
        value={status}
        onChange={(event) => {
          const filter = queueFilters.find(
            ({ value }) => value === event.target.value
          )
          if (filter) setStatus(filter.value)
        }}
      >
        {queueFilters.map(({ value, label }) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      {queue.isPending ? (
        <MobileAccessLoading label="Loading requests…" />
      ) : null}
      {queue.isError && !queue.isFetchNextPageError ? (
        <MobileAccessLoadError
          message="Mobile access requests could not be loaded."
          retry={() => void queue.refetch()}
        />
      ) : null}
      {settings && items.length === 0 && !queue.isError ? (
        <WorkspaceEmptyState
          title="No matching requests"
          body="Member requests with the selected status will appear here."
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((term) => (
            <li
              className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
              key={term.id}
            >
              <div>
                <p className="text-sm font-medium break-words">
                  {term.memberName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {term.memberNumber}
                </p>
              </div>
              <div className="space-y-1">
                <Badge
                  variant={term.status === "active" ? "secondary" : "outline"}
                >
                  {accessStatusLabel[term.status]}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {formatAccessAmount(term.amount, term.currencyCode)}
                  {" · "}
                  {term.endsAt
                    ? `Ends ${formatAccessDate(term.endsAt)}`
                    : `Requested ${formatAccessDate(term.requestedAt)}`}
                </p>
                {term.chargeDueAt ? (
                  <p className="text-xs text-muted-foreground">
                    Charge due {formatAccessDate(term.chargeDueAt)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {term.status === "pending" ? (
                  <>
                    <Button
                      aria-label={`Decline request for ${term.memberName}`}
                      disabled={queue.isRefetchError}
                      onClick={() =>
                        openDecision("reject", term.id, term.memberName)
                      }
                      type="button"
                      variant="outline"
                    >
                      Decline
                    </Button>
                    <Button
                      aria-label={`Approve access for ${term.memberName}`}
                      disabled={queue.isRefetchError || !settings?.enabled}
                      onClick={() =>
                        openDecision("approve", term.id, term.memberName)
                      }
                      type="button"
                    >
                      Approve
                    </Button>
                  </>
                ) : null}
                {term.status === "active" ? (
                  <Button
                    aria-label={`Revoke access for ${term.memberName}`}
                    disabled={queue.isRefetchError}
                    onClick={() =>
                      openDecision("revoke", term.id, term.memberName)
                    }
                    type="button"
                    variant="outline"
                  >
                    Revoke
                  </Button>
                ) : null}
                {term.canReinstate ? (
                  <Button
                    aria-label={`Restore access for ${term.memberName}`}
                    disabled={queue.isRefetchError}
                    onClick={() =>
                      openDecision("reinstate", term.id, term.memberName)
                    }
                    type="button"
                    variant="outline"
                  >
                    Restore
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {queue.isFetchNextPageError ? (
        <p className="text-sm text-destructive" role="alert">
          More requests could not be loaded.
        </p>
      ) : null}
      {queue.hasNextPage ? (
        <Button
          disabled={queue.isFetchingNextPage}
          onClick={() => void queue.fetchNextPage()}
          type="button"
          variant="outline"
        >
          {queue.isFetchingNextPage ? "Loading…" : "Load more requests"}
        </Button>
      ) : null}

      {decision ? (
        <AccessReviewDialog
          action={decision.action}
          error={
            review.error?.message ??
            revoke.error?.message ??
            reinstate.error?.message
          }
          key={decision.termId}
          memberName={decision.memberName}
          onClose={() => setDecision(undefined)}
          onSubmit={submitDecision}
          pending={decisionPending}
        />
      ) : null}

      {enablingMembers ? (
        <EnableMembersSheet onClose={() => setEnablingMembers(false)} />
      ) : null}

      {enrollmentIntent ? (
        <Dialog
          open
          onOpenChange={(open) =>
            !open && !enrollment.isPending && setEnrollmentIntent(undefined)
          }
        >
          <DialogContent showCloseButton={!enrollment.isPending}>
            <DialogHeader>
              <DialogTitle>
                {enrollmentIntent.enabled
                  ? "Turn on mobile access"
                  : "Pause mobile access"}
              </DialogTitle>
              <DialogDescription>
                {enrollmentIntent.enabled
                  ? `Your cooperative agrees to pay ${formatAccessAmount(enrollmentIntent.amount, enrollmentIntent.currencyCode)} per approved ${enrollmentIntent.termMonths}-month member term. Halaalvest invoices your cooperative monthly for terms due in that month.`
                  : "Pausing stops new member access and approvals and turns off staff mobile access. Previously approved members keep access and their charges remain due."}
              </DialogDescription>
            </DialogHeader>
            {enrollment.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {enrollment.error.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                disabled={enrollment.isPending}
                onClick={() => setEnrollmentIntent(undefined)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={enrollment.isPending}
                onClick={() =>
                  enrollment.mutate({
                    enabled: enrollmentIntent.enabled,
                    termsVersion: enrollmentIntent.termsVersion,
                  })
                }
                type="button"
              >
                {enrollment.isPending
                  ? "Saving…"
                  : enrollmentIntent.enabled
                    ? "Accept and enable"
                    : "Pause mobile access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  )
}
