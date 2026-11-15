"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useState } from "react"
import {
  type MobileAccessListStatus,
  useMobileAccessFilterParams,
} from "@/hooks/use-mobile-access-filter-params"
import { useMobileAccessParams } from "@/hooks/use-mobile-access-params"
import { useTRPC } from "@/trpc/client"
import {
  type AccessConfirmation,
  AccessConfirmDialog,
} from "./access-confirm-dialog"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import { formatAccessAmount, formatAccessDate } from "./format"

const GiveAccessSheet = dynamic(() =>
  import("./give-access-sheet").then((module) => module.GiveAccessSheet)
)

export const accessListPageSize = 25

const listTabs: {
  status: MobileAccessListStatus
  label: string
  empty: string
  /** Shown only when it has rows or is selected. */
  optional?: boolean
}[] = [
  { status: "pending", label: "Waiting", empty: "No one is waiting." },
  { status: "active", label: "Have the app", empty: "No one has the app yet." },
  {
    status: "off",
    label: "Turned off",
    empty: "No one is turned off.",
    optional: true,
  },
  {
    status: "declined",
    label: "Declined",
    empty: "No declined requests.",
    optional: true,
  },
  {
    status: "ended",
    label: "Ended",
    empty: "No ended access.",
    optional: true,
  },
]

type Decision =
  | {
      kind: "approve" | "decline" | "turnOff" | "turnOn"
      termId: string
      memberName: string
      endsAt?: Date | string | null
    }
  | { kind: "enrollment"; enabled: boolean }
  | { kind: "selfService"; enabled: boolean }

export function AdminAccessView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { filter, setFilter } = useMobileAccessFilterParams()
  const { setParams } = useMobileAccessParams()
  const [decision, setDecision] = useState<Decision>()

  const summary = useQuery(trpc.cooperativeMobileAccess.summary.queryOptions())
  const list = useInfiniteQuery(
    trpc.cooperativeMobileAccess.queue.infiniteQueryOptions(
      { status: filter.accessList, limit: accessListPageSize },
      { getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined }
    )
  )

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.cooperativeMobileAccess.summary.queryFilter()
      ),
      queryClient.invalidateQueries(
        trpc.cooperativeMobileAccess.queue.infiniteQueryFilter()
      ),
      queryClient.invalidateQueries(
        trpc.cooperativeMobileAccess.members.infiniteQueryFilter()
      ),
    ])
  }

  const done = {
    onSuccess: async () => {
      await refresh()
      setDecision(undefined)
    },
  }
  const review = useMutation(
    trpc.cooperativeMobileAccess.review.mutationOptions(done)
  )
  const revoke = useMutation(
    trpc.cooperativeMobileAccess.revoke.mutationOptions(done)
  )
  const reinstate = useMutation(
    trpc.cooperativeMobileAccess.reinstate.mutationOptions(done)
  )
  const enrollment = useMutation(
    trpc.cooperativeMobileAccess.setEnabled.mutationOptions(done)
  )
  const selfService = useMutation(
    trpc.cooperativeMobileAccess.setSelfService.mutationOptions(done)
  )
  const mutations = [review, revoke, reinstate, enrollment, selfService]
  const pending = mutations.some((mutation) => mutation.isPending)
  const error = mutations.find((mutation) => mutation.error)?.error?.message

  function open(next: Decision) {
    for (const mutation of mutations) mutation.reset()
    setDecision(next)
  }

  if (summary.isPending) {
    return <MobileAccessLoading label="Loading mobile access…" />
  }
  if (!summary.data) {
    return (
      <MobileAccessLoadError
        message="Mobile access could not be loaded."
        retry={() => void summary.refetch()}
      />
    )
  }

  const settings = summary.data
  const { counts } = settings
  const price = formatAccessAmount(settings.amount, settings.currencyCode)
  const cost = `${price} per member for ${settings.termMonths} months.`
  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const activeTab =
    listTabs.find((tab) => tab.status === filter.accessList) ?? listTabs[0]!
  const tabs = listTabs.filter(
    (tab) =>
      !tab.optional || counts[tab.status] > 0 || tab.status === activeTab.status
  )

  function confirm(reason: string) {
    if (!decision || pending) return
    const note = reason || undefined
    switch (decision.kind) {
      case "approve":
        return review.mutate({ termId: decision.termId, decision: "approve" })
      case "decline":
        return review.mutate({
          termId: decision.termId,
          decision: "reject",
          note,
        })
      case "turnOff":
        return revoke.mutate({ termId: decision.termId, note: reason })
      case "turnOn":
        return reinstate.mutate({ termId: decision.termId, note })
      case "enrollment":
        return enrollment.mutate({
          enabled: decision.enabled,
          termsVersion: settings.termsVersion,
        })
      case "selfService":
        return selfService.mutate({ enabled: decision.enabled })
    }
  }

  return (
    <section aria-labelledby="mobile-access-members" className="space-y-6">
      <div className="space-y-4 rounded-(--ui-radius-surface) border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1">
          <h2
            className="font-heading text-xl font-semibold"
            id="mobile-access-members"
          >
            {settings.enabled
              ? "The mobile app is on"
              : "The mobile app is off"}
          </h2>
          <p className="text-base text-muted-foreground">
            {settings.enabled
              ? `${counts.active} ${counts.active === 1 ? "member has" : "members have"} the app. ${cost}`
              : `Turn it on to let members use the app. ${cost}`}
          </p>
          {settings.enabled ? (
            <p className="text-base text-muted-foreground">
              {settings.selfService
                ? "Members turn it on themselves after agreeing to the charge."
                : "Members ask for it, and you approve each one."}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {settings.enabled ? (
            <>
              <Button
                className="h-11 px-5 text-base"
                onClick={() => void setParams({ mobileAccess: "give" })}
                type="button"
              >
                Give access
              </Button>
              <Button
                className="h-11 text-base"
                onClick={() =>
                  open({ kind: "selfService", enabled: !settings.selfService })
                }
                type="button"
                variant="outline"
              >
                {settings.selfService
                  ? "Approve each member"
                  : "Let members turn it on"}
              </Button>
              <Button
                className="h-11 text-base"
                onClick={() => open({ kind: "enrollment", enabled: false })}
                type="button"
                variant="outline"
              >
                Pause the app
              </Button>
            </>
          ) : (
            <Button
              className="h-11 px-5 text-base"
              onClick={() => open({ kind: "enrollment", enabled: true })}
              type="button"
            >
              Turn on
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div
          aria-label="Members"
          className="flex flex-wrap gap-x-1 border-b border-border"
          role="tablist"
        >
          {tabs.map((tab) => {
            const selected = tab.status === activeTab.status
            return (
              <Button
                aria-controls="mobile-access-list"
                aria-selected={selected}
                className={cn(
                  "h-11 shrink-0 rounded-none border-b-2 px-3 text-base shadow-none",
                  selected
                    ? "border-b-foreground font-semibold text-foreground"
                    : "border-transparent text-muted-foreground"
                )}
                id={`mobile-access-${tab.status}-tab`}
                key={tab.status}
                onClick={() => void setFilter({ accessList: tab.status })}
                role="tab"
                type="button"
                variant="ghost"
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums">
                  {counts[tab.status]}
                </span>
              </Button>
            )
          })}
        </div>

        <div
          aria-labelledby={`mobile-access-${activeTab.status}-tab`}
          id="mobile-access-list"
          role="tabpanel"
        >
          {list.isPending ? (
            <MobileAccessLoading label="Loading members…" />
          ) : null}
          {list.isError && !list.isFetchNextPageError ? (
            <MobileAccessLoadError
              message="This list could not be loaded."
              retry={() => void list.refetch()}
            />
          ) : null}
          {list.data && items.length === 0 ? (
            <p className="py-6 text-base text-muted-foreground">
              {activeTab.empty}
            </p>
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-border">
              {items.map((term) => (
                <li
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={term.id}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-base font-medium break-words">
                      {term.memberName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {term.memberNumber}
                      {" · "}
                      {rowDetail(activeTab.status, term)}
                    </p>
                    {term.reviewNote &&
                    (term.status === "rejected" ||
                      term.status === "revoked") ? (
                      <p className="text-sm break-words text-muted-foreground">
                        Reason: {term.reviewNote}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {term.status === "pending" ? (
                      <>
                        <Button
                          aria-label={`Approve ${term.memberName}`}
                          className="h-11 min-w-28 text-base"
                          disabled={!settings.enabled}
                          onClick={() =>
                            open({
                              kind: "approve",
                              termId: term.id,
                              memberName: term.memberName,
                            })
                          }
                          type="button"
                        >
                          Approve
                        </Button>
                        <Button
                          aria-label={`Decline ${term.memberName}`}
                          className="h-11 text-base"
                          onClick={() =>
                            open({
                              kind: "decline",
                              termId: term.id,
                              memberName: term.memberName,
                            })
                          }
                          type="button"
                          variant="outline"
                        >
                          Decline
                        </Button>
                      </>
                    ) : null}
                    {term.canTurnOff ? (
                      <Button
                        aria-label={`Turn off the app for ${term.memberName}`}
                        className="h-11 text-base"
                        onClick={() =>
                          open({
                            kind: "turnOff",
                            termId: term.id,
                            memberName: term.memberName,
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        Turn off
                      </Button>
                    ) : null}
                    {term.canTurnOn ? (
                      <Button
                        aria-label={`Turn the app back on for ${term.memberName}`}
                        className="h-11 text-base"
                        onClick={() =>
                          open({
                            kind: "turnOn",
                            termId: term.id,
                            memberName: term.memberName,
                            endsAt: term.endsAt,
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        Turn back on
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {list.isFetchNextPageError ? (
            <p className="text-base text-destructive" role="alert">
              More members could not be loaded.
            </p>
          ) : null}
          {list.hasNextPage ? (
            <Button
              className="mt-2 h-11 text-base"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
              type="button"
              variant="outline"
            >
              {list.isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          ) : null}
        </div>
      </div>

      {decision ? (
        <AccessConfirmDialog
          confirmation={confirmationFor(decision, price, settings.termMonths)}
          error={error}
          key={
            decision.kind === "enrollment" || decision.kind === "selfService"
              ? decision.kind
              : decision.termId
          }
          onClose={() => setDecision(undefined)}
          onConfirm={confirm}
          pending={pending}
        />
      ) : null}

      {settings.enabled ? (
        <GiveAccessSheet
          price={price}
          termMonths={settings.termMonths}
          termsVersion={settings.termsVersion}
        />
      ) : null}
    </section>
  )
}

function rowDetail(
  status: MobileAccessListStatus,
  term: { requestedAt: Date | string; endsAt: Date | string | null }
) {
  switch (status) {
    case "pending":
      return `Asked on ${formatAccessDate(term.requestedAt)}`
    case "active":
    case "off":
      return term.endsAt ? `Until ${formatAccessDate(term.endsAt)}` : ""
    case "declined":
      return `Asked on ${formatAccessDate(term.requestedAt)}`
    case "ended":
      return term.endsAt ? `Ended ${formatAccessDate(term.endsAt)}` : "Ended"
  }
}

function confirmationFor(
  decision: Decision,
  price: string,
  termMonths: number
): AccessConfirmation {
  switch (decision.kind) {
    case "approve":
      return {
        title: `Approve ${decision.memberName}?`,
        description: `They can use the app now. ${price} for ${termMonths} months is added to their account at the end of this month.`,
        actionLabel: "Approve",
      }
    case "decline":
      return {
        title: `Decline ${decision.memberName}?`,
        description: "They can ask again later.",
        actionLabel: "Decline",
        destructive: true,
        reason: "optional",
      }
    case "turnOff":
      return {
        title: `Turn off the app for ${decision.memberName}?`,
        description: `They can no longer sign in to the app. The ${price} charge still stands.`,
        actionLabel: "Turn off",
        destructive: true,
        reason: "required",
      }
    case "turnOn":
      return {
        title: `Turn the app back on for ${decision.memberName}?`,
        description: decision.endsAt
          ? `They can use it until ${formatAccessDate(decision.endsAt)}. There is no new charge.`
          : "There is no new charge.",
        actionLabel: "Turn back on",
      }
    case "enrollment":
      return decision.enabled
        ? {
            title: "Turn on the mobile app?",
            description: `Your cooperative pays Halaalvest ${price} for each member who gets the app, for ${termMonths} months. Members can turn it on themselves after agreeing to the charge. You get one bill at the end of each month.`,
            actionLabel: "Turn on",
          }
        : {
            title: "Pause the mobile app?",
            description:
              "No one new can get the app, and staff can't use it. Members who have it keep it, and their charges still stand.",
            actionLabel: "Pause",
            destructive: true,
          }
    case "selfService":
      return decision.enabled
        ? {
            title: "Let members turn the app on themselves?",
            description: `A member who agrees to pay ${price} for ${termMonths} months gets the app straight away. Anyone already waiting can turn it on too. You can still turn anyone off.`,
            actionLabel: "Let members turn it on",
          }
        : {
            title: "Approve each member yourself?",
            description:
              "Members ask for the app and wait for you to approve them. Members who have it keep it.",
            actionLabel: "Approve each member",
          }
  }
}
