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
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  ContributionPlanCloseForm,
  ContributionPlanForm,
  ContributionPlanUpdateForm,
  MemberPaymentForm,
  MemberPaymentPreferenceForm,
} from "@/components/forms/finance-forms"
import { ContributionsDataTable } from "@/components/tables/contributions/data-table"
import { loadContributionsPageData } from "@/lib/contributions"
import {
  postCollectionSourceContributionBatchRowsAction,
  stageCollectionSourceContributionBatchAction,
  updateCollectionSourceContributionBatchRowsAction,
} from "@/lib/dashboard-actions"

type ContributionsPageData = Extract<
  Awaited<ReturnType<typeof loadContributionsPageData>>,
  { state: "ready" }
>

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
}: ContributionsPageData & { filterList?: PageFilterData[] }) {
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
  const now = new Date()
  const currentBatchYear = now.getUTCFullYear()
  const currentBatchMonth = now.getUTCMonth() + 1
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
                <TrendPill tone="warning">
                  {selectedCollectionSourceBatch.totals.collectedRows} ready
                </TrendPill>
              ) : null
            }
            description="Stage ministry, employer, payroll, or other source deductions before posting them into member commitments."
            eyebrow="Collection Source"
            title="Batch posting"
          />
          <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <DashboardSurfaceCard>
              <form
                action={stageCollectionSourceContributionBatchAction}
                className="grid gap-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Year</span>
                    <input
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue={currentBatchYear}
                      name="year"
                      required
                      type="number"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Month</span>
                    <input
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue={currentBatchMonth}
                      max={12}
                      min={1}
                      name="month"
                      required
                      type="number"
                    />
                  </label>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-foreground">Source</span>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    name="deductionSourceId"
                    required
                  >
                    <option value="">Select source</option>
                    {collectionSourceBatchOptions.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label}
                        {source.externalReference
                          ? ` · ${source.externalReference}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-foreground">Reference</span>
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    name="reference"
                    placeholder="MIN-EDU-JUN-2026"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-foreground">Note</span>
                  <textarea
                    className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    name="notes"
                  />
                </label>
                <button
                  className={buttonVariants({ size: "sm" })}
                  disabled={collectionSourceBatchOptions.length === 0}
                  type="submit"
                >
                  Stage batch
                </button>
              </form>
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
                  {collectedRows.length ? (
                    <form
                      action={postCollectionSourceContributionBatchRowsAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input
                        name="batchId"
                        type="hidden"
                        value={selectedCollectionSourceBatch.id}
                      />
                      {collectedRows.map((row) => (
                        <input
                          key={row.id}
                          name="rowId"
                          type="hidden"
                          value={row.id}
                        />
                      ))}
                      <input
                        className="h-9 min-w-52 rounded-md border border-input bg-background px-3 text-sm"
                        name="reference"
                        placeholder="Posting reference"
                      />
                      <button
                        className={buttonVariants({ size: "sm" })}
                        type="submit"
                      >
                        Post collected rows
                      </button>
                    </form>
                  ) : null}
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
                          <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto]">
                            <form
                              action={
                                updateCollectionSourceContributionBatchRowsAction
                              }
                              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                            >
                              <input
                                name="batchId"
                                type="hidden"
                                value={selectedCollectionSourceBatch.id}
                              />
                              <input name="rowId" type="hidden" value={row.id} />
                              <input
                                name="status"
                                type="hidden"
                                value="collected"
                              />
                              <input
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                defaultValue={row.expectedAmount || ""}
                                name="paidAmount"
                                placeholder="Paid amount"
                              />
                              <input
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                name="exceptionReason"
                                placeholder="Variance note"
                              />
                              <button
                                className={buttonVariants({
                                  size: "sm",
                                  variant: "outline",
                                })}
                                type="submit"
                              >
                                Mark collected
                              </button>
                            </form>
                            <form
                              action={
                                updateCollectionSourceContributionBatchRowsAction
                              }
                              className="flex gap-2"
                            >
                              <input
                                name="batchId"
                                type="hidden"
                                value={selectedCollectionSourceBatch.id}
                              />
                              <input name="rowId" type="hidden" value={row.id} />
                              <input
                                name="status"
                                type="hidden"
                                value="exception"
                              />
                              <input
                                className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm"
                                name="exceptionReason"
                                placeholder="Reason"
                                required
                              />
                              <button
                                className={buttonVariants({
                                  size: "sm",
                                  variant: "outline",
                                })}
                                type="submit"
                              >
                                Exception
                              </button>
                            </form>
                            {row.status === "collected" ? (
                              <form
                                action={postCollectionSourceContributionBatchRowsAction}
                              >
                                <input
                                  name="batchId"
                                  type="hidden"
                                  value={selectedCollectionSourceBatch.id}
                                />
                                <input
                                  name="rowId"
                                  type="hidden"
                                  value={row.id}
                                />
                                <button
                                  className={buttonVariants({
                                    size: "sm",
                                  })}
                                  type="submit"
                                >
                                  Post row
                                </button>
                              </form>
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
              eyebrow="Commitments"
              title="Create or revise a member plan"
            />
            <div className="mt-5">
              <ContributionPlanForm
                devMode={quickFillEnabled}
                members={memberOptions}
              />
            </div>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <DashboardSectionHeader
              description="Apply one payment across savings, committed amount, extra savings, and active loan servicing."
              eyebrow="Posting"
              title="Record member payment"
            />
            <div className="mt-5">
              <MemberPaymentForm
                commitmentPlans={activeCommitmentPlans.map((plan) => ({
                  id: plan.id,
                  label: `${plan.member.fullName} · ${formatCurrency(Number(plan.amount))}`,
                }))}
                devMode={quickFillEnabled}
                loans={activeLoans.map((loan) => ({
                  id: loan.id,
                  label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
                }))}
                members={memberOptions}
              />
            </div>
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
              <MemberPaymentPreferenceForm
                key={member.id}
                defaultValues={{
                  memberId: member.id,
                  preference: member.paymentAllocationPreference,
                }}
                title={`${member.fullName} · ${member.memberNumber}`}
              />
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
                  <ContributionPlanUpdateForm
                    defaultValues={{
                      amount: String(Number(plan.amount)),
                      name: plan.name ?? "",
                      planId: plan.id,
                    }}
                  />
                  <ContributionPlanCloseForm planId={plan.id} />
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
          <ContributionsDataTable items={contributions.items} />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
