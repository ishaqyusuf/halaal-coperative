"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Label } from "@halaalvest/ui/components/label"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import {
  accessStatusLabel,
  formatAccessAmount,
  formatAccessDate,
} from "./format"

export function MemberAccessView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const status = useQuery(
    trpc.cooperativeMobileAccess.memberStatus.queryOptions()
  )
  const [acceptedVersion, setAcceptedVersion] = useState<string>()
  const request = useMutation(
    trpc.cooperativeMobileAccess.request.mutationOptions({
      onSettled: async () => {
        setAcceptedVersion(undefined)
        await queryClient.invalidateQueries(
          trpc.cooperativeMobileAccess.memberStatus.queryFilter()
        )
      },
    })
  )

  if (status.isPending) {
    return <MobileAccessLoading label="Loading mobile access…" />
  }

  if (!status.data) {
    return (
      <MobileAccessLoadError
        message="Mobile access could not be loaded."
        retry={() => void status.refetch()}
      />
    )
  }

  const {
    term,
    canRequest,
    cooperativeNumber,
    enabled,
    memberName,
    amount,
    currencyCode,
    termMonths,
    termsVersion,
  } = status.data
  const approvedAmount = formatAccessAmount(amount, currencyCode)
  const hasAccepted = acceptedVersion === termsVersion
  const requestLabel =
    term?.status === "expired" ? "Request renewal" : "Request mobile access"

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canRequest && hasAccepted && !request.isPending && !status.isError) {
      request.mutate({ termsVersion, accepted: true })
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {term ? (
        <section className="space-y-4 border-y border-border py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {term.approvedAt
                ? "Mobile access confirmation"
                : "Your mobile access request"}
            </h2>
            <Badge variant={term.status === "active" ? "secondary" : "outline"}>
              {accessStatusLabel[term.status]}
            </Badge>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {memberName ? (
              <div>
                <dt className="text-muted-foreground">Member</dt>
                <dd>{memberName}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Requested</dt>
              <dd>{formatAccessDate(term.requestedAt)}</dd>
            </div>
            {term.startsAt ? (
              <div>
                <dt className="text-muted-foreground">Access starts</dt>
                <dd>{formatAccessDate(term.startsAt)}</dd>
              </div>
            ) : null}
            {term.endsAt ? (
              <div>
                <dt className="text-muted-foreground">Access ends</dt>
                <dd>{formatAccessDate(term.endsAt)}</dd>
              </div>
            ) : null}
            {term.chargeDueAt ? (
              <div>
                <dt className="text-muted-foreground">
                  Cooperative charge due
                </dt>
                <dd>
                  {formatAccessAmount(term.amount, term.currencyCode)} on{" "}
                  {formatAccessDate(term.chargeDueAt)}
                </dd>
              </div>
            ) : null}
            {term.approvedAt ? (
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-muted-foreground">Activation reference</dt>
                <dd className="break-all">{term.id}</dd>
              </div>
            ) : null}
          </dl>
          {term.status === "active" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sign in to the Halaalvest app with your cooperative number and
                your existing password.
              </p>
              {cooperativeNumber ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    Cooperative number{" "}
                  </span>
                  <span className="font-medium">{cooperativeNumber}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          {term.status === "pending" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your cooperative will review your request. You can sign in to
                the app after approval.
              </p>
              <Button
                disabled={status.isFetching}
                onClick={() => void status.refetch()}
                type="button"
                variant="outline"
              >
                Refresh status
              </Button>
            </div>
          ) : null}
          {term.reviewNote &&
          (term.status === "rejected" || term.status === "revoked") ? (
            <p className="text-sm break-words text-muted-foreground">
              {term.reviewNote}
            </p>
          ) : null}
        </section>
      ) : null}

      {term?.payment?.status === "posted" && term.payment.paidAt ? (
        <section className="space-y-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              Cooperative charge receipt
            </h2>
            <Badge variant="secondary">Paid</Badge>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {memberName ? (
              <div>
                <dt className="text-muted-foreground">Member</dt>
                <dd>{memberName}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Amount paid</dt>
              <dd>{formatAccessAmount(term.amount, term.currencyCode)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment date</dt>
              <dd>{formatAccessDate(term.payment.paidAt)}</dd>
            </div>
            {term.payment.reference ? (
              <div className="min-w-0">
                <dt className="text-muted-foreground">Payment reference</dt>
                <dd className="break-all">{term.payment.reference}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {!enabled && !term ? (
        <WorkspaceEmptyState
          title="Mobile requests are unavailable"
          body="Contact your cooperative about mobile access."
        />
      ) : null}

      {enabled && !term && !canRequest && !status.isError ? (
        <WorkspaceEmptyState
          title="You can’t request mobile access yet"
          body="Ask your cooperative to check your membership."
        />
      ) : null}

      {!enabled && term?.status !== "active" && term ? (
        <p className="text-sm text-muted-foreground">
          Your cooperative has paused new mobile access requests.
        </p>
      ) : null}

      {status.isError ? (
        <MobileAccessLoadError
          message="We couldn’t refresh your mobile access. Refresh it before submitting a request."
          retry={() => void status.refetch()}
        />
      ) : null}

      {canRequest && !status.isError ? (
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <h2 className="text-sm font-semibold">{requestLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {approvedAmount} for {termMonths} months, starting when your
              cooperative approves the request. Your cooperative charge is due
              at the end of the approval month. Renewal requires a new request.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              checked={hasAccepted}
              disabled={request.isPending}
              id="accept-mobile-access-charge"
              onCheckedChange={(checked) =>
                setAcceptedVersion(checked ? termsVersion : undefined)
              }
            />
            <Label
              className="leading-normal"
              htmlFor="accept-mobile-access-charge"
            >
              I agree to the {approvedAmount} cooperative charge if this request
              is approved.
            </Label>
          </div>
          <Button disabled={!hasAccepted || request.isPending} type="submit">
            {request.isPending ? "Submitting…" : requestLabel}
          </Button>
        </form>
      ) : null}
      {request.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {request.error.message}
        </p>
      ) : null}
    </div>
  )
}
