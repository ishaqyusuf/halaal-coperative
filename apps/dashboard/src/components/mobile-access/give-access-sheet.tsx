"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { Label } from "@halaalvest/ui/components/label"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import {
  useMarkWorkflowSaved,
  WorkflowPresentation,
} from "@/components/workflow-presentation"
import { useMobileAccessParams } from "@/hooks/use-mobile-access-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { AccessConfirmDialog } from "./access-confirm-dialog"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import { plural } from "./format"

const maxSelection = 50

type GiveAccessProps = {
  price: string
  termMonths: number
  termsVersion: string
}

/**
 * Give many members the app at once (`?mobileAccess=give`). The list holds only
 * members who can get it now: they have a login and no current access.
 */
export function GiveAccessSheet(props: GiveAccessProps) {
  const { mobileAccess, setParams } = useMobileAccessParams()

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("mobileAccess", "give")}
      contentClassName="flex min-h-full flex-col"
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) void setParams({ mobileAccess: null })
      }}
      open={mobileAccess === "give"}
    >
      {mobileAccess === "give" ? (
        <GiveAccessContent
          {...props}
          onDone={() => void setParams({ mobileAccess: null })}
        />
      ) : null}
    </WorkflowPresentation>
  )
}

function GiveAccessContent({
  onDone,
  price,
  termMonths,
  termsVersion,
}: GiveAccessProps & { onDone: () => void }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const markSaved = useMarkWorkflowSaved()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim())
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [confirming, setConfirming] = useState(false)
  // Names of the last submission, for results the server could not name.
  const [submitted, setSubmitted] = useState<Map<string, string>>(new Map())

  const members = useInfiniteQuery(
    trpc.cooperativeMobileAccess.members.infiniteQueryOptions(
      { search: deferredSearch || undefined, limit: 30 },
      { getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined }
    )
  )
  const grant = useMutation(
    trpc.cooperativeMobileAccess.grant.mutationOptions({
      onSuccess: async () => {
        setSelected(new Map())
        setConfirming(false)
        markSaved()
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.cooperativeMobileAccess.members.infiniteQueryFilter()
          ),
          queryClient.invalidateQueries(
            trpc.cooperativeMobileAccess.queue.infiniteQueryFilter()
          ),
          queryClient.invalidateQueries(
            trpc.cooperativeMobileAccess.summary.queryFilter()
          ),
        ])
      },
    })
  )

  const items = members.data?.pages.flatMap((page) => page.items) ?? []
  const full = selected.size >= maxSelection

  function update(next: Map<string, string>) {
    setSelected(next)
    if (next.size === 0) markSaved()
  }

  function toggle(memberId: string, memberName: string, checked: boolean) {
    const next = new Map(selected)
    if (checked && next.size < maxSelection) next.set(memberId, memberName)
    else next.delete(memberId)
    update(next)
  }

  function selectShown() {
    const next = new Map(selected)
    for (const member of items) {
      if (next.size >= maxSelection) break
      next.set(member.memberId, member.memberName)
    }
    update(next)
  }

  const results = grant.data?.results ?? []
  const failed = results.filter((result) => result.outcome === "failed")
  const given = grant.data?.enabled ?? 0
  const allShownSelected =
    items.length > 0 && items.every((member) => selected.has(member.memberId))

  return (
    <>
      <SheetHeader className="gap-1 px-4 pt-4 sm:px-6">
        <SheetTitle className="font-heading text-2xl font-semibold">
          Give access
        </SheetTitle>
        <SheetDescription className="text-base text-muted-foreground">
          {price} per member for {termMonths} months.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-6">
        {grant.data ? (
          <div
            className="space-y-1 rounded-(--ui-radius-control) border border-border bg-muted px-4 py-3 text-base"
            role="status"
          >
            {given > 0 ? (
              <p className="font-medium">
                {given === 1
                  ? `${results.find((result) => result.outcome === "enabled")?.memberName ?? "1 member"} can now use the app.`
                  : `${given} members can now use the app.`}
              </p>
            ) : null}
            {given === 0 && failed.length === 0 ? (
              <p className="font-medium">They already have the app.</p>
            ) : null}
            {failed.map((result) => (
              <p className="text-destructive" key={result.memberId}>
                {result.memberName ??
                  submitted.get(result.memberId) ??
                  "A member"}
                : {result.message}
              </p>
            ))}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label className="text-base" htmlFor="give-access-search">
            Find a member
          </Label>
          <Input
            autoComplete="off"
            className="h-11 text-base"
            id="give-access-search"
            onChange={(event) => {
              setSearch(event.target.value)
              if (selected.size === 0) markSaved()
            }}
            placeholder="Name or member number"
            type="search"
            value={search}
          />
        </div>

        {members.isPending ? (
          <MobileAccessLoading label="Loading members…" />
        ) : null}
        {members.isError && !members.isFetchNextPageError ? (
          <MobileAccessLoadError
            message="Members could not be loaded."
            retry={() => void members.refetch()}
          />
        ) : null}
        {members.data && items.length === 0 ? (
          <p className="py-2 text-base text-muted-foreground">
            {deferredSearch
              ? "No one found. A member needs a login before they can get the app."
              : "Everyone with a login already has the app."}
          </p>
        ) : null}

        {items.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Members with a login who don&apos;t have the app.
              </p>
              <Button
                size="touch"
                className="shrink-0 text-base"
                disabled={grant.isPending || full || allShownSelected}
                onClick={selectShown}
                type="button"
                variant="ghost"
              >
                Select all
              </Button>
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {items.map((member) => {
                const id = `give-access-${member.memberId}`
                const checked = selected.has(member.memberId)
                return (
                  <li key={member.memberId}>
                    <Label
                      className="flex min-h-14 cursor-pointer items-center gap-3 py-2 font-normal"
                      htmlFor={id}
                    >
                      <Checkbox
                        checked={checked}
                        className="size-6"
                        disabled={grant.isPending || (!checked && full)}
                        id={id}
                        onCheckedChange={(value) =>
                          toggle(member.memberId, member.memberName, value)
                        }
                      />
                      <span className="grid min-w-0 flex-1">
                        <span className="text-base font-medium break-words">
                          {member.memberName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {member.memberNumber}
                          {member.requested ? " · Asked for the app" : null}
                        </span>
                      </span>
                    </Label>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {members.isFetchNextPageError ? (
          <p className="text-base text-destructive" role="alert">
            More members could not be loaded.
          </p>
        ) : null}
        {members.hasNextPage ? (
          <Button
            size="touch"
            className="self-start text-base"
            disabled={members.isFetchingNextPage}
            onClick={() => void members.fetchNextPage()}
            type="button"
            variant="outline"
          >
            {members.isFetchingNextPage ? "Loading…" : "Show more"}
          </Button>
        ) : null}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-popover px-4 py-3 sm:px-6">
        <p className="text-base" aria-live="polite">
          {selected.size === 0
            ? "No one chosen"
            : `${plural(selected.size, "member")} chosen${full ? " (most at once)" : ""}`}
        </p>
        <div className="flex gap-2">
          {grant.data && selected.size === 0 ? (
            <Button
              size="touch"
              className="text-base"
              onClick={onDone}
              type="button"
            >
              Done
            </Button>
          ) : (
            <Button
              size="touch"
              className="px-5 text-base"
              disabled={selected.size === 0 || grant.isPending}
              onClick={() => {
                grant.reset()
                setConfirming(true)
              }}
              type="button"
            >
              {selected.size > 1
                ? `Give access to ${selected.size}`
                : "Give access"}
            </Button>
          )}
        </div>
      </div>

      {confirming ? (
        <AccessConfirmDialog
          confirmation={{
            title:
              selected.size === 1
                ? `Give the app to ${[...selected.values()][0]}?`
                : `Give the app to ${selected.size} members?`,
            description: `Only continue if ${selected.size === 1 ? "they" : "each of them"} agreed to pay ${price} for ${termMonths} months. It is added to their account at the end of this month.`,
            actionLabel: "They agreed. Give access",
          }}
          error={grant.error?.message}
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setSubmitted(new Map(selected))
            grant.mutate({
              memberIds: [...selected.keys()],
              termsVersion,
              memberAgreementConfirmed: true,
            })
          }}
          pending={grant.isPending}
        />
      ) : null}
    </>
  )
}
