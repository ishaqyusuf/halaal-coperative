"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { PageFilterData } from "@halaalvest/utils"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import { ContributionsHeader } from "@/components/contributions-header"
import { ContributionsMobileToolbar } from "@/components/contributions-mobile-toolbar"
import { MemberCombobox } from "@/components/member-combobox"
import {
  OpenContributionBatchPostSheet,
  OpenContributionBatchRowCollectedSheet,
  OpenContributionBatchRowExceptionSheet,
  OpenContributionBatchRowPostSheet,
  OpenContributionBatchStageSheet,
  OpenContributionPlanEditSheet,
  OpenContributionPlanSheet,
  OpenMemberPaymentPreferenceSheet,
  OpenMemberPaymentSheet,
} from "@/components/open-contribution-sheet"
import { ContributionSheet } from "@/components/sheets/contribution-sheet"
import { ContributionsDataView } from "@/components/tables/contributions/data-view"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { useContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { useContributionParams } from "@/hooks/use-contribution-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useSortParams } from "@/hooks/use-sort-params"
import { loadContributionsPageData } from "@/lib/contributions"
import type { TableSettings } from "@/utils/table-settings"

type ContributionsPageData = Extract<
  Awaited<ReturnType<typeof loadContributionsPageData>>,
  { state: "ready" }
>

type ContributionView = "collections" | "commitments" | "ledger"

const viewLabels: Record<ContributionView, string> = {
  collections: "Workplace batches",
  commitments: "Monthly amounts",
  ledger: "Payments",
}

const blockerNotes: Record<string, string> = {
  already_paid_this_month: "Already paid for this month in monthly records.",
  member_not_active: "Member is not active.",
  missing_active_commitment_plan: "No monthly amount set.",
  zero_commitment_plan: "Monthly amount is ₦0.",
}

// Why a row was held, skipped or blocked, in plain words.
function rowNote(row: {
  blocker: string | null
  exceptionReason: string | null
}) {
  if (row.exceptionReason) return row.exceptionReason
  return row.blocker
    ? (blockerNotes[row.blocker] ?? sentence(row.blocker))
    : null
}

function sentence(value: string) {
  const label = value.replace(/_/g, " ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function ContributionsUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Contributions"
      title="Contributions"
      description="Members' savings payments."
    >
      <WorkspaceEmptyState
        title="Not available"
        body="Contributions are not available right now. Try again later."
      />
    </WorkspacePageShell>
  )
}

export function ContributionsPageView({
  canRecordContributions,
  canUseCollectionSourceBatches,
  commitmentPlans,
  collectionSourceBatchOptions,
  collectionSourceBatches,
  filterList,
  loans,
  members,
  quickFillEnabled,
  selectedCollectionSourceBatch,
  contributionTableSettings,
}: ContributionsPageData & {
  contributionTableSettings?: Partial<TableSettings>
  filterList?: PageFilterData[]
}) {
  const searchParams = useSearchParams()
  const { filters, setFilters } = useContributionsFilterParams()
  const { setParams: setContributionParams } = useContributionParams()
  const { setParams: setSortParams } = useSortParams()
  const activeView =
    filters.view === "collections" && !canUseCollectionSourceBatches
      ? "ledger"
      : (filters.view ?? "ledger")
  const activeCommitmentPlans = commitmentPlans.filter((plan) => plan.isActive)
  const activeLoans = loans.filter((loan) =>
    ["approved", "disbursed", "active"].includes(loan.status)
  )
  const memberOptions = members.items.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
    paymentAllocationPreference: member.paymentAllocationPreference,
  }))
  const collectionHref = (batchId: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("batchId", batchId)
    next.set("view", "collections")
    return `/contributions?${next.toString()}`
  }
  const views: ContributionView[] = canUseCollectionSourceBatches
    ? ["ledger", "commitments", "collections"]
    : ["ledger", "commitments"]

  async function selectView(view: ContributionView) {
    const nextFilters =
      view === "ledger"
        ? { view }
        : {
            channel: null,
            dateRange: null,
            memberId: null,
            search: null,
            view,
          }

    await setSortParams({ sort: null })
    if (view !== "collections") {
      await setContributionParams({ batchId: null })
    }
    await setFilters(nextFilters)
  }

  return (
    <WorkspacePageShell
      actions={
        canRecordContributions ? (
          <div className="hidden md:block">
            <OpenMemberPaymentSheet />
          </div>
        ) : undefined
      }
      eyebrow="Contributions"
      title="Contributions"
      description="Members' savings payments and monthly amounts."
    >
      {activeView === "ledger" ? null : <ContributionPageScrollHeader />}
      <section className="overflow-hidden border-b border-border md:border-y">
        <div className="border-b border-border px-4 md:px-5">
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {views.map((view) => {
              const isActive = activeView === view

              return (
                <Button
                  size="touch"
                  aria-controls="contributions-active-view"
                  aria-selected={isActive}
                  className="shrink-0 rounded-none border-b-2 px-3 text-sm shadow-none"
                  id={`contributions-${view}-tab`}
                  key={view}
                  onClick={() => void selectView(view)}
                  role="tab"
                  type="button"
                  variant="ghost"
                  style={{
                    borderBottomColor: isActive
                      ? "currentColor"
                      : "transparent",
                  }}
                >
                  {viewLabels[view]}
                </Button>
              )
            })}
          </div>
        </div>

        <div
          aria-labelledby={`contributions-${activeView}-tab`}
          id="contributions-active-view"
          role="tabpanel"
        >
          {activeView === "ledger" ? (
            <>
              <div className="px-4 py-3 md:px-5">
                <ContributionsMobileToolbar
                  canRecord={canRecordContributions}
                />
                <ContributionsHeader filterList={filterList} />
              </div>
              <ContributionsDataView
                initialSettings={contributionTableSettings}
              />
            </>
          ) : null}

          {activeView === "commitments" ? (
            <CommitmentsView
              activeCommitmentPlans={activeCommitmentPlans}
              canRecordContributions={canRecordContributions}
              members={members.items}
              paymentOrderTotal={members.total}
            />
          ) : null}

          {activeView === "collections" && canUseCollectionSourceBatches ? (
            <CollectionsView
              collectionHref={collectionHref}
              collectionSourceBatchOptions={collectionSourceBatchOptions}
              collectionSourceBatches={collectionSourceBatches}
              selectedCollectionSourceBatch={selectedCollectionSourceBatch}
            />
          ) : null}
        </div>
      </section>

      <ContributionSheet
        activeCommitmentPlans={activeCommitmentPlans}
        activeLoans={activeLoans}
        collectionSourceBatchOptions={collectionSourceBatchOptions}
        devMode={quickFillEnabled}
        members={memberOptions}
        selectedCollectionSourceBatch={selectedCollectionSourceBatch}
      />
    </WorkspacePageShell>
  )
}

function ContributionPageScrollHeader() {
  useScrollHeader(undefined, {
    lockBodyScroll: false,
    revealOnScrollUp: true,
  })

  return null
}

function CommitmentsView({
  activeCommitmentPlans,
  canRecordContributions,
  members,
  paymentOrderTotal,
}: {
  activeCommitmentPlans: ContributionsPageData["commitmentPlans"]
  canRecordContributions: boolean
  members: ContributionsPageData["members"]["items"]
  paymentOrderTotal: number
}) {
  const { setParams } = useContributionParams()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div>
          <h2 className="font-medium text-foreground">Monthly amounts</h2>
          <p className="text-muted-foreground">
            What each member pays every month.
          </p>
        </div>
        {canRecordContributions ? <OpenContributionPlanSheet /> : null}
      </div>

      <section aria-labelledby="active-plans-heading" className="px-4 md:px-5">
        <div className="flex items-center justify-between gap-3 border-b border-border py-3">
          <h3
            className="text-sm font-medium text-foreground"
            id="active-plans-heading"
          >
            Active
          </h3>
          <span className="text-sm text-muted-foreground tabular-nums">
            {activeCommitmentPlans.length}
          </span>
        </div>
        {activeCommitmentPlans.length ? (
          <div>
            {activeCommitmentPlans.map((plan) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"
                key={plan.id}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {plan.member.fullName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(Number(plan.amount))} a month · from{" "}
                    {plan.startsAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <OpenContributionPlanEditSheet planId={plan.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="border-b border-border py-8 text-sm text-muted-foreground">
            No monthly amounts set yet.
          </p>
        )}
      </section>

      <section
        aria-labelledby="payment-presets-heading"
        className="px-4 md:px-5"
      >
        <div className="grid gap-3 border-b border-border py-6">
          <div>
            <h3
              className="text-sm font-medium text-foreground"
              id="payment-presets-heading"
            >
              Payment order
            </h3>
            <p className="text-muted-foreground">
              What an extra payment goes to first. Members not listed use Manual
              split.
            </p>
          </div>
          {canRecordContributions ? (
            // Any member, not just those listed: search, then the dialog.
            <div className="w-full sm:max-w-sm">
              <MemberCombobox
                onValueChange={(memberId) => {
                  if (!memberId) return
                  void setParams({
                    contributionSheetType: "preference",
                    selectedCollectionBatchId: null,
                    selectedCollectionRowId: null,
                    selectedContributionMemberId: memberId,
                    selectedContributionPlanId: null,
                  })
                }}
                placeholder="Find a member to change"
                value=""
              />
            </div>
          ) : null}
        </div>
        {members.length ? (
          <div>
            {members.map((member) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"
                key={member.id}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {member.fullName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.memberNumber} ·{" "}
                    {sentence(member.paymentAllocationPreference)}
                  </p>
                </div>
                {canRecordContributions ? (
                  <OpenMemberPaymentPreferenceSheet memberId={member.id} />
                ) : null}
              </div>
            ))}
            {paymentOrderTotal > members.length ? (
              <p className="py-4 text-sm text-muted-foreground">
                Showing {members.length} of {paymentOrderTotal}. Search to find
                the others.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="border-b border-border py-8 text-sm text-muted-foreground">
            Every member uses Manual split.
          </p>
        )}
      </section>
    </div>
  )
}

function CollectionsView({
  collectionHref,
  collectionSourceBatchOptions,
  collectionSourceBatches,
  selectedCollectionSourceBatch,
}: {
  collectionHref: (batchId: string) => string
  collectionSourceBatchOptions: ContributionsPageData["collectionSourceBatchOptions"]
  collectionSourceBatches: ContributionsPageData["collectionSourceBatches"]
  selectedCollectionSourceBatch: ContributionsPageData["selectedCollectionSourceBatch"]
}) {
  const collectedRows =
    selectedCollectionSourceBatch?.rows.filter(
      (row) => row.status === "collected"
    ) ?? []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div>
          <h2 className="font-medium text-foreground">Workplace batches</h2>
          <p className="text-muted-foreground">
            One workplace's payments for a month.
          </p>
        </div>
        <OpenContributionBatchStageSheet
          disabled={collectionSourceBatchOptions.length === 0}
        />
      </div>

      <div className="px-4 md:px-5">
        <div className="flex gap-2 overflow-x-auto border-b border-border py-3">
          {collectionSourceBatches.length ? (
            collectionSourceBatches.map((batch) => (
              <Link
                className={buttonVariants({
                  size: "sm",
                  variant:
                    selectedCollectionSourceBatch?.id === batch.id
                      ? "secondary"
                      : "outline",
                })}
                href={collectionHref(batch.id)}
                key={batch.id}
              >
                {batch.periodLabel} · {batch.deductionSource.name}
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No batches yet.</p>
          )}
        </div>

        {selectedCollectionSourceBatch ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-5">
              <div>
                <h3 className="font-medium text-foreground">
                  {selectedCollectionSourceBatch.deductionSource.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCollectionSourceBatch.periodLabel} ·{" "}
                  {sentence(selectedCollectionSourceBatch.status)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedCollectionSourceBatch.totals.collectedRows} paid
                </Badge>
                <OpenContributionBatchPostSheet
                  batchId={selectedCollectionSourceBatch.id}
                  disabled={collectedRows.length === 0}
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
              <Metric
                label="Expected"
                value={formatCurrency(
                  selectedCollectionSourceBatch.totals.expectedAmount
                )}
              />
              <Metric
                label="Members"
                value={selectedCollectionSourceBatch.totals.rowCount.toString()}
              />
              <Metric
                label="Posted"
                value={formatCurrency(
                  selectedCollectionSourceBatch.totals.postedAmount
                )}
              />
              <Metric
                label="Needs review"
                value={(
                  selectedCollectionSourceBatch.totals.exceptionRows +
                  selectedCollectionSourceBatch.totals.blockedRows
                ).toString()}
              />
            </dl>

            <div>
              {selectedCollectionSourceBatch.rows.map((row) => (
                <div className="border-b border-border py-4" key={row.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {row.memberName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.memberNumber} · due{" "}
                        {formatCurrency(row.expectedAmount)} · paid{" "}
                        {formatCurrency(row.paidAmount)}
                      </p>
                      {rowNote(row) ? (
                        <p className="text-muted-foreground">{rowNote(row)}</p>
                      ) : null}
                    </div>
                    <Badge
                      variant={
                        row.status === "blocked" || row.status === "exception"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {sentence(row.status)}
                    </Badge>
                  </div>
                  {row.status !== "posted" && row.status !== "blocked" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <OpenContributionBatchRowCollectedSheet
                        batchId={selectedCollectionSourceBatch.id}
                        rowId={row.id}
                      />
                      <OpenContributionBatchRowExceptionSheet
                        batchId={selectedCollectionSourceBatch.id}
                        rowId={row.id}
                      />
                      {row.status === "collected" ? (
                        <OpenContributionBatchRowPostSheet
                          batchId={selectedCollectionSourceBatch.id}
                          rowId={row.id}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            Choose a batch above.
          </p>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  )
}
