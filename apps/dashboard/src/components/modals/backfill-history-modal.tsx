"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  applyLoanEventToDraft,
  buildBackfillDraft,
  deriveBackfillSummary,
  deriveBackfillWarnings,
  markRowStatus,
  type BackfillLoanEvent,
  type BuildBackfillDraftInput,
  type BackfillProfitPeriod,
} from "@halaalvest/backfill"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@halaalvest/ui/components/dialog"
import { formatCurrency } from "@halaalvest/utils"
import {
  getBackfillPreviewAction,
  queueBackfillApplyAction,
  queueBackfillDraftAction,
} from "@/lib/dashboard-actions"

function toMonthKey(value: string) {
  return value.slice(0, 7)
}

function baseInput(input: {
  cooperativeStartDate?: string | null
  joinedAt: string
  profitPeriods?: BackfillProfitPeriod[]
}) {
  return {
    amountLogs: [],
    chargeDefinitions: [],
    defaultShareVersions: [],
    dividendEntries: [],
    endMonth: toMonthKey(new Date().toISOString()),
    existingHistoryImpacts: [],
    loanEvents: [],
    memberJoinedMonth: toMonthKey(input.joinedAt),
    profitPeriods: input.profitPeriods ?? [],
    shareOverrideVersions: [],
    startMonth: input.cooperativeStartDate ? toMonthKey(input.cooperativeStartDate) : toMonthKey(input.joinedAt),
  } satisfies BuildBackfillDraftInput
}

export function BackfillHistoryModal({
  cooperativeStartDate,
  joinedAt,
  memberId,
  memberName,
  memberNumber,
  profitPeriods,
  triggerLabel = "Backfill History",
  triggerVariant = "outline",
}: {
  cooperativeStartDate?: string | null
  joinedAt: string
  memberId: string
  memberName: string
  memberNumber: string
  profitPeriods?: BackfillProfitPeriod[]
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "secondary" | "ghost"
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, startTransition] = useTransition()
  const initialInput = useMemo(
    () => baseInput({ cooperativeStartDate, joinedAt, profitPeriods }),
    [cooperativeStartDate, joinedAt, profitPeriods],
  )
  const [draftInput, setDraftInput] = useState<BuildBackfillDraftInput>(initialInput)
  const [draft, setDraft] = useState(() => buildBackfillDraft(initialInput))
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [loanForm, setLoanForm] = useState<BackfillLoanEvent>({
    durationMonths: 12,
    loanAmount: 120000,
    monthlyLoanServiceAmount: 10000,
    startMonth: draft.rows[0]?.month ?? initialInput.startMonth,
    topUp: 5000,
  })

  useEffect(() => {
    if (!open) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set("memberId", memberId)
      const preview = await getBackfillPreviewAction(formData)
      setDraftInput(preview.draftInput)
      setDraft(preview.draft)
      const loanMonth = preview.draft.rows.find((row) => row.loanEvent)?.month ?? preview.draft.rows[0]?.month ?? preview.draftInput.startMonth
      setExpandedMonth(preview.draft.rows.find((row) => row.loanEvent)?.month ?? null)
      setLoanForm({
        durationMonths: preview.draft.rows.find((row) => row.loanEvent)?.loanEvent?.durationMonths ?? 12,
        loanAmount: preview.draft.rows.find((row) => row.loanEvent)?.loanEvent?.loanAmount ?? 120000,
        monthlyLoanServiceAmount:
          preview.draft.rows.find((row) => row.loanEvent)?.loanEvent?.monthlyLoanServiceAmount ?? 10000,
        startMonth: loanMonth,
        topUp: preview.draft.rows.find((row) => row.loanEvent)?.loanEvent?.topUp ?? 5000,
      })
    })
  }, [memberId, open])

  const summary = useMemo(() => deriveBackfillSummary(draft.rows), [draft.rows])
  const warnings = useMemo(() => deriveBackfillWarnings(draft.rows), [draft.rows])

  const updateStatus = (month: string, nextStatus: "active" | "missed" | "paused" | "adjusted") => {
    setDraft((current) => ({
      ...current,
      rows: markRowStatus(current.rows, month, nextStatus),
    }))
  }

  const applyLoanEvent = () => {
    setDraft((current) => ({
      ...current,
      rows: applyLoanEventToDraft(current.rows, loanForm),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} className="rounded-full" />
        }
      >
        {triggerLabel}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="h-[92vh] max-w-[96vw] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[28px] p-0"
      >
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Member History Backfill
              </p>
              <DialogTitle className="mt-2 text-2xl font-semibold text-foreground">
                {memberName}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-3xl text-sm leading-6">
                {memberNumber} · joined {joinedAt} · cooperative start {cooperativeStartDate ?? "not set"}.
                This workflow pre-generates monthly rows, surfaces transaction histories that will be updated, and applies loan propagation without leaving the member workflow.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{summary.monthsGenerated} months</Badge>
              <Badge variant="outline">{warnings.length} warnings</Badge>
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_320px] gap-0">
          <div className="min-h-0 overflow-hidden border-r border-border/70">
            <div className="border-b border-border/70 px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground">
                  Start <span className="ml-1 font-medium text-foreground">{draftInput.startMonth}</span>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground">
                  End <span className="ml-1 font-medium text-foreground">{draftInput.endMonth}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    setDraft(buildBackfillDraft(draftInput))
                  }
                >
                  Regenerate
                </Button>
                {isLoading ? <Badge variant="outline">Loading live preview…</Badge> : null}
              </div>
            </div>

            <div className="min-h-0 overflow-auto">
              <table className="w-full min-w-[1260px] text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border/70 text-left">
                    <th className="sticky left-0 z-20 bg-background px-4 py-3">Month Year</th>
                    <th className="sticky left-[150px] z-20 bg-background px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Loan Service</th>
                    <th className="px-4 py-3 text-right">Pending Loan</th>
                    <th className="px-4 py-3 text-right">Share</th>
                    <th className="px-4 py-3 text-right">Dividend</th>
                    {draft.chargeColumns.map((column) => (
                      <th key={column.code} className="px-4 py-3 text-right">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Net Deposit</th>
                    <th className="px-4 py-3 text-center">+</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((row) => {
                    const isExpanded = expandedMonth === row.month

                    return (
                      <>
                        <tr key={row.month} className="border-b border-border/60 align-top">
                          <td className="sticky left-0 z-10 bg-background px-4 py-4 font-medium text-foreground">
                            <div>
                              <p>{row.monthLabel}</p>
                              {row.existingHistoryImpacts.length ? (
                                <p className="mt-1 text-xs text-amber-700">
                                  {row.existingHistoryImpacts.length} history update warning(s)
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="sticky left-[150px] z-10 bg-background px-4 py-4">
                            <select
                              aria-label={`${row.monthLabel} status`}
                              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                              value={row.status}
                              onChange={(event) =>
                                updateStatus(row.month, event.target.value as "active" | "missed" | "paused" | "adjusted")
                              }
                            >
                              <option value="active">Active</option>
                              <option value="missed">Missed</option>
                              <option value="paused">Paused</option>
                              <option value="adjusted">Adjusted</option>
                            </select>
                          </td>
                          <td className="px-4 py-4 text-right">{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(row.loanService)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(row.pendingLoanPayment)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(row.share)}</td>
                          <td className="px-4 py-4 text-right">
                            <div>
                              <p>{formatCurrency(row.dividend)}</p>
                              {row.dividend ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {row.dividendLabel ?? "Dividend"}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          {draft.chargeColumns.map((column) => (
                            <td key={column.code} className="px-4 py-4 text-right">
                              {formatCurrency(row.chargeValues[column.code] ?? 0)}
                            </td>
                          ))}
                          <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.netDeposit)}</td>
                          <td className="px-4 py-4 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-full"
                              onClick={() => {
                                setExpandedMonth(isExpanded ? null : row.month)
                                setLoanForm(
                                  row.loanEvent ?? {
                                    durationMonths: 12,
                                    loanAmount: 120000,
                                    monthlyLoanServiceAmount: 10000,
                                    startMonth: row.month,
                                    topUp: 5000,
                                  },
                                )
                              }}
                            >
                              {isExpanded ? "-" : "+"}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-b border-border/60 bg-muted/20">
                            <td colSpan={9 + draft.chargeColumns.length} className="px-6 py-5">
                              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                                      Loan Fill Form Row
                                    </p>
                                    <h4 className="mt-2 text-lg font-semibold text-foreground">
                                      {row.monthLabel} Loan Event
                                    </h4>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                      Starting a loan here propagates monthly loan service and top-up amounts across subsequent months until the duration completes. Those future rows remain editable afterward.
                                    </p>
                                  </div>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2 text-sm">
                                      <span className="text-muted-foreground">Loan Amount</span>
                                      <input
                                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-foreground"
                                        type="number"
                                        value={loanForm.loanAmount}
                                        onChange={(event) =>
                                          setLoanForm((current) => ({
                                            ...current,
                                            loanAmount: Number(event.target.value),
                                          }))
                                        }
                                      />
                                    </label>
                                    <label className="space-y-2 text-sm">
                                      <span className="text-muted-foreground">Monthly Loan Service Amount</span>
                                      <input
                                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-foreground"
                                        type="number"
                                        value={loanForm.monthlyLoanServiceAmount}
                                        onChange={(event) =>
                                          setLoanForm((current) => ({
                                            ...current,
                                            monthlyLoanServiceAmount: Number(event.target.value),
                                          }))
                                        }
                                      />
                                    </label>
                                    <label className="space-y-2 text-sm">
                                      <span className="text-muted-foreground">Top Up</span>
                                      <input
                                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-foreground"
                                        type="number"
                                        value={loanForm.topUp}
                                        onChange={(event) =>
                                          setLoanForm((current) => ({
                                            ...current,
                                            topUp: Number(event.target.value),
                                          }))
                                        }
                                      />
                                    </label>
                                    <label className="space-y-2 text-sm">
                                      <span className="text-muted-foreground">Duration</span>
                                      <select
                                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-foreground"
                                        value={loanForm.durationMonths}
                                        onChange={(event) =>
                                          setLoanForm((current) => ({
                                            ...current,
                                            durationMonths: Number(event.target.value),
                                          }))
                                        }
                                      >
                                        {[3, 6, 9, 12, 18, 24].map((months) => (
                                          <option key={months} value={months}>
                                            {months} months
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button type="button" className="rounded-full" onClick={applyLoanEvent}>
                                      Apply Propagation
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="rounded-full"
                                      onClick={() =>
                                        setDraft(buildBackfillDraft(draftInput))
                                      }
                                    >
                                      Undo Propagation
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="rounded-[22px] border border-border/70 bg-background p-4">
                                    <p className="text-sm font-medium text-foreground">Propagation preview</p>
                                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                                      <li>Loan service will fill from {loanForm.startMonth} for {loanForm.durationMonths} months.</li>
                                      <li>Monthly amount basis defaults to {formatCurrency(loanForm.monthlyLoanServiceAmount + loanForm.topUp)}.</li>
                                      <li>Pending loan payment is auto-calculated from monthly shortfalls and remaining principal.</li>
                                      <li>Dividend values remain visible but read-only in affected months.</li>
                                    </ul>
                                  </div>
                                  {row.existingHistoryImpacts.length ? (
                                    <div className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
                                      <p className="text-sm font-medium text-amber-900">Histories that will be updated</p>
                                      <ul className="mt-3 space-y-2 text-sm text-amber-800">
                                        {row.existingHistoryImpacts.map((impact) => (
                                          <li key={`${impact.kind}-${impact.message}`}>{impact.message}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="overflow-auto px-5 py-5">
            <div className="space-y-3">
              <div className="rounded-[24px] border border-border/70 bg-card p-4">
                <p className="text-sm text-muted-foreground">Total share</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.totalShare)}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-card p-4">
                <p className="text-sm text-muted-foreground">Total loan service</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.totalLoanService)}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-card p-4">
                <p className="text-sm text-muted-foreground">Pending loan payment</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.totalPendingLoanPayment)}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-card p-4">
                <p className="text-sm text-muted-foreground">Dividend included</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.totalDividend)}</p>
              </div>
              <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-sm font-medium text-amber-900">Warnings</p>
                <ul className="mt-3 space-y-2 text-sm text-amber-800">
                  {warnings.map((warning) => (
                    <li key={warning.code}>
                      {warning.month ? `${warning.month}: ` : ""}
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
              {draft.profitPeriods.length ? (
                <div className="rounded-[24px] border border-border/70 bg-card p-4">
                  <p className="text-sm font-medium text-foreground">Business profit periods</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {draft.profitPeriods.map((period) => (
                      <li key={period.month}>
                        {period.month}: {formatCurrency(period.totalProfitAmount)} profit / {formatCurrency(period.distributableAmount)} distributable
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        <div className="border-t border-border/70 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Saving or applying this modal queues a background job. Any existing histories flagged above may be updated when the job runs.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={queueBackfillDraftAction}>
                <input type="hidden" name="memberId" value={memberId} />
                <input type="hidden" name="draftInputJson" value={JSON.stringify(draftInput)} />
                <Button type="submit" variant="outline" className="rounded-full">
                  Save Draft
                </Button>
              </form>
              <form action={queueBackfillApplyAction}>
                <input type="hidden" name="memberId" value={memberId} />
                <input type="hidden" name="draftInputJson" value={JSON.stringify(draftInput)} />
                <input type="hidden" name="draftJson" value={JSON.stringify({ ...draft, summary, warnings })} />
                <Button type="submit" className="rounded-full">
                  Apply History
                </Button>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
