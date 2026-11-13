"use client"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { toast } from "@halaalvest/ui/components/use-toast"
import type { MonthlyRecordMemberRow } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { WorkplaceSelect } from "@/components/monthly-records/workplace-select"
import { useMarkWorkflowSaved } from "@/components/workflow-presentation"
import { useMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { useTRPC } from "@/trpc/client"
import {
  getWorkplaceOptions,
  isReceivable,
} from "./workplace-options"

function memberLabel(count: number) {
  return count === 1 ? "1 member" : `${count} members`
}

export function WorkplaceReceiveContent({
  monthlyRecordId,
  periodLabel,
  rows,
}: {
  monthlyRecordId?: string
  periodLabel?: string
  rows: MonthlyRecordMemberRow[]
}) {
  const { filter, setFilter } = useMonthlyRecordFilterParams()
  const workplaces = useMemo(() => getWorkplaceOptions(rows), [rows])
  const workplaceId = filter.workplaceId

  if (!monthlyRecordId) {
    return (
      <p className="px-6 text-muted-foreground">
        Start this month first, then receive payments.
      </p>
    )
  }

  if (workplaces.length === 0) {
    return (
      <p className="px-6 text-muted-foreground">
        No members have a workplace yet. Set a member&apos;s workplace on their
        profile.
      </p>
    )
  }

  const workplace = workplaces.find((item) => item.id === workplaceId)

  return (
    <div className="flex flex-col gap-5">
      <div className="px-6">
        <WorkplaceSelect
          onChange={(value) => void setFilter({ workplaceId: value })}
          options={workplaces}
          value={workplaceId}
        />
      </div>
      {workplace ? (
        <WorkplaceReceiveList
          key={workplace.id}
          monthlyRecordId={monthlyRecordId}
          periodLabel={periodLabel ?? ""}
          rows={rows.filter((row) => row.workplaceId === workplace.id)}
          workplaceId={workplace.id}
          workplaceName={workplace.name}
        />
      ) : (
        <p className="px-6 text-muted-foreground">Choose a workplace.</p>
      )}
    </div>
  )
}

function WorkplaceReceiveList({
  monthlyRecordId,
  periodLabel,
  rows,
  workplaceId,
  workplaceName,
}: {
  monthlyRecordId: string
  periodLabel: string
  rows: MonthlyRecordMemberRow[]
  workplaceId: string
  workplaceName: string
}) {
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const markSaved = useMarkWorkflowSaved()
  const { setParams } = useMonthlyRecordParams()
  // Everyone still unpaid starts ticked; staff untick who did not pay.
  const [unticked, setUnticked] = useState<Set<string>>(() => new Set())
  const [confirming, setConfirming] = useState(false)
  const receivable = rows.filter(isReceivable)
  const selected = receivable.filter((row) => !unticked.has(row.id))
  const total = selected.reduce((sum, row) => sum + row.totalPayableAmount, 0)
  const allTicked = selected.length === receivable.length

  const receive = useMutation(
    trpc.monthlyRecords.receiveWorkplace.mutationOptions({
      onError: (error) => {
        setConfirming(false)
        toast({
          description: error.message,
          title: "Payments were not received",
          variant: "destructive",
        })
      },
      onSuccess: async (result) => {
        markSaved()
        setConfirming(false)
        await queryClient.invalidateQueries({
          queryKey: trpc.monthlyRecords.rows.infiniteQueryKey(),
        })
        await setParams(null)
        router.refresh()
        toast({
          description:
            result.skipped.length > 0
              ? `${memberLabel(result.skipped.length)} skipped (already paid or changed).`
              : `${workplaceName} · ${result.periodLabel}`,
          title: `${memberLabel(result.receivedCount)} marked paid · ${formatCurrency(result.receivedAmount)}`,
        })
      },
    })
  )

  function toggle(rowId: string, checked: boolean) {
    setUnticked((current) => {
      const next = new Set(current)
      if (checked) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-y border-border px-6 py-3">
          <label className="flex min-h-11 items-center gap-3 font-medium">
            <Checkbox
              checked={allTicked && receivable.length > 0}
              disabled={receivable.length === 0}
              onCheckedChange={(checked) =>
                setUnticked(
                  checked ? new Set() : new Set(receivable.map((row) => row.id))
                )
              }
            />
            Select all
          </label>
          <span className="text-muted-foreground">
            {receivable.length} to receive
          </span>
        </div>

        <ul aria-label={`${workplaceName} members`}>
          {rows.map((row) => {
            const canReceive = isReceivable(row)

            return (
              <li className="border-b border-border px-6" key={row.id}>
                <label
                  className="flex min-h-16 items-center gap-3 py-3"
                  htmlFor={canReceive ? `receive-${row.id}` : undefined}
                >
                  {canReceive ? (
                    <Checkbox
                      checked={!unticked.has(row.id)}
                      id={`receive-${row.id}`}
                      onCheckedChange={(checked) => toggle(row.id, checked)}
                    />
                  ) : (
                    <span aria-hidden className="size-[22px] shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {row.memberName}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {row.memberNumber}
                    </span>
                  </span>
                  {canReceive ? (
                    <span className="font-medium tabular-nums">
                      {formatCurrency(row.totalPayableAmount)}
                    </span>
                  ) : (
                    <Badge
                      variant={row.status === "applied" ? "default" : "secondary"}
                    >
                      {row.status === "applied"
                        ? "Paid"
                        : row.status === "cancelled"
                          ? "Cancelled"
                          : "Nothing due"}
                    </Badge>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="sticky bottom-0 z-10 mt-auto flex flex-col gap-3 border-t border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          {memberLabel(selected.length)} ·{" "}
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </p>
        <Button
          className="w-full sm:w-auto"
          disabled={selected.length === 0 || receive.isPending}
          onClick={() => setConfirming(true)}
          size="lg"
          type="button"
        >
          Mark as paid
        </Button>
      </div>

      <AlertDialog
        onOpenChange={(open) => !receive.isPending && setConfirming(open)}
        open={confirming}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {memberLabel(selected.length)} as paid?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {workplaceName} · {periodLabel}. Total{" "}
              <strong className="text-foreground">{formatCurrency(total)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={receive.isPending}>Cancel</AlertDialogCancel>
            <Button
              disabled={receive.isPending}
              onClick={() =>
                receive.mutate({
                  monthlyRecordId,
                  rowIds: selected.map((row) => row.id),
                  workplaceId,
                })
              }
              type="button"
            >
              {receive.isPending ? "Saving…" : "Yes, mark as paid"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
