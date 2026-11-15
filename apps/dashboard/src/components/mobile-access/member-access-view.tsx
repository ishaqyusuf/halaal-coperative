"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Label } from "@halaalvest/ui/components/label"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useTRPC } from "@/trpc/client"
import { AccessConfirmDialog } from "./access-confirm-dialog"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import {
  formatAccessAmount,
  formatAccessDate,
  formatAccessDay,
  memberAccessStatusLabel,
} from "./format"

const blockedReasonText = {
  no_password:
    "You need a password to use the app. Set one from the sign-in page with “Forgot password”, then come back.",
  no_cooperative_number:
    "Your cooperative has not set up cooperative numbers yet. Ask them to finish mobile app setup.",
} as const

/**
 * A member's own mobile app access: turn it on after agreeing to the charge
 * (or ask, when the cooperative reviews requests), turn it off and back on.
 */
export function MemberAccessView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const status = useQuery(
    trpc.cooperativeMobileAccess.memberStatus.queryOptions()
  )
  const [acceptedVersion, setAcceptedVersion] = useState<string>()
  const [confirmingOff, setConfirmingOff] = useState(false)
  const refresh = () =>
    queryClient.invalidateQueries(
      trpc.cooperativeMobileAccess.memberStatus.queryFilter()
    )
  const accept = useMutation(
    trpc.cooperativeMobileAccess.accept.mutationOptions({
      onSettled: async () => {
        setAcceptedVersion(undefined)
        await refresh()
      },
    })
  )
  const turnOff = useMutation(
    trpc.cooperativeMobileAccess.turnOff.mutationOptions({
      onSuccess: () => setConfirmingOff(false),
      onSettled: refresh,
    })
  )
  const turnBackOn = useMutation(
    trpc.cooperativeMobileAccess.turnBackOn.mutationOptions({
      onSettled: refresh,
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
    acceptTurnsOn,
    canTurnOff,
    canTurnBackOn,
    turnedOffBy,
    blockedReason,
    cooperativeNumber,
    enabled,
    amount,
    currencyCode,
    termMonths,
    termsVersion,
  } = status.data
  const price = formatAccessAmount(amount, currencyCode)
  const hasAccepted = acceptedVersion === termsVersion
  const acceptLabel = acceptTurnsOn
    ? "Turn on the app"
    : term
      ? "Ask again"
      : "Ask for the app"
  const paidAt = term?.payment?.status === "posted" ? term.payment.paidAt : null
  const mutationError =
    accept.error?.message ?? turnBackOn.error?.message ?? null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canRequest && hasAccepted && !accept.isPending && !status.isError) {
      accept.mutate({ termsVersion, accepted: true })
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

          {turnedOffBy === "member" && term.endsAt ? (
            <p className="text-base">
              You turned the app off. You can turn it back on until{" "}
              {formatAccessDate(term.endsAt)} without paying again.
            </p>
          ) : null}

          {turnedOffBy === "cooperative" ? (
            <p className="text-base">
              Your cooperative turned the app off. Ask them to turn it back on.
            </p>
          ) : null}

          {term.reviewNote &&
          (term.status === "rejected" ||
            (term.status === "revoked" && turnedOffBy === "cooperative")) ? (
            <p className="text-base break-words">Reason: {term.reviewNote}</p>
          ) : null}

          {term.chargeDueAt ? (
            <p className="text-base text-muted-foreground">
              {paidAt
                ? `You paid ${formatAccessAmount(term.amount, term.currencyCode)} on ${formatAccessDate(paidAt)}.`
                : `${formatAccessAmount(term.amount, term.currencyCode)} is due on ${formatAccessDay(term.chargeDueAt)}.`}
            </p>
          ) : null}

          {canTurnOff ? (
            <Button
              className="h-11 text-base"
              onClick={() => {
                turnOff.reset()
                setConfirmingOff(true)
              }}
              type="button"
              variant="outline"
            >
              Turn off the app
            </Button>
          ) : null}

          {canTurnBackOn ? (
            <Button
              className="h-11 px-5 text-base"
              disabled={turnBackOn.isPending}
              onClick={() => turnBackOn.mutate()}
              type="button"
            >
              {turnBackOn.isPending ? "Turning on…" : "Turn the app back on"}
            </Button>
          ) : null}
        </section>
      ) : null}

      {!enabled && term?.status !== "active" && !canTurnBackOn ? (
        <p className="text-base">
          Your cooperative is not giving out the app right now. Ask them about
          it.
        </p>
      ) : null}

      {blockedReason ? (
        <p className="text-base">{blockedReasonText[blockedReason]}</p>
      ) : null}

      {enabled &&
      !term &&
      !canRequest &&
      !blockedReason &&
      !status.isError ? (
        <p className="text-base">
          You can&apos;t get the app yet. Ask your cooperative to check your
          membership.
        </p>
      ) : null}

      {status.isError ? (
        <MobileAccessLoadError
          message="We couldn't check your access. Try again before turning it on."
          retry={() => void status.refetch()}
        />
      ) : null}

      {canRequest && !status.isError ? (
        <form
          aria-labelledby="mobile-access-ask"
          className="space-y-4"
          onSubmit={submit}
        >
          <div className="space-y-2">
            <h2
              className="font-heading text-xl font-semibold"
              id="mobile-access-ask"
            >
              Get the mobile app
            </h2>
            <p className="text-base">
              The Halaalvest app shows your savings, shares and loans on your
              phone.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base text-muted-foreground">
              <li>
                It costs {price} for {termMonths} months.
              </li>
              <li>
                {acceptTurnsOn
                  ? "The charge goes on your account this month, like your other cooperative charges."
                  : "The charge goes on your account after your cooperative says yes."}
              </li>
              <li>
                If you turn the app off later, the charge is not refunded.
              </li>
            </ul>
          </div>
          <Label
            className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-normal"
            htmlFor="accept-mobile-access-charge"
          >
            <Checkbox
              checked={hasAccepted}
              className="size-6"
              disabled={accept.isPending}
              id="accept-mobile-access-charge"
              onCheckedChange={(checked) =>
                setAcceptedVersion(checked ? termsVersion : undefined)
              }
            />
            I agree to pay {price}.
          </Label>
          <Button
            className="h-11 px-5 text-base"
            disabled={!hasAccepted || accept.isPending}
            type="submit"
          >
            {accept.isPending
              ? acceptTurnsOn
                ? "Turning on…"
                : "Sending…"
              : acceptLabel}
          </Button>
        </form>
      ) : null}

      {mutationError ? (
        <p className="text-base text-destructive" role="alert">
          {mutationError}
        </p>
      ) : null}

      {confirmingOff ? (
        <AccessConfirmDialog
          confirmation={{
            title: "Turn off the app?",
            description: term?.endsAt
              ? `You will be signed out of the app. The charge is not refunded. You can turn it back on until ${formatAccessDate(term.endsAt)} without paying again.`
              : "You will be signed out of the app. The charge is not refunded.",
            actionLabel: "Turn off",
            destructive: true,
          }}
          error={turnOff.error?.message}
          onClose={() => setConfirmingOff(false)}
          onConfirm={() => turnOff.mutate()}
          pending={turnOff.isPending}
        />
      ) : null}
    </div>
  )
}
