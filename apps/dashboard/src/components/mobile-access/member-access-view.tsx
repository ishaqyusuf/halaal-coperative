"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Label } from "@halaalvest/ui/components/label"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import {
  formatAccessAmount,
  formatAccessDate,
  formatAccessDay,
  memberAccessStatusLabel,
} from "./format"

/** A member's own mobile app access: what they have, or how to ask for it. */
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
    amount,
    currencyCode,
    termMonths,
    termsVersion,
  } = status.data
  const price = formatAccessAmount(amount, currencyCode)
  const hasAccepted = acceptedVersion === termsVersion
  const askLabel = term ? "Ask again" : "Ask for the app"
  const paidAt = term?.payment?.status === "posted" ? term.payment.paidAt : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canRequest && hasAccepted && !request.isPending && !status.isError) {
      request.mutate({ termsVersion, accepted: true })
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {term ? (
        <section
          aria-labelledby="mobile-access-status"
          className="space-y-3 rounded-(--ui-radius-surface) border border-border bg-card p-4 sm:p-5"
        >
          <h2
            className="font-heading text-xl font-semibold"
            id="mobile-access-status"
          >
            {memberAccessStatusLabel[term.status]}
          </h2>

          {term.status === "active" ? (
            <>
              <p className="text-base">
                Sign in to the Halaalvest app with your cooperative number and
                your usual password.
              </p>
              {cooperativeNumber ? (
                <p className="text-base">
                  <span className="text-muted-foreground">
                    Cooperative number
                  </span>
                  <br />
                  <span className="font-heading text-2xl font-semibold tracking-wide">
                    {cooperativeNumber}
                  </span>
                </p>
              ) : null}
              {term.endsAt ? (
                <p className="text-base text-muted-foreground">
                  Works until {formatAccessDate(term.endsAt)}.
                </p>
              ) : null}
            </>
          ) : null}

          {term.status === "pending" ? (
            <>
              <p className="text-base">
                You asked on {formatAccessDate(term.requestedAt)}. Your
                cooperative will reply.
              </p>
              <Button
                className="h-11 text-base"
                disabled={status.isFetching}
                onClick={() => void status.refetch()}
                type="button"
                variant="outline"
              >
                {status.isFetching ? "Checking…" : "Check again"}
              </Button>
            </>
          ) : null}

          {term.status === "expired" && term.endsAt ? (
            <p className="text-base">
              Your access ended on {formatAccessDate(term.endsAt)}.
            </p>
          ) : null}

          {term.reviewNote &&
          (term.status === "rejected" || term.status === "revoked") ? (
            <p className="text-base break-words">Reason: {term.reviewNote}</p>
          ) : null}

          {term.chargeDueAt ? (
            <p className="text-base text-muted-foreground">
              {paidAt
                ? `You paid ${formatAccessAmount(term.amount, term.currencyCode)} on ${formatAccessDate(paidAt)}.`
                : `${formatAccessAmount(term.amount, term.currencyCode)} is due on ${formatAccessDay(term.chargeDueAt)}.`}
            </p>
          ) : null}
        </section>
      ) : null}

      {!enabled && term?.status !== "active" ? (
        <p className="text-base">
          Your cooperative is not giving out the app right now. Ask them about
          it.
        </p>
      ) : null}

      {enabled && !term && !canRequest && !status.isError ? (
        <p className="text-base">
          You can&apos;t ask for the app yet. Ask your cooperative to check your
          membership.
        </p>
      ) : null}

      {status.isError ? (
        <MobileAccessLoadError
          message="We couldn't check your access. Try again before asking."
          retry={() => void status.refetch()}
        />
      ) : null}

      {canRequest && !status.isError ? (
        <form
          aria-labelledby="mobile-access-ask"
          className="space-y-4"
          onSubmit={submit}
        >
          <div className="space-y-1">
            <h2
              className="font-heading text-xl font-semibold"
              id="mobile-access-ask"
            >
              Get the mobile app
            </h2>
            <p className="text-base text-muted-foreground">
              {price} for {termMonths} months. It is added to your account after
              your cooperative says yes.
            </p>
          </div>
          <Label
            className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-normal"
            htmlFor="accept-mobile-access-charge"
          >
            <Checkbox
              checked={hasAccepted}
              className="size-6"
              disabled={request.isPending}
              id="accept-mobile-access-charge"
              onCheckedChange={(checked) =>
                setAcceptedVersion(checked ? termsVersion : undefined)
              }
            />
            I agree to pay {price}.
          </Label>
          <Button
            className="h-11 px-5 text-base"
            disabled={!hasAccepted || request.isPending}
            type="submit"
          >
            {request.isPending ? "Sending…" : askLabel}
          </Button>
        </form>
      ) : null}
      {request.isError ? (
        <p className="text-base text-destructive" role="alert">
          {request.error.message}
        </p>
      ) : null}
    </div>
  )
}
