"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo, useState, useTransition } from "react"
import { useBusinessRefresh } from "@/components/business/use-business-refresh"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import { RequestField } from "@/components/requests/request-field"
import {
  type ProfitPayoutDestination,
  profitPayoutDestinationOptions,
  profitPayoutWords,
} from "@/lib/business/business-words"
import {
  payOutProfitAction,
  reverseProfitPayoutAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

type ProfitSeason = RouterOutputs["business"]["season"]
export type SeasonShareRow =
  RouterOutputs["business"]["seasonShares"]["data"][number]

function membersWord(count: number) {
  return count === 1 ? "1 member" : `${count} members`
}

/** Runs one payout step with a fresh command id per opened dialog. */
function usePayoutStep() {
  const refresh = useBusinessRefresh()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  return {
    isPending,
    run(
      action: (form: FormData) => Promise<unknown>,
      fields: Record<string, string>,
      success: [string, string],
      done: () => void
    ) {
      startTransition(async () => {
        try {
          await action(objectToFormData(fields))
          showSuccess(success[0], success[1])
          done()
          await refresh(() => undefined)
        } catch (error) {
          done()
          showError(
            "Could not finish",
            error instanceof Error ? error.message : "Something went wrong."
          )
        }
      })
    },
  }
}

/** Savings, cash or bank transfer, as large radio rows. */
function DestinationField({
  disabled,
  idPrefix,
  onChange,
  value,
}: {
  disabled: boolean
  idPrefix: string
  onChange: (value: ProfitPayoutDestination) => void
  value: ProfitPayoutDestination
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-base font-medium text-foreground">
        How is it paid?
      </legend>
      <RadioGroup
        className="divide-y divide-border border-y border-border"
        disabled={disabled}
        onValueChange={(next) => onChange(next as ProfitPayoutDestination)}
        value={value}
      >
        {profitPayoutDestinationOptions.map((option) => (
          <label
            className="flex min-h-12 cursor-pointer items-center gap-3 px-1 py-2 text-base"
            htmlFor={`${idPrefix}-${option.value}`}
            key={option.value}
          >
            <RadioGroupItem
              id={`${idPrefix}-${option.value}`}
              value={option.value}
            />
            {option.label}
          </label>
        ))}
      </RadioGroup>
      <span className="text-sm text-muted-foreground">
        {value === "savings"
          ? "Added to the member's savings. No money leaves the cooperative."
          : "Record it here after you hand over the cash or send the transfer."}
      </span>
    </fieldset>
  )
}

function ReferenceField({
  destination,
  disabled,
  onChange,
  value,
}: {
  destination: ProfitPayoutDestination
  disabled: boolean
  onChange: (value: string) => void
  value: string
}) {
  if (destination === "savings") return null

  return (
    <RequestField
      hint={
        destination === "cash"
          ? "For example, the receipt number."
          : "For example, the transfer reference."
      }
      label="Reference"
      optional
    >
      <Input
        className="h-12 text-base"
        disabled={disabled}
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </RequestField>
  )
}

/**
 * Pay everyone still owed in one go. Everyone gets the same way unless a
 * member is changed in "Pay some members differently".
 */
export function PaySeasonDialog({
  onOpenChange,
  open,
  season,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  season: ProfitSeason
}) {
  const step = usePayoutStep()
  const [commandId] = useState(() => crypto.randomUUID())
  const [destination, setDestination] =
    useState<ProfitPayoutDestination>("savings")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [showOverrides, setShowOverrides] = useState(false)
  const [overrides, setOverrides] = useState<
    Record<string, ProfitPayoutDestination>
  >({})
  const payout = season.payout
  if (!payout) return null

  const changedCount = Object.keys(overrides).length

  return (
    <RequestConfirmDialog
      confirmLabel={`Pay ${membersWord(payout.owedCount)}`}
      description="Each member still owed is paid once. Members already paid are left as they are."
      facts={[
        { label: "Season", value: season.name },
        { label: "Still owed", value: formatCurrency(payout.owedTotal) },
        { label: "Members", value: membersWord(payout.owedCount) },
      ]}
      onConfirm={() =>
        step.run(
          payOutProfitAction,
          {
            commandId,
            destination,
            note: note.trim(),
            overrides: JSON.stringify(overrides),
            reference: reference.trim(),
            seasonId: season.id,
          },
          [
            "Profit paid",
            `${formatCurrency(payout.owedTotal)} to ${membersWord(payout.owedCount)}`,
          ],
          () => onOpenChange(false)
        )
      }
      onOpenChange={onOpenChange}
      open={open}
      pending={step.isPending}
      title={`Pay ${formatCurrency(payout.owedTotal)} to ${membersWord(payout.owedCount)}?`}
    >
      <div className="grid gap-5">
        <DestinationField
          disabled={step.isPending}
          idPrefix="pay-season"
          onChange={setDestination}
          value={destination}
        />
        <ReferenceField
          destination={destination}
          disabled={step.isPending}
          onChange={setReference}
          value={reference}
        />
        <div className="grid gap-3">
          <Button
            aria-expanded={showOverrides}
            className="h-12 w-full justify-between text-base"
            disabled={step.isPending}
            onClick={() => setShowOverrides((value) => !value)}
            type="button"
            variant="outline"
          >
            Pay some members differently
            {changedCount ? ` (${changedCount})` : ""}
          </Button>
          {showOverrides ? (
            <OwedMemberOverrides
              defaultDestination={destination}
              disabled={step.isPending}
              onChange={setOverrides}
              overrides={overrides}
              seasonId={season.id}
            />
          ) : null}
        </div>
        <RequestField
          hint="For example, the meeting that approved it. Kept on record."
          label="Note"
          optional
        >
          <Textarea
            disabled={step.isPending}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </RequestField>
      </div>
    </RequestConfirmDialog>
  )
}

/** Members still owed, 50 at a time, each with its own way to pay. */
function OwedMemberOverrides({
  defaultDestination,
  disabled,
  onChange,
  overrides,
  seasonId,
}: {
  defaultDestination: ProfitPayoutDestination
  disabled: boolean
  onChange: (value: Record<string, ProfitPayoutDestination>) => void
  overrides: Record<string, ProfitPayoutDestination>
  seasonId: string
}) {
  const trpc = useTRPC()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteQuery(
      trpc.business.seasonShares.infiniteQueryOptions(
        { payout: "owed", seasonId },
        { getNextPageParam: ({ meta }) => meta?.cursor }
      )
    )
  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages]
  )

  if (isPending) {
    return <p className="text-base text-muted-foreground">Loading...</p>
  }

  return (
    <div className="grid gap-3">
      <ul className="max-h-72 divide-y divide-border overflow-y-auto border-y border-border">
        {rows.map((row) => (
          <li
            className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            key={row.memberId}
          >
            <span className="min-w-0">
              <span className="block text-base font-medium text-foreground">
                {row.memberName}
              </span>
              <span className="block text-sm text-muted-foreground tabular-nums">
                {formatCurrency(row.amount)}
              </span>
            </span>
            <NativeSelect
              aria-label={`How ${row.memberName} is paid`}
              disabled={disabled}
              onChange={(event) => {
                const next = { ...overrides }
                const value = event.target.value as ProfitPayoutDestination
                if (value === defaultDestination) delete next[row.memberId]
                else next[row.memberId] = value
                onChange(next)
              }}
              value={overrides[row.memberId] ?? defaultDestination}
            >
              {profitPayoutDestinationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </li>
        ))}
      </ul>
      {hasNextPage ? (
        <Button
          className="h-11 w-fit text-base"
          disabled={isFetchingNextPage || disabled}
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

/** Pay one member their share for this season. */
export function PayMemberDialog({
  onClose,
  row,
  season,
}: {
  onClose: () => void
  row: SeasonShareRow
  season: ProfitSeason
}) {
  const step = usePayoutStep()
  const [commandId] = useState(() => crypto.randomUUID())
  const [destination, setDestination] =
    useState<ProfitPayoutDestination>("savings")
  const [reference, setReference] = useState("")

  return (
    <RequestConfirmDialog
      confirmLabel="Pay now"
      description="This member is paid once for this season."
      facts={[
        { label: "Member", value: row.memberName },
        { label: "Season", value: season.name },
        { label: "Amount", value: formatCurrency(row.amount) },
      ]}
      onConfirm={() =>
        step.run(
          payOutProfitAction,
          {
            commandId,
            destination,
            memberId: row.memberId,
            reference: reference.trim(),
            seasonId: season.id,
          },
          [
            "Profit paid",
            `${formatCurrency(row.amount)} ${profitPayoutWords(destination)} for ${row.memberName}`,
          ],
          onClose
        )
      }
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open
      pending={step.isPending}
      title={`Pay ${formatCurrency(row.amount)} to ${row.memberName}?`}
    >
      <div className="grid gap-5">
        <DestinationField
          disabled={step.isPending}
          idPrefix={`pay-${row.memberId}`}
          onChange={setDestination}
          value={destination}
        />
        <ReferenceField
          destination={destination}
          disabled={step.isPending}
          onChange={setReference}
          value={reference}
        />
      </div>
    </RequestConfirmDialog>
  )
}

/** Undo a payout made by mistake: the member is owed the money again. */
export function UndoPayoutDialog({
  onClose,
  row,
}: {
  onClose: () => void
  row: SeasonShareRow
}) {
  const step = usePayoutStep()
  const [commandId] = useState(() => crypto.randomUUID())
  const [reason, setReason] = useState("")
  const payout = row.payout
  if (!payout) return null

  return (
    <RequestConfirmDialog
      confirmLabel="Undo payment"
      description={
        payout.destination === "savings"
          ? "The money is taken back out of the member's savings and shows as owed again."
          : "Only do this if the money was not handed over. It shows as owed again."
      }
      destructive
      disabled={reason.trim().length === 0}
      facts={[
        { label: "Member", value: row.memberName },
        { label: "Amount", value: formatCurrency(row.amount) },
        {
          label: "Paid",
          value: `${formatDayMonthYear(payout.paidAt)} ${profitPayoutWords(payout.destination)}`,
        },
      ]}
      onConfirm={() =>
        step.run(
          reverseProfitPayoutAction,
          { commandId, payoutId: payout.id, reason: reason.trim() },
          ["Payment undone", `${row.memberName} is owed again`],
          onClose
        )
      }
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open
      pending={step.isPending}
      title={`Undo the payment to ${row.memberName}?`}
    >
      <RequestField label="Why?">
        <Textarea
          disabled={step.isPending}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </RequestField>
    </RequestConfirmDialog>
  )
}
