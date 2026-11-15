"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import type { FoodPurchaseCycleRow } from "@halaalvest/db"
import { FoodPurchaseHeader } from "@/components/food-purchase-header"
import { FoodPurchaseMobileToolbar } from "@/components/food-purchase-mobile-toolbar"
import { OpenFoodPurchaseSheet } from "@/components/open-food-purchase-sheet"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import {
  RequestClosedNotice,
  RequestSummaryGrid,
  RequestSummaryWide,
  memberNeedsVerificationNotice,
} from "@/components/requests/request-summary"
import { FoodPurchaseSheet } from "@/components/sheets/food-purchase-sheet"
import { SummaryCard } from "@/components/summary-card"
import { FoodPurchaseDataView } from "@/components/tables/food-purchase/data-view"
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import { useSortParams } from "@/hooks/use-sort-params"
import {
  completeFoodPurchaseCycleAction,
  setFoodPurchaseIntakeAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import {
  formatMonthYear,
  getFoodCycleState,
} from "@/lib/requests/request-status-words"
import type { TableSettings } from "@/utils/table-settings"
import { formatDayMonthYear } from "@/utils/format"

type FoodPurchaseViewName = "applications" | "cycles"

type FoodPurchaseSummary = {
  approvedApplications: number
  openCycles: number
  pendingApplications: number
  reportedProfit: number
  submittedAccounting: number
  totalReleasedAmount: number
}

function FoodPurchaseViewTabs({
  activeView,
  onSelect,
}: {
  activeView: FoodPurchaseViewName
  onSelect: (view: FoodPurchaseViewName) => void
}) {
  const views = [
    { label: "Requests", value: "applications" },
    { label: "Months", value: "cycles" },
  ] as const

  return (
    <div
      aria-label="Foodstuff view"
      className="flex min-w-0 gap-1 border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            aria-controls={`food-purchase-${view.value}-view`}
            aria-selected={selected}
            className="h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 text-base data-[active=true]:border-primary data-[active=true]:bg-transparent data-[active=true]:font-semibold"
            data-active={selected}
            id={`food-purchase-${view.value}-tab`}
            key={view.value}
            onClick={() => onSelect(view.value)}
            role="tab"
            type="button"
            variant="ghost"
          >
            {view.label}
          </Button>
        )
      })}
    </div>
  )
}

export function FoodPurchaseView({
  canRecordAccounting,
  canReviewAccounting,
  canReleaseFunds,
  canReviewApplications,
  canSubmitApplications,
  cycles,
  initialSettings,
  summary,
}: {
  canRecordAccounting: boolean
  canReviewAccounting: boolean
  canReleaseFunds: boolean
  canReviewApplications: boolean
  canSubmitApplications: boolean
  cycles: FoodPurchaseCycleRow[]
  initialSettings?: Partial<TableSettings>
  summary: FoodPurchaseSummary
}) {
  const hasOpenCycle = cycles.some((cycle) => cycle.status === "open")
  const { filter, setFilter } = useFoodPurchaseFilterParams()
  const { setParams: setSortParams } = useSortParams()
  const activeView = filter.view ?? "applications"

  async function selectView(view: FoodPurchaseViewName) {
    await setSortParams({ sort: null })
    await setFilter({ q: null, status: null, view }, { shallow: false })
  }

  return (
    <div className="space-y-6">
      <FoodPurchaseSheet canReview={canReviewApplications} cycles={cycles} />
      <RequestSummaryGrid>
        <SummaryCard
          label="To check"
          tone={summary.pendingApplications ? "attention" : "default"}
          value={String(summary.pendingApplications)}
        />
        <SummaryCard
          label="Approved"
          value={String(summary.approvedApplications)}
        />
        <SummaryCard
          detail={summary.openCycles ? "Taking requests" : "None open"}
          label="Open months"
          tone={summary.openCycles ? "good" : "default"}
          value={String(summary.openCycles)}
        />
        <RequestSummaryWide>
          <SummaryCard
            label="Money given"
            value={formatCurrency(summary.totalReleasedAmount)}
          />
        </RequestSummaryWide>
      </RequestSummaryGrid>

      <FoodPurchaseViewTabs
        activeView={activeView}
        onSelect={(view) => void selectView(view)}
      />

      {activeView === "cycles" ? (
        <section
          aria-labelledby="food-purchase-cycles-tab"
          className="grid gap-4"
          id="food-purchase-cycles-view"
          role="tabpanel"
        >
          {canReleaseFunds ? (
            <div>
              <OpenFoodPurchaseSheet
                className="h-12 w-full sm:w-auto"
                type="release"
              />
            </div>
          ) : null}
          {cycles.length ? (
            <ul className="grid gap-3">
              {cycles.map((cycle) => (
                <FoodPurchaseCycleCard
                  canManageIntake={canReleaseFunds}
                  canRecordAccounting={canRecordAccounting}
                  canReviewAccounting={canReviewAccounting}
                  cycle={cycle}
                  key={cycle.id}
                />
              ))}
            </ul>
          ) : (
            <RequestClosedNotice>No months yet.</RequestClosedNotice>
          )}
        </section>
      ) : (
        <section
          aria-labelledby="food-purchase-applications-tab"
          className="min-w-0"
          id="food-purchase-applications-view"
          role="tabpanel"
        >
          {canSubmitApplications && !hasOpenCycle ? (
            <div className="mb-4">
              <RequestClosedNotice>
                No month is open. Open one under Months to take requests.
              </RequestClosedNotice>
            </div>
          ) : null}
          <FoodPurchaseMobileToolbar
            canCreate={canSubmitApplications}
            hasOpenCycle={hasOpenCycle}
          />
          <FoodPurchaseHeader
            canCreate={canSubmitApplications}
            hasOpenCycle={hasOpenCycle}
          />
          <FoodPurchaseDataView
            canReviewApplications={canReviewApplications}
            initialSettings={initialSettings}
          />
        </section>
      )}
    </div>
  )
}

export function MemberFoodPurchaseView({
  canCreateApplication,
  cycles,
  initialSettings,
  needsVerification = false,
  summary,
}: {
  canCreateApplication: boolean
  cycles: FoodPurchaseCycleRow[]
  initialSettings?: Partial<TableSettings>
  needsVerification?: boolean
  summary: {
    approvedApplications: number
    pendingApplications: number
  }
}) {
  const openCycles = cycles.filter((cycle) => cycle.status === "open")
  const hasOpenCycle = openCycles.length > 0

  return (
    <div className="space-y-6">
      <FoodPurchaseSheet cycles={cycles} />
      <RequestSummaryGrid>
        <SummaryCard
          label="Waiting"
          tone={summary.pendingApplications ? "attention" : "default"}
          value={String(summary.pendingApplications)}
        />
        <SummaryCard
          label="Approved"
          value={String(summary.approvedApplications)}
        />
        <RequestSummaryWide>
          <SummaryCard
            label="Open month"
            tone={hasOpenCycle ? "good" : "default"}
            value={
              hasOpenCycle
                ? formatMonthYear(openCycles[0]!.periodMonth)
                : "None"
            }
          />
        </RequestSummaryWide>
      </RequestSummaryGrid>

      {!canCreateApplication ? (
        <RequestClosedNotice>
          {needsVerification
            ? memberNeedsVerificationNotice
            : "To ask for foodstuff, contact the cooperative office."}
        </RequestClosedNotice>
      ) : !hasOpenCycle ? (
        <RequestClosedNotice>
          There is no open month for foodstuff requests right now.
        </RequestClosedNotice>
      ) : null}

      <section className="min-w-0">
        <FoodPurchaseMobileToolbar
          canCreate={canCreateApplication}
          hasOpenCycle={hasOpenCycle}
          selfService
        />
        <FoodPurchaseHeader
          canCreate={canCreateApplication}
          hasOpenCycle={hasOpenCycle}
          selfService
        />
        <FoodPurchaseDataView
          canReviewApplications={false}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

/** One month: what was given, the figures, and the one next step. */
function FoodPurchaseCycleCard({
  canManageIntake,
  canRecordAccounting,
  canReviewAccounting,
  cycle,
}: {
  canManageIntake: boolean
  canRecordAccounting: boolean
  canReviewAccounting: boolean
  cycle: FoodPurchaseCycleRow
}) {
  const { setParams } = useFoodPurchaseParams()
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<
    "close_intake" | "complete" | "reopen_intake" | null
  >(null)
  const state = getFoodCycleState(cycle.status)
  const month = formatMonthYear(cycle.periodMonth)
  // The server takes figures only after requests stop (or to fix them).
  const canRecord =
    canRecordAccounting &&
    ["accounting_rejected", "intake_closed"].includes(cycle.status)
  const canReview =
    canReviewAccounting && cycle.status === "accounting_submitted"
  const canClose = canManageIntake && cycle.status === "open"
  const canReopen = canManageIntake && cycle.status === "intake_closed"
  // Accepted figures close the month on mobile; the same step here.
  const canComplete =
    canReviewAccounting && cycle.status === "accounting_approved"

  function open(type: "accounting" | "accounting-review") {
    void setParams({
      foodPurchaseApplicationId: null,
      foodPurchaseCycleId: cycle.id,
      foodPurchaseSheetType: type,
    })
  }

  function setIntake(transition: "close_intake" | "reopen_intake") {
    startTransition(async () => {
      try {
        await setFoodPurchaseIntakeAction(
          objectToFormData({ cycleId: cycle.id, transition })
        )
        setConfirm(null)
        showSuccess(
          transition === "close_intake"
            ? "Requests stopped"
            : "Taking requests again",
          month
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not change the month",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function complete() {
    startTransition(async () => {
      try {
        await completeFoodPurchaseCycleAction(
          objectToFormData({ cycleId: cycle.id })
        )
        setConfirm(null)
        showSuccess("Month done", month)
        router.refresh()
      } catch (error) {
        showError(
          "Could not mark the month done",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <li className="grid gap-3 rounded-(--ui-radius-surface) border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold">{month}</h3>
        <Badge
          className={memberStateToneClassNames[state.tone]}
          variant="outline"
        >
          {state.label}
        </Badge>
      </div>
      <p className="text-base">
        {formatCurrency(cycle.releasedAmount)} given on{" "}
        {formatDayMonthYear(cycle.releasedAt)}
      </p>
      {cycle.profitAmount != null ? (
        <p className="text-base">
          Sales {formatCurrency(cycle.salesAmount ?? 0)} · Profit{" "}
          <span className="font-semibold">
            {formatCurrency(cycle.profitAmount)}
          </span>
        </p>
      ) : null}
      {cycle.accountingNotes ? (
        <p className="text-base text-muted-foreground">
          {cycle.accountingNotes}
        </p>
      ) : null}
      {canRecord || canReview || canClose || canReopen || canComplete ? (
        <div className="grid gap-3 sm:flex sm:flex-wrap [&_button]:h-12 [&_button]:w-full sm:[&_button]:w-auto">
          {canComplete ? (
            <Button
              disabled={isPending}
              onClick={() => setConfirm("complete")}
              type="button"
            >
              Mark done
            </Button>
          ) : null}
          {canReview ? (
            <Button onClick={() => open("accounting-review")} type="button">
              Check figures
            </Button>
          ) : null}
          {canRecord ? (
            <Button
              onClick={() => open("accounting")}
              type="button"
              variant={canReview ? "outline" : "default"}
            >
              {cycle.status === "accounting_rejected"
                ? "Fix month-end figures"
                : "Add month-end figures"}
            </Button>
          ) : null}
          {canClose ? (
            <Button
              disabled={isPending}
              onClick={() => setConfirm("close_intake")}
              type="button"
              variant="outline"
            >
              Stop taking requests
            </Button>
          ) : null}
          {canReopen ? (
            <Button
              disabled={isPending}
              onClick={() => setConfirm("reopen_intake")}
              type="button"
              variant="ghost"
            >
              Take requests again
            </Button>
          ) : null}
        </div>
      ) : null}

      <RequestConfirmDialog
        confirmLabel="Stop requests"
        description="Members can't ask for this month any more. Then add the month-end figures."
        onConfirm={() => setIntake("close_intake")}
        onOpenChange={(next) => setConfirm(next ? "close_intake" : null)}
        open={confirm === "close_intake"}
        pending={isPending}
        title={`Stop taking requests for ${month}?`}
      />
      <RequestConfirmDialog
        confirmLabel="Mark done"
        description="The figures are accepted. Nothing more can be added or changed for this month."
        onConfirm={complete}
        onOpenChange={(next) => setConfirm(next ? "complete" : null)}
        open={confirm === "complete"}
        pending={isPending}
        title={`Mark ${month} as done?`}
      />
      <RequestConfirmDialog
        confirmLabel="Take requests"
        onConfirm={() => setIntake("reopen_intake")}
        onOpenChange={(next) => setConfirm(next ? "reopen_intake" : null)}
        open={confirm === "reopen_intake"}
        pending={isPending}
        title={`Take requests again for ${month}?`}
      />
    </li>
  )
}
