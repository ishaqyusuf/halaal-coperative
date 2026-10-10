"use client"

import { formatCurrency } from "@halaalvest/utils"
import { Button } from "@halaalvest/ui/components/button"
import type { FoodPurchaseCycleRow } from "@halaalvest/db"
import type { FoodPurchaseOption } from "@/components/food-purchase-content"
import { FoodPurchaseMobileToolbar } from "@/components/food-purchase-mobile-toolbar"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { FoodPurchaseHeader } from "@/components/food-purchase-header"
import {
  OpenFoodPurchaseAccountingReviewSheet,
  OpenFoodPurchaseAccountingSheet,
  OpenFoodPurchaseReleaseSheet,
  OpenMemberFoodPurchaseApplicationSheet,
} from "@/components/open-food-purchase-sheet"
import { FoodPurchaseSheet } from "@/components/sheets/food-purchase-sheet"
import { FoodPurchaseDataView } from "@/components/tables/food-purchase/data-view"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import type { TableSettings } from "@/utils/table-settings"
import { MoreHorizontalIcon } from "lucide-react"
import { useState } from "react"
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import { useSortParams } from "@/hooks/use-sort-params"

type FoodPurchaseViewName = "applications" | "cycles"

type FoodPurchaseSummary = {
  approvedApplications: number
  openCycles: number
  pendingApplications: number
  reportedProfit: number
  submittedAccounting: number
  totalReleasedAmount: number
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMonth(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  })
}

function statusTone(status: string) {
  if (status.includes("approved") || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status.includes("rejected") || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function FoodPurchaseViewTabs({
  activeView,
  onSelect,
}: {
  activeView: FoodPurchaseViewName
  onSelect: (view: FoodPurchaseViewName) => void
}) {
  const views = [
    { label: "Applications", value: "applications" },
    { label: "Monthly cycles", value: "cycles" },
  ] as const

  return (
    <div
      aria-label="Foodstuff Purchase workspace view"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            aria-controls={`food-purchase-${view.value}-view`}
            aria-selected={selected}
            className="h-11 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 text-sm data-[active=true]:border-primary data-[active=true]:bg-transparent"
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
  approvalChargeOptions,
  canRecordAccounting,
  canReviewAccounting,
  canReleaseFunds,
  canReviewApplications,
  canSubmitApplications,
  cycles,
  initialSettings,
  memberOptions,
  submissionChargeOptions,
  summary,
}: {
  approvalChargeOptions: WorkflowChargeOption[]
  canRecordAccounting: boolean
  canReviewAccounting: boolean
  canReleaseFunds: boolean
  canReviewApplications: boolean
  canSubmitApplications: boolean
  cycles: FoodPurchaseCycleRow[]
  initialSettings?: Partial<TableSettings>
  memberOptions: FoodPurchaseOption[]
  submissionChargeOptions: WorkflowChargeOption[]
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
      <FoodPurchaseSheet
        approvalChargeOptions={approvalChargeOptions}
        cycles={cycles}
        memberOptions={memberOptions}
        submissionChargeOptions={submissionChargeOptions}
      />
      <section className="hidden border-y border-border/70 md:block">
        <div className="grid grid-cols-3 divide-x divide-border/70 xl:grid-cols-6">
          <SummaryMetric label="Open cycles" value={summary.openCycles} />
          <SummaryMetric
            label="Pending applications"
            value={summary.pendingApplications}
          />
          <SummaryMetric
            label="Approved applications"
            value={summary.approvedApplications}
          />
          <SummaryMetric
            label="Release evidence"
            value={formatCurrency(summary.totalReleasedAmount)}
          />
          <SummaryMetric
            label="Accounting submitted"
            value={summary.submittedAccounting}
          />
          <SummaryMetric
            label="Reported profit"
            value={formatCurrency(summary.reportedProfit)}
          />
        </div>
      </section>

      <FoodPurchaseViewTabs
        activeView={activeView}
        onSelect={(view) => void selectView(view)}
      />

      {activeView === "cycles" ? (
        <section
          aria-labelledby="food-purchase-cycles-tab"
          className="space-y-3"
          id="food-purchase-cycles-view"
          role="tabpanel"
        >
          <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border pb-3">
            <SectionHeading title="Monthly cycles" />
            {canReleaseFunds ? (
              <>
                <span className="md:hidden">
                  <OpenFoodPurchaseReleaseSheet iconOnly />
                </span>
                <span className="hidden md:inline-flex">
                  <OpenFoodPurchaseReleaseSheet />
                </span>
              </>
            ) : null}
          </div>
          {cycles.length ? (
            <div className="divide-y divide-border border-y border-border">
              {cycles.map((cycle) => (
                <article className="py-4" key={cycle.id}>
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {formatMonth(cycle.periodMonth)}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(
                            cycle.status
                          )}`}
                        >
                          {cycle.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Released {formatCurrency(cycle.releasedAmount)} on{" "}
                        {formatDate(cycle.releasedAt)} by{" "}
                        {cycle.releasedByUser.fullName}
                      </p>
                      {cycle.releaseNotes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {cycle.releaseNotes}
                        </p>
                      ) : null}
                      {cycle.profitAmount != null ? (
                        <p className="mt-2 text-sm text-foreground">
                          Sales {formatCurrency(cycle.salesAmount ?? 0)}, cost{" "}
                          {formatCurrency(cycle.purchaseCostAmount ?? 0)},
                          expenses{" "}
                          {formatCurrency(cycle.operatingExpenseAmount ?? 0)},
                          profit {formatCurrency(cycle.profitAmount)}
                        </p>
                      ) : null}
                      {cycle.accountingNotes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {cycle.accountingNotes}
                        </p>
                      ) : null}
                      {cycle.accountingSubmittedAt ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Accounting submitted by{" "}
                          {cycle.accountingSubmittedByUser?.fullName ??
                            "committee"}{" "}
                          on {formatDate(cycle.accountingSubmittedAt)}
                        </p>
                      ) : null}
                    </div>

                    <CycleActions
                      canRecordAccounting={canRecordAccounting}
                      canReviewAccounting={canReviewAccounting}
                      cycle={cycle}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              body="Monthly Foodstuff Purchase cycles will appear here."
              title="No Foodstuff Purchase cycles yet"
            />
          )}
        </section>
      ) : (
        <section
          aria-labelledby="food-purchase-applications-tab"
          className="min-w-0"
          id="food-purchase-applications-view"
          role="tabpanel"
        >
          <FoodPurchaseMobileToolbar
            canSubmitApplications={canSubmitApplications}
            hasOpenCycle={hasOpenCycle}
          />
          <FoodPurchaseHeader
            canSubmitApplications={canSubmitApplications}
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
  chargeOptions,
  cycles,
  initialSettings,
  member,
  summary,
}: {
  canCreateApplication: boolean
  chargeOptions: WorkflowChargeOption[]
  cycles: FoodPurchaseCycleRow[]
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    memberNumber: string
  }
  summary: {
    approvedApplications: number
    pendingApplications: number
  }
}) {
  const openCycles = cycles.filter((cycle) => cycle.status === "open")

  return (
    <div className="space-y-6">
      <FoodPurchaseSheet
        cycles={cycles}
        selfServiceChargeOptions={chargeOptions}
      />
      <section className="hidden border-y border-border/70 md:block">
        <div className="grid grid-cols-3 divide-x divide-border/70">
          <SummaryMetric label="Open cycles" value={openCycles.length} />
          <SummaryMetric
            label="Pending requests"
            value={summary.pendingApplications}
          />
          <SummaryMetric
            label="Approved requests"
            value={summary.approvedApplications}
          />
        </div>
      </section>

      {canCreateApplication ? (
        <section className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Apply for Foodstuff Purchase
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <span className="md:hidden">
            <OpenMemberFoodPurchaseApplicationSheet
              disabled={openCycles.length === 0}
              iconOnly
            />
          </span>
          <span className="hidden md:inline-flex">
            <OpenMemberFoodPurchaseApplicationSheet
              disabled={openCycles.length === 0}
            />
          </span>
        </section>
      ) : (
        <EmptyState
          body="New Foodstuff Purchase applications are handled by the cooperative office. Existing applications remain visible here."
          title="Foodstuff Purchase requests are office-managed"
        />
      )}

      <section className="min-w-0">
        <FoodPurchaseMobileToolbar
          canSubmitApplications={false}
          hasOpenCycle={openCycles.length > 0}
        />
        <FoodPurchaseHeader
          canSubmitApplications={false}
          hasOpenCycle={openCycles.length > 0}
        />
        <FoodPurchaseDataView
          canReviewApplications={false}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

function CycleActions({
  canRecordAccounting,
  canReviewAccounting,
  cycle,
}: {
  canRecordAccounting: boolean
  canReviewAccounting: boolean
  cycle: FoodPurchaseCycleRow
}) {
  const { setParams } = useFoodPurchaseParams()
  const [open, setOpen] = useState(false)
  const canRecord =
    canRecordAccounting &&
    ["accounting_rejected", "open"].includes(cycle.status)
  const canReview =
    canReviewAccounting && cycle.status === "accounting_submitted"

  if (!canRecord && !canReview) return null

  function openWorkflow(type: "accounting" | "accounting-review") {
    setOpen(false)
    void setParams({
      foodPurchaseApplicationId: null,
      foodPurchaseCycleId: cycle.id,
      foodPurchaseSheetType: type,
    })
  }

  return (
    <>
      <div className="hidden flex-wrap gap-2 xl:flex xl:justify-end">
        {canRecord ? (
          <OpenFoodPurchaseAccountingSheet cycleId={cycle.id} />
        ) : null}
        {canReview ? (
          <OpenFoodPurchaseAccountingReviewSheet cycleId={cycle.id} />
        ) : null}
      </div>
      <div className="flex justify-end xl:hidden">
        <Button
          aria-label={`Open ${formatMonth(cycle.periodMonth)} cycle actions`}
          className="size-11"
          onClick={() => setOpen(true)}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <MoreHorizontalIcon />
        </Button>
      </div>
      <MobileActionsDrawer
        description={`Choose how to continue with the ${formatMonth(
          cycle.periodMonth
        )} cycle.`}
        onOpenChange={setOpen}
        open={open}
        title="Cycle actions"
      >
        <div className="space-y-2">
          {canRecord ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openWorkflow("accounting")}
              type="button"
              variant="ghost"
            >
              Record accounting
            </Button>
          ) : null}
          {canReview ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openWorkflow("accounting-review")}
              type="button"
              variant="ghost"
            >
              Review accounting
            </Button>
          ) : null}
        </div>
      </MobileActionsDrawer>
    </>
  )
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return <p className="text-sm font-medium text-foreground">{title}</p>
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="border-y border-border px-4 py-8 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
