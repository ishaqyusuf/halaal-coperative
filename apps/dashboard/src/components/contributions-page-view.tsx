import Link from "next/link"
import type { PageFilterData } from "@halaalvest/utils"
import { Badge } from "@halaalvest/ui/components/badge"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import { ContributionsHeader } from "@/components/contributions-header"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
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
import { ContributionsDataTable } from "@/components/tables/contributions/data-table"
import { loadContributionsPageData } from "@/lib/contributions"
import type { TableSettings } from "@/utils/table-settings"

type ContributionsPageData = Extract<
  Awaited<ReturnType<typeof loadContributionsPageData>>,
  { state: "ready" }
>

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

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function ContributionsPageView({
  canRecordContributions,
  canUseCollectionSourceBatches,
  commitmentPlans,
  collectionSourceBatchOptions,
  collectionSourceBatches,
  contributions,
  currentMonthFilter,
  filterList,
  loans,
  members,
  quickFillEnabled,
  selectedCollectionSourceBatch,
  stagedContributions,
  contributionTableSettings,
}: ContributionsPageData & {
  contributionTableSettings?: Partial<TableSettings>
  filterList?: PageFilterData[]
}) {
  const activeCommitmentPlans = commitmentPlans.filter((plan) => plan.isActive)
  const activeLoans = loans.filter((loan) =>
    ["approved", "disbursed", "active"].includes(loan.status),
  )
  const stagedTotal = stagedContributions.reduce(
    (total, row) => total + row.totalPayableAmount,
    0,
  )
  const showThisMonthHref = `/contributions?from=${currentMonthFilter.from}&to=${currentMonthFilter.to}`
  const memberOptions = members.items.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }))
  const collectedRows =
    selectedCollectionSourceBatch?.rows.filter((row) => row.status === "collected") ?? []

  return (
    <WorkspacePageShell
      eyebrow="Contributions"
      title="Member commitments and payments"
      description="Manage variable member commitments, split payments, overpayments, and active savings plans from one Midday-style ledger workspace."
    >
      <ContributionsHeader filterList={filterList} />

      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          detail="Posted contribution records in the current filtered result."
          label="Entries"
          value={contributions.total.toString()}
        />
        <DashboardStatCard
          detail="Current recurring savings plans still open for members."
          label="Active commitments"
          tone="positive"
          value={activeCommitmentPlans.length.toString()}
        />
        <DashboardStatCard
          detail="Active loans available when splitting one member payment."
          label="Loans in servicing"
          value={activeLoans.length.toString()}
        />
        <DashboardStatCard
          detail="Available members in the current workspace runtime."
          label="Members loaded"
          value={members.items.length.toString()}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            currentMonthFilter.isActive ? (
              <TrendPill tone={stagedContributions.length ? "warning" : "positive"}>
                {stagedContributions.length} staged
              </TrendPill>
            ) : (
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={showThisMonthHref}
              >
                Show this month
              </Link>
            )
          }
          description={
            currentMonthFilter.isActive
              ? "These rows are staged from the monthly contribution roll and are not posted until applied from monthly records."
              : "Staged monthly contributions are hidden from the ledger until the date filter is set to this month."
          }
          eyebrow="Current month"
          title={`Staged contributions for ${currentMonthFilter.label}`}
        />
        {currentMonthFilter.isActive ? (
          <div className="mt-5">
            {stagedContributions.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {stagedContributions.map((row) => (
                  <DashboardSurfaceCard key={row.id} className="rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {row.memberName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {row.memberNumber} · {row.periodLabel}
                        </p>
                      </div>
                      <Badge variant="secondary">staged</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Savings</p>
                        <p className="font-medium text-foreground">
                          {formatCurrency(row.contributionAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Share</p>
                        <p className="font-medium text-foreground">
                          {formatCurrency(row.shareChargeAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Loan due</p>
                        <p className="font-medium text-foreground">
                          {formatCurrency(row.loanRepaymentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payable</p>
                        <p className="font-medium text-foreground">
                          {formatCurrency(row.totalPayableAmount)}
                        </p>
                      </div>
                    </div>
                  </DashboardSurfaceCard>
                ))}
                <DashboardSurfaceCard className="rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Staged total
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {formatCurrency(stagedTotal)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Apply rows from monthly records when payments are confirmed.
                  </p>
                </DashboardSurfaceCard>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No staged rows exist for the current month yet.
              </p>
            )}
          </div>
        ) : null}
      </DashboardSectionCard>

      {canUseCollectionSourceBatches ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              selectedCollectionSourceBatch ? (
                <div className="flex flex-wrap items-center gap-2">
                  <TrendPill tone="warning">
                    {selectedCollectionSourceBatch.totals.collectedRows} ready
                  </TrendPill>
                  <OpenContributionBatchPostSheet
                    batchId={selectedCollectionSourceBatch.id}
                    disabled={collectedRows.length === 0}
                  />
                </div>
              ) : null
            }
            description="Stage ministry, employer, payroll, or other source deductions before posting them into member commitments."
            eyebrow="Collection Source"
            title="Batch posting"
          />
          <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <DashboardSurfaceCard>
              <div className="grid gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    Stage a collection source batch
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start a payroll, ministry, employer, or other source
                    deduction batch from a focused sheet.
                  </p>
                </div>
                <div>
                  <OpenContributionBatchStageSheet
                    disabled={collectionSourceBatchOptions.length === 0}
                  />
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {collectionSourceBatches.map((batch) => (
                  <Link
                    className={buttonVariants({
                      size: "sm",
                      variant:
                        selectedCollectionSourceBatch?.id === batch.id
                          ? "default"
                          : "outline",
                    })}
                    href={`/contributions?batchId=${batch.id}`}
                    key={batch.id}
                  >
                    {batch.periodLabel} · {batch.deductionSource.name}
                  </Link>
                ))}
              </div>
            </DashboardSurfaceCard>

            <DashboardSurfaceCard>
              {selectedCollectionSourceBatch ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedCollectionSourceBatch.deductionSource.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCollectionSourceBatch.periodLabel} ·{" "}
                        {selectedCollectionSourceBatch.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <TrendPill>
                      {formatCurrency(
                        selectedCollectionSourceBatch.totals.expectedAmount,
                      )}
                    </TrendPill>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Rows</p>
                      <p className="font-medium text-foreground">
                        {selectedCollectionSourceBatch.totals.rowCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Collected</p>
                      <p className="font-medium text-foreground">
                        {selectedCollectionSourceBatch.totals.collectedRows}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Posted</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(
                          selectedCollectionSourceBatch.totals.postedAmount,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Exceptions</p>
                      <p className="font-medium text-foreground">
                        {selectedCollectionSourceBatch.totals.exceptionRows +
                          selectedCollectionSourceBatch.totals.blockedRows}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedCollectionSourceBatch.rows.map((row) => (
                      <div
                        className="rounded-lg border border-border/70 bg-background/70 p-4"
                        key={row.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {row.memberName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {row.memberNumber} · {row.memberStatus}
                            </p>
                          </div>
                          <Badge
                            variant={
                              row.status === "blocked" ||
                              row.status === "exception"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {row.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Expected
                            </p>
                            <p className="font-medium text-foreground">
                              {formatCurrency(row.expectedAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Paid</p>
                            <p className="font-medium text-foreground">
                              {formatCurrency(row.paidAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Blocker
                            </p>
                            <p className="font-medium text-foreground">
                              {row.blocker?.replace(/_/g, " ") ?? "None"}
                            </p>
                          </div>
                        </div>
                        {row.status !== "posted" && row.status !== "blocked" ? (
                          <div className="mt-4 flex flex-wrap gap-2">
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
                <p className="text-sm text-muted-foreground">
                  No Collection Source batch is staged yet.
                </p>
              )}
            </DashboardSurfaceCard>
          </div>
        </DashboardSectionCard>
      ) : null}

      {canRecordContributions ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader
              description="Set the member’s recurring target and keep the plan history explicit."
              actions={<OpenContributionPlanSheet />}
              eyebrow="Commitments"
              title="Create or revise a member plan"
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Create monthly commitments in a focused sheet so this page stays
              centered on review and ledger activity.
            </p>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <DashboardSectionHeader
              description="Apply one payment across savings, committed amount, extra savings, and active loan servicing."
              actions={<OpenMemberPaymentSheet />}
              eyebrow="Posting"
              title="Record member payment"
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Post manual payments from a dedicated sheet, including savings,
              extra savings, and active loan servicing.
            </p>
          </DashboardSectionCard>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader
            description="Control how any remainder is allocated when a total payment is larger than the manual split."
            eyebrow="Presets"
            title="Member payment preferences"
          />
          <div className="mt-5 space-y-3">
            {members.items.map((member) => (
              <DashboardSurfaceCard
                className="flex items-center justify-between gap-3 rounded-lg"
                key={member.id}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {member.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.memberNumber} ·{" "}
                    {member.paymentAllocationPreference.replace(/_/g, " ")}
                  </p>
                </div>
                <OpenMemberPaymentPreferenceSheet memberId={member.id} />
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            description="Update a member’s current monthly commitment or close the plan when the schedule changes."
            eyebrow="Plans"
            title="Active commitment plans"
          />
          <div className="mt-5 space-y-3">
            {activeCommitmentPlans.length ? (
              activeCommitmentPlans.map((plan) => (
                <DashboardSurfaceCard key={plan.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{plan.member.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(plan.amount))} · from {formatIsoDate(plan.startsAt)}
                      </p>
                    </div>
                    <TrendPill tone="positive">Active</TrendPill>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <OpenContributionPlanEditSheet planId={plan.id} />
                  </div>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active commitment plans yet.</p>
            )}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{contributions.total} rows</TrendPill>}
          description="The current filtered ledger including committed amount, extra savings, and posting date."
          eyebrow="Ledger"
          title="Recent contribution activity"
        />
        <div className="mt-5">
          <ContributionsDataTable initialSettings={contributionTableSettings} />
        </div>
      </DashboardSectionCard>

      <ContributionSheet
        activeCommitmentPlans={activeCommitmentPlans}
        activeLoans={activeLoans}
        collectionSourceBatchOptions={collectionSourceBatchOptions}
        devMode={quickFillEnabled}
        members={members.items.map((member) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
          paymentAllocationPreference: member.paymentAllocationPreference,
        }))}
        selectedCollectionSourceBatch={selectedCollectionSourceBatch}
      />
    </WorkspacePageShell>
  )
}
