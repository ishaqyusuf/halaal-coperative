"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { useNotifications } from "@halaalvest/notifications-react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useDeferredValue, useMemo, useState, useTransition } from "react"
import { useBusinessRefresh } from "@/components/business/use-business-refresh"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import {
  formatDateRange,
  getProfitEntryWord,
  getSeasonWord,
} from "@/lib/business/business-words"
import {
  closeProfitSeasonAction,
  shareProfitSeasonAction,
  workOutProfitSeasonSharesAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

export type ProfitSeason = RouterOutputs["business"]["season"]

type SeasonStep = "close" | "share" | "workOut"

function membersWord(count: number) {
  return count === 1 ? "1 member" : `${count} members`
}

/** What happens next for this season, in one line and at most one button. */
function getNextStep(season: ProfitSeason): {
  line: string
  step: SeasonStep | null
} {
  if (season.status === "draft") {
    return {
      line: "Open: profit can still be added. Close it when the season ends.",
      step: "close",
    }
  }

  if (season.status === "approved" && season.unsharedCount > 0) {
    return season.sharesNeedWorkingOut
      ? {
          line: "Closed. Work out each member's share before sharing.",
          step: "workOut",
        }
      : {
          line: "Each member's share is ready. Check the list, then share.",
          step: "share",
        }
  }

  if (season.status === "published") {
    return {
      line: season.publishedAt
        ? `Shared with members on ${formatDayMonthYear(season.publishedAt)}.`
        : "Shared with members.",
      step: null,
    }
  }

  return { line: "Nothing to do for this season.", step: null }
}

/**
 * A profit-sharing season: the totals, the profit in it, who gets what, and
 * the next step (close, work out shares, share) behind a confirm that names
 * the amount.
 */
export function ProfitSeasonDetails({
  canManage,
  season,
}: {
  canManage: boolean
  season: ProfitSeason
}) {
  const refresh = useBusinessRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<SeasonStep | null>(null)
  // One command id per opened confirm: a double tap or retry replays it.
  const [commandId, setCommandId] = useState(() => crypto.randomUUID())
  const [shareNote, setShareNote] = useState("")
  const word = getSeasonWord(season.status)
  const next = getNextStep(season)

  function open(step: SeasonStep) {
    setCommandId(crypto.randomUUID())
    setConfirm(step)
  }

  function run(step: SeasonStep) {
    startTransition(async () => {
      const form = objectToFormData({
        commandId,
        seasonId: season.id,
        ...(step === "share" ? { note: shareNote.trim() } : {}),
      })

      try {
        if (step === "close") {
          await closeProfitSeasonAction(form)
          showSuccess("Season closed", season.name)
        } else if (step === "workOut") {
          await workOutProfitSeasonSharesAction(form)
          showSuccess("Shares worked out", "Check who gets what, then share.")
        } else {
          await shareProfitSeasonAction(form)
          showSuccess(
            "Profit shared",
            `${formatCurrency(season.totals.toShare)} with ${membersWord(season.memberCount)}`
          )
        }
        setConfirm(null)
        await refresh(() => undefined)
      } catch (error) {
        setConfirm(null)
        showError(
          "Could not finish",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-6" data-profit-season>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={memberStateToneClassNames[word.tone]}
          variant="outline"
        >
          {word.label}
        </Badge>
        <span className="text-base text-muted-foreground">
          {formatDateRange(season.periodStart, season.periodEnd)}
        </span>
      </div>

      <RequestFacts
        items={[
          { label: "Profit made", value: formatCurrency(season.totals.profit) },
          { label: "Costs", value: formatCurrency(season.totals.costs) },
          { label: "To share", value: formatCurrency(season.totals.toShare) },
          {
            label: "Members",
            value: season.memberCount ? membersWord(season.memberCount) : null,
          },
        ]}
      />

      <p className="rounded-(--ui-radius-surface) border border-border bg-card px-4 py-3 text-base text-foreground">
        {next.line}
      </p>

      {canManage && next.step ? (
        <RequestFormActions>
          {next.step === "close" ? (
            <Button
              disabled={isPending || season.entries.length === 0}
              onClick={() => open("close")}
              type="button"
            >
              Close season
            </Button>
          ) : null}
          {next.step === "workOut" ? (
            <Button
              disabled={isPending}
              onClick={() => open("workOut")}
              type="button"
            >
              Work out shares
            </Button>
          ) : null}
          {next.step === "share" ? (
            <>
              <Button
                disabled={isPending}
                onClick={() => open("share")}
                type="button"
              >
                Share with members
              </Button>
              <Button
                disabled={isPending}
                onClick={() => open("workOut")}
                type="button"
                variant="outline"
              >
                Work out again
              </Button>
            </>
          ) : null}
        </RequestFormActions>
      ) : null}

      <RequestSection title="Profit in this season">
        {season.entries.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {season.entries.map((entry) => {
              const entryWord = getProfitEntryWord(entry)

              return (
                <li className="flex items-center gap-3 py-4" key={entry.id}>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-base font-semibold text-foreground">
                        {entry.businessName}
                      </span>
                      <Badge
                        className={memberStateToneClassNames[entryWord.tone]}
                        variant="outline"
                      >
                        {entryWord.label}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-base text-muted-foreground">
                      {formatDayMonthYear(entry.profitDate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-lg font-semibold tabular-nums">
                    {formatCurrency(entry.toShare)}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">
            No profit recorded in this season.
          </p>
        )}
      </RequestSection>

      {season.memberCount > 0 ? (
        <RequestSection title="Who gets what">
          <SeasonShareList season={season} />
          <MembersWithNothing season={season} />
        </RequestSection>
      ) : null}

      <RequestConfirmDialog
        confirmLabel="Close season"
        description="No more profit can be added to it. Then you can work out each member's share."
        facts={[
          { label: "To share", value: formatCurrency(season.totals.toShare) },
          { label: "Profit entries", value: String(season.entries.length) },
        ]}
        onConfirm={() => run("close")}
        onOpenChange={(value) => setConfirm(value ? "close" : null)}
        open={confirm === "close"}
        pending={isPending}
        title={`Close ${season.name}?`}
      />
      <RequestConfirmDialog
        confirmLabel="Work out shares"
        description="Each member's share follows their share capital on the profit date. Members see nothing until you share."
        facts={[
          { label: "To share", value: formatCurrency(season.totals.toShare) },
        ]}
        onConfirm={() => run("workOut")}
        onOpenChange={(value) => setConfirm(value ? "workOut" : null)}
        open={confirm === "workOut"}
        pending={isPending}
        title="Work out each member's share?"
      />
      <RequestConfirmDialog
        confirmLabel="Share now"
        description="Each member will see their share. This can't be undone."
        facts={[
          { label: "Season", value: season.name },
          { label: "Total", value: formatCurrency(season.sharesTotal) },
          { label: "Members", value: membersWord(season.memberCount) },
        ]}
        onConfirm={() => run("share")}
        onOpenChange={(value) => setConfirm(value ? "share" : null)}
        open={confirm === "share"}
        pending={isPending}
        title={`Share ${formatCurrency(season.sharesTotal)} with ${membersWord(season.memberCount)}?`}
      >
        <RequestField
          hint="For example, the meeting that approved it. Kept on record."
          label="Note"
          optional
        >
          <Textarea
            disabled={isPending}
            maxLength={500}
            onChange={(event) => setShareNote(event.target.value)}
            value={shareNote}
          />
        </RequestField>
      </RequestConfirmDialog>
    </div>
  )
}

/** Active members left out of this season, so nobody is missed silently. */
function MembersWithNothing({ season }: { season: ProfitSeason }) {
  // Older API responses (mid-deploy) have no list; show nothing then.
  const { count, names } = season.membersWithNothing ?? { count: 0, names: [] }
  if (count === 0) return null

  const more = count - names.length

  return (
    <div className="mt-6 grid gap-2">
      <h4 className="text-base font-semibold text-foreground">
        Get nothing this season ({count})
      </h4>
      <p className="text-base text-muted-foreground">
        They had no share capital on the profit date.
      </p>
      <p className="text-base text-foreground">
        {names.join(", ")}
        {more > 0 ? `, and ${more} more` : ""}
      </p>
    </div>
  )
}

/** Members and their share, largest first, 50 at a time. */
function SeasonShareList({ season }: { season: ProfitSeason }) {
  const trpc = useTRPC()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim())
  const input = useMemo(
    () => ({
      seasonId: season.id,
      ...(deferredSearch ? { q: deferredSearch } : {}),
    }),
    [deferredSearch, season.id]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.business.seasonShares.infiniteQueryOptions(input, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const rows = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return (
    <div className="grid gap-4">
      {season.status !== "published" ? (
        <p className="text-base text-muted-foreground">
          {"Not shared yet. Members can't see this."}
        </p>
      ) : null}
      {season.memberCount > 10 ? (
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search members</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-11 pl-10 text-base"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or number"
            type="search"
            value={search}
          />
        </label>
      ) : null}
      {rows.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((row) => (
            <li className="flex items-center gap-3 py-3" key={row.memberId}>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-foreground">
                  {row.memberName}
                </span>
                {row.memberNumber ? (
                  <span className="block text-sm text-muted-foreground">
                    {row.memberNumber}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-right text-lg font-semibold tabular-nums">
                {formatCurrency(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">No member matches.</p>
      )}
      {hasNextPage ? (
        <Button
          className="h-11 w-fit text-base"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          type="button"
          variant="outline"
        >
          {isFetchingNextPage ? "Loading..." : "Show more"}
        </Button>
      ) : null}
    </div>
  )
}
