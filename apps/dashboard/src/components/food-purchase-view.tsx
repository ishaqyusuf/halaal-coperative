"use client"

import { formatCurrency } from "@halaalvest/utils"
import type {
  FoodPurchaseApplicationRow,
  FoodPurchaseCycleRow,
} from "@halaalvest/db"
import type { FoodPurchaseOption } from "@/components/food-purchase-content"
import { FoodPurchaseHeader } from "@/components/food-purchase-header"
import {
  OpenFoodPurchaseAccountingReviewSheet,
  OpenFoodPurchaseAccountingSheet,
  OpenFoodPurchaseReleaseSheet,
  OpenMemberFoodPurchaseApplicationSheet,
} from "@/components/open-food-purchase-sheet"
import { FoodPurchaseSheet } from "@/components/sheets/food-purchase-sheet"
import { FoodPurchaseDataTable } from "@/components/tables/food-purchase/data-table"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import type { TableSettings } from "@/utils/table-settings"

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

export function FoodPurchaseView({
  applications,
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
  applications: FoodPurchaseApplicationRow[]
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

  return (
    <div className="space-y-6">
      <FoodPurchaseSheet
        applications={applications}
        approvalChargeOptions={approvalChargeOptions}
        cycles={cycles}
        memberOptions={memberOptions}
        submissionChargeOptions={submissionChargeOptions}
      />
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryTile label="Open cycles" value={summary.openCycles} />
        <SummaryTile
          label="Pending applications"
          value={summary.pendingApplications}
        />
        <SummaryTile
          label="Approved applications"
          value={summary.approvedApplications}
        />
        <SummaryTile
          label="Released funds"
          value={formatCurrency(summary.totalReleasedAmount)}
        />
        <SummaryTile
          label="Accounting submitted"
          value={summary.submittedAccounting}
        />
        <SummaryTile
          label="Reported profit"
          value={formatCurrency(summary.reportedProfit)}
        />
      </section>

      <section className="flex flex-wrap gap-2">
        {canReleaseFunds ? (
          <OpenFoodPurchaseReleaseSheet />
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Monthly cycles" />
        {cycles.length ? (
          cycles.map((cycle) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={cycle.id}
            >
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
                      {formatCurrency(cycle.purchaseCostAmount ?? 0)}, expenses{" "}
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
                      {cycle.accountingSubmittedByUser?.fullName ?? "committee"}{" "}
                      on {formatDate(cycle.accountingSubmittedAt)}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {canRecordAccounting &&
                  ["accounting_rejected", "open"].includes(cycle.status) ? (
                    <OpenFoodPurchaseAccountingSheet cycleId={cycle.id} />
                  ) : null}

                  {canReviewAccounting &&
                  cycle.status === "accounting_submitted" ? (
                    <OpenFoodPurchaseAccountingReviewSheet cycleId={cycle.id} />
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            body="Monthly Foodstuff Purchase cycles will appear here."
            title="No Foodstuff Purchase cycles yet"
          />
        )}
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <FoodPurchaseHeader
          canSubmitApplications={canSubmitApplications}
          hasOpenCycle={hasOpenCycle}
        />
        <FoodPurchaseDataTable
          applications={applications}
          canReviewApplications={canReviewApplications}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

export function MemberFoodPurchaseView({
  applications,
  canCreateApplication,
  chargeOptions,
  cycles,
  initialSettings,
  member,
}: {
  applications: FoodPurchaseApplicationRow[]
  canCreateApplication: boolean
  chargeOptions: WorkflowChargeOption[]
  cycles: FoodPurchaseCycleRow[]
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    memberNumber: string
  }
}) {
  const openCycles = cycles.filter((cycle) => cycle.status === "open")
  const pendingApplications = applications.filter((application) =>
    ["submitted", "under_review"].includes(application.status)
  )
  const approvedApplications = applications.filter(
    (application) => application.status === "approved"
  )

  return (
    <div className="space-y-6">
      <FoodPurchaseSheet
        applications={applications}
        cycles={cycles}
        selfServiceChargeOptions={chargeOptions}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Open cycles" value={openCycles.length} />
        <SummaryTile
          label="Pending requests"
          value={pendingApplications.length}
        />
        <SummaryTile
          label="Approved requests"
          value={approvedApplications.length}
        />
      </section>

      {canCreateApplication ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Apply for Foodstuff Purchase
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <OpenMemberFoodPurchaseApplicationSheet
            disabled={openCycles.length === 0}
          />
        </section>
      ) : (
        <EmptyState
          body="New Foodstuff Purchase applications are handled by the cooperative office. Existing applications remain visible here."
          title="Foodstuff Purchase requests are office-managed"
        />
      )}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <FoodPurchaseHeader
          canSubmitApplications={false}
          hasOpenCycle={openCycles.length > 0}
        />
        <FoodPurchaseDataTable
          applications={applications}
          canReviewApplications={false}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

function SummaryTile({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return <p className="text-sm font-medium text-foreground">{title}</p>
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
