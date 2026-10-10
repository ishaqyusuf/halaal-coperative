"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { PageFilterData } from "@halaalvest/utils"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import { ContributionsHeader } from "@/components/contributions-header"
import { ContributionsMobileToolbar } from "@/components/contributions-mobile-toolbar"
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
  collections: "Collections",
  commitments: "Commitments",
  ledger: "Ledger",
}

export function ContributionsUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Contributions"
      title="Contribution ledger"
      description="Contribution collection and posting activity for the active cooperative."
    >
      <WorkspaceEmptyState
        title="Contribution history is waiting for the database runtime."
        body="Once the database-backed environment is active, this route will show posted contributions, member attribution, commitment plans, and collection channels."
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
      description="Record payment evidence, maintain member commitments, and review collection-source batches."
    >
      {activeView === "ledger" ? null : <ContributionPageScrollHeader />}
      <section className="overflow-hidden border-b border-border md:border-y">
        <div className="border-b border-border px-4 md:px-5">
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {views.map((view) => {
              const isActive = activeView === view

              return (
                <Button
                  aria-controls="contributions-active-view"
                  aria-selected={isActive}
                  className="h-11 shrink-0 rounded-none border-b-2 px-3 text-sm shadow-none"
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
}: {
  activeCommitmentPlans: ContributionsPageData["commitmentPlans"]
  canRecordContributions: boolean
  members: ContributionsPageData["members"]["items"]
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div>
          <h2 className="font-medium text-foreground">Member commitments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each plan is a dated member commitment; update or close it without
            losing its history.
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
            Active plans
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
                    {formatCurrency(Number(plan.amount))} monthly · effective{" "}
                    {plan.startsAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <OpenContributionPlanEditSheet planId={plan.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="border-b border-border py-8 text-sm text-muted-foreground">
            No active commitment plans yet.
          </p>
        )}
      </section>

      <section
        aria-labelledby="payment-presets-heading"
        className="px-4 md:px-5"
      >
        <div className="border-b border-border py-6">
          <h3
            className="text-sm font-medium text-foreground"
            id="payment-presets-heading"
          >
            Payment allocation presets
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The preset determines how an unsplit payment remainder is applied.
          </p>
        </div>
        <div>
          {members.map((member) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"
              key={member.id}
            >
              <div>
                <p className="font-medium text-foreground">{member.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {member.memberNumber} ·{" "}
                  {member.paymentAllocationPreference.replace(/_/g, " ")}
                </p>
              </div>
              {canRecordContributions ? (
                <OpenMemberPaymentPreferenceSheet memberId={member.id} />
              ) : null}
            </div>
          ))}
        </div>
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
          <h2 className="font-medium text-foreground">Collection batches</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage source deductions, resolve exceptions, then post each
            collected row into the ledger.
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
            <p className="text-sm text-muted-foreground">
              No staged batches yet.
            </p>
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
                  {selectedCollectionSourceBatch.status.replace(/_/g, " ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedCollectionSourceBatch.totals.collectedRows} collected
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
                label="Rows"
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
                        {row.memberNumber} · expected{" "}
                        {formatCurrency(row.expectedAmount)} · paid{" "}
                        {formatCurrency(row.paidAmount)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        row.status === "blocked" || row.status === "exception"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {row.status.replace(/_/g, " ")}
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
            Choose a staged batch to review its member rows.
          </p>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  )
}
