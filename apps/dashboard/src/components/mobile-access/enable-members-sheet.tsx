"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { Label } from "@halaalvest/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import { formatAccessAmount, formatAccessDate } from "./format"

const memberStatusLabel = {
  not_requested: "No access",
  pending: "Requested",
  active: "Active",
  expired: "Expired",
  rejected: "Declined",
  revoked: "Revoked",
} as const

const maxSelection = 50

export function EnableMembersSheet({ onClose }: { onClose: () => void }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim())
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [agreed, setAgreed] = useState(false)
  const [note, setNote] = useState("")

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
        setAgreed(false)
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.cooperativeMobileAccess.members.infiniteQueryFilter()
          ),
          queryClient.invalidateQueries(
            trpc.cooperativeMobileAccess.queue.infiniteQueryFilter()
          ),
        ])
      },
    })
  )

  const settings = members.data?.pages[0]
  const items = members.data?.pages.flatMap((page) => page.items) ?? []
  const amount = settings
    ? formatAccessAmount(settings.amount, settings.currencyCode)
    : null
  const canSubmit =
    Boolean(settings?.enabled) &&
    selected.size > 0 &&
    agreed &&
    !grant.isPending

  function toggle(memberId: string, memberName: string, checked: boolean) {
    setSelected((current) => {
      const next = new Map(current)
      if (checked && next.size < maxSelection) next.set(memberId, memberName)
      else next.delete(memberId)
      return next
    })
  }

  function submit() {
    if (!settings || !canSubmit) return
    grant.mutate({
      memberIds: [...selected.keys()],
      termsVersion: settings.termsVersion,
      memberAgreementConfirmed: true,
      note: note.trim() || undefined,
    })
  }

  const results = grant.data?.results ?? []
  const failed = results.filter((result) => result.outcome === "failed")
  const alreadyActive = results.filter(
    (result) => result.outcome === "already_active"
  )

  return (
    <Sheet open onOpenChange={(open) => !open && !grant.isPending && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Enable members</SheetTitle>
          <SheetDescription>
            {amount && settings
              ? `Each member you enable can sign in to the mobile app immediately. A ${amount} charge for ${settings.termMonths} months is added to the member's account at the end of this month, and appears on your cooperative's monthly invoice.`
              : "Choose members to give mobile app access."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          {settings && !settings.enabled ? (
            <p className="text-sm text-destructive" role="alert">
              Turn on mobile access for your cooperative before enabling
              members.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="enable-members-search">Find members</Label>
            <Input
              autoComplete="off"
              id="enable-members-search"
              onChange={(event) => setSearch(event.target.value)}
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
          {settings && items.length === 0 && !members.isError ? (
            <p className="text-sm text-muted-foreground">
              No active members match your search.
            </p>
          ) : null}

          {items.length > 0 ? (
            <ul className="divide-y divide-border border-y border-border">
              {items.map((member) => {
                const checkboxId = `enable-member-${member.memberId}`
                const checked = selected.has(member.memberId)
                return (
                  <li
                    className="flex items-center gap-3 py-3"
                    key={member.memberId}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={
                        !member.canEnable ||
                        grant.isPending ||
                        (!checked && selected.size >= maxSelection)
                      }
                      id={checkboxId}
                      onCheckedChange={(value) =>
                        toggle(member.memberId, member.memberName, value)
                      }
                    />
                    <Label
                      className="min-w-0 flex-1 flex-col items-start gap-0.5 font-normal"
                      htmlFor={checkboxId}
                    >
                      <span className="text-sm font-medium break-words">
                        {member.memberName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member.memberNumber}
                        {member.accessEndsAt
                          ? ` · Ends ${formatAccessDate(member.accessEndsAt)}`
                          : null}
                        {!member.hasLogin ? " · Needs a portal login" : null}
                      </span>
                    </Label>
                    <Badge
                      variant={
                        member.accessStatus === "active"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {memberStatusLabel[member.accessStatus]}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {members.isFetchNextPageError ? (
            <p className="text-sm text-destructive" role="alert">
              More members could not be loaded.
            </p>
          ) : null}
          {members.hasNextPage ? (
            <Button
              disabled={members.isFetchingNextPage}
              onClick={() => void members.fetchNextPage()}
              type="button"
              variant="outline"
            >
              {members.isFetchingNextPage ? "Loading…" : "Load more members"}
            </Button>
          ) : null}

          {grant.data ? (
            <div className="space-y-1 text-sm" role="status">
              <p>
                {grant.data.enabled === 1
                  ? "1 member enabled."
                  : `${grant.data.enabled} members enabled.`}
                {alreadyActive.length > 0
                  ? ` ${alreadyActive.length} already had access.`
                  : null}
              </p>
              {failed.map((result) => (
                <p className="text-destructive" key={result.memberId}>
                  {results.length > 1
                    ? `${result.memberName ?? "A member"}: ${result.message}`
                    : result.message}
                </p>
              ))}
            </div>
          ) : null}
          {grant.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {grant.error.message}
            </p>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="enable-members-note">Note (optional)</Label>
            <Textarea
              id="enable-members-note"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              value={note}
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={agreed}
              disabled={grant.isPending}
              id="enable-members-agreed"
              onCheckedChange={setAgreed}
            />
            <Label
              className="font-normal leading-snug"
              htmlFor="enable-members-agreed"
            >
              {amount
                ? `The selected members agreed to the ${amount} mobile access charge on their member account.`
                : "The selected members agreed to the mobile access charge on their member account."}
            </Label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={grant.isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Close
            </Button>
            <Button disabled={!canSubmit} onClick={submit} type="button">
              {grant.isPending
                ? "Enabling…"
                : selected.size > 0
                  ? `Enable ${selected.size} ${selected.size === 1 ? "member" : "members"}`
                  : "Enable members"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
