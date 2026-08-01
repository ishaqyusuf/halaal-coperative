import { formatCurrency } from "@halaalvest/utils"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { CircleAlert } from "lucide-react"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MemberDetailActions } from "@/components/member-detail-actions"
import {
  OpenMemberDetailCommitmentSheet,
  OpenMemberDetailDocumentReviewSheet,
  OpenMemberDetailDocumentSheet,
  OpenMemberDetailKycSheet,
} from "@/components/open-member-detail-sheet"
import { MemberDetailSheet } from "@/components/sheets/member-detail-sheet"
import { loadMemberDetailPageData } from "@/lib/members"
import { getMemberMigrationStartHref } from "@/lib/members/member-migration-routing"

type MemberDetailPageData = Extract<
  Awaited<ReturnType<typeof loadMemberDetailPageData>>,
  { state: "ready" }
>

export function MemberDetailUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Members"
      title="Member statement"
      description="Member finance and identity details are available when the database runtime is active."
    >
      <WorkspaceEmptyState
        title="Member detail needs the database runtime."
        body="Once the database-backed environment is active, this route will show commitment, savings, loan, and repayment history for one member."
      />
    </WorkspacePageShell>
  )
}

function formatIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

export function MemberDetailView({
  canManageCommitments,
  canManageMembers,
  detail,
  operationalReadiness,
  quickFillEnabled,
}: MemberDetailPageData) {
  const rawActivePlan =
    detail.member.contributionPlans.find((plan) => plan.isActive) ?? null
  const activePlan = rawActivePlan
    ? {
        ...rawActivePlan,
        amount: Number(rawActivePlan.amount),
      }
    : null
  const today = new Date()

  return (
    <WorkspacePageShell
      actions={
        <MemberDetailActions
          canManageMembers={canManageMembers}
          memberId={detail.member.id}
        />
      }
      eyebrow="Members"
      title={detail.member.fullName}
      description="A Midday-style member workspace for identity review, KYC, savings history, loan exposure, repayments, and ledger activity."
    >
      {!operationalReadiness.isReady ? (
        <Alert className="items-start border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <CircleAlert className="mt-0.5 size-5" />
          <AlertTitle className="text-sm">
            Member verification required
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
            <p>
              This member remains read-only until every required verification
              step is complete.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {operationalReadiness.issues.includes("member_inactive") ? (
                <li>Set the registry status to active.</li>
              ) : null}
              {operationalReadiness.issues.includes("kyc_unverified") ? (
                <li>Review and verify the member’s KYC information.</li>
              ) : null}
              {operationalReadiness.issues.includes("migration_incomplete") ? (
                <li>
                  {operationalReadiness.migration.mode === "brought_forward"
                    ? "Apply the member’s brought-forward opening position."
                    : "Complete and apply the member’s historical backfill."}
                </li>
              ) : null}
            </ul>
            {canManageMembers ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {operationalReadiness.issues.includes(
                  "migration_incomplete"
                ) ? (
                  <DashboardActionLink
                    href={getMemberMigrationStartHref(
                      detail.member.id,
                      operationalReadiness.migration.mode
                    )}
                    size="sm"
                    variant="secondary"
                  >
                    {operationalReadiness.migration.mode === "brought_forward"
                      ? "Complete brought forward"
                      : operationalReadiness.migration.state === "draft"
                        ? "Continue backfill"
                        : "Start backfill"}
                  </DashboardActionLink>
                ) : null}
                {operationalReadiness.issues.includes("kyc_unverified") ? (
                  <OpenMemberDetailKycSheet />
                ) : null}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <DashboardStatCard
          detail={
            activePlan
              ? `From ${formatIsoDate(activePlan.startsAt)}`
              : "No active commitment plan"
          }
          label="Active commitment"
          value={formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}
        />
        <DashboardStatCard
          detail={`${detail.summary?.contributionsCount ?? 0} posted contribution entries`}
          label="Savings snapshot"
          tone="positive"
          value={formatCurrency(detail.summary?.totalSavingsSnapshot ?? 0)}
        />
        <DashboardStatCard
          detail={`${detail.summary?.activeLoanCount ?? 0} active or open loan records`}
          label="Outstanding loan balance"
          tone={
            detail.summary?.totalOutstandingPrincipal ? "warning" : "default"
          }
          value={formatCurrency(detail.summary?.totalOutstandingPrincipal ?? 0)}
        />
        <DashboardStatCard
          detail={
            detail.summary?.lastRepaymentAt
              ? `Last repayment ${formatIsoDate(detail.summary.lastRepaymentAt)}`
              : "No repayment recorded yet"
          }
          label="Repayments posted"
          value={formatCurrency(detail.summary?.totalRepaymentsPosted ?? 0)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <TrendPill
                tone={
                  detail.member.kycStatus === "verified"
                    ? "positive"
                    : "warning"
                }
              >
                {detail.member.kycStatus.replace(/_/g, " ")}
              </TrendPill>
            }
            eyebrow="Profile"
            title="Member profile and KYC posture"
          />
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Member number</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.memberNumber}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 font-medium text-foreground capitalize">
                {detail.member.status === "active" &&
                !operationalReadiness.isReady
                  ? "Action required"
                  : detail.member.status}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="mt-1 font-medium text-foreground capitalize">
                {detail.member.memberType.replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatIsoDate(detail.member.joinedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Primary email</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.email ??
                  detail.member.user?.email ??
                  "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone number</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.phoneNumber ?? "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Occupation</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.occupation ?? "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deduction source</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.deductionSource?.name ?? "Not set"}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.address ?? "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document type</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.kycDocumentType ?? "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document uploaded</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatIsoDate(detail.member.kycDocumentUploadedAt) ??
                  "Not uploaded"}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">KYC review notes</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.kycReviewNotes ?? "No review notes yet"}
              </dd>
            </div>
          </dl>
          {canManageMembers ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Registry actions still happen from the main members page, while
              this view focuses on statement context and KYC review detail.
            </p>
          ) : null}
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <TrendPill>
                {detail.member.contributionPlans.length} plans
              </TrendPill>
            }
            eyebrow="Commitment"
            title="Monthly commitment history"
          />
          <DashboardSurfaceCard as="article" className="mt-5">
            <details open>
              <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-foreground">
                    Current monthly commitment{" "}
                    {formatCurrency(
                      detail.summary?.activeCommitmentAmount ?? 0
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activePlan
                      ? `Effective from ${formatIsoDate(activePlan.startsAt)}`
                      : "No active monthly commitment has been recorded"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TrendPill>
                    {detail.member.contributionPlans.length} dated updates
                  </TrendPill>
                  <TrendPill tone="neutral">View history</TrendPill>
                  {canManageCommitments ? (
                    <OpenMemberDetailCommitmentSheet />
                  ) : null}
                </div>
              </summary>

              <div className="mt-5">
                <p className="text-sm font-medium text-foreground">
                  Commitment update history
                </p>
                <div className="mt-4 space-y-3">
                  {detail.member.contributionPlans.length ? (
                    detail.member.contributionPlans.map((plan) => {
                      const startsAt = formatIsoDate(plan.startsAt)
                      const endsAt = formatIsoDate(plan.endsAt)
                      const isScheduled = plan.startsAt > today
                      const statusLabel = plan.isActive
                        ? isScheduled
                          ? "Scheduled commitment"
                          : "Current commitment"
                        : "Historical commitment"

                      return (
                        <div
                          key={plan.id}
                          className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/80 px-4 py-3 sm:flex-row sm:items-center"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {startsAt}
                              {endsAt ? ` to ${endsAt}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {plan.name}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-medium text-foreground">
                              {formatCurrency(Number(plan.amount))}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {statusLabel}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No commitment has been recorded for this member yet.
                    </p>
                  )}
                </div>
              </div>
            </details>
          </DashboardSurfaceCard>
        </DashboardSectionCard>
      </section>

      {canManageMembers ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader
              actions={<OpenMemberDetailKycSheet />}
              eyebrow="Review"
              title="Update KYC details"
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Review and update identity fields from a focused sheet while the
              profile summary remains visible.
            </p>
          </DashboardSectionCard>
          <DashboardSectionCard>
            <DashboardSectionHeader
              actions={<OpenMemberDetailDocumentSheet />}
              eyebrow="Documents"
              title="Attach supporting document"
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Add identity, compliance, or supporting files from a sheet so the
              page remains a review workspace.
            </p>
          </DashboardSectionCard>
        </section>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill>{detail.member.documents.length} documents</TrendPill>
          }
          eyebrow="Documents"
          title="KYC documents"
        />
        <div className="mt-5 space-y-3">
          {detail.member.documents.length ? (
            detail.member.documents.map((document) => (
              <DashboardSurfaceCard key={document.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {document.documentType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {document.reviewStatus} · uploaded{" "}
                      {formatIsoDate(document.uploadedAt)}
                    </p>
                    <a
                      className="mt-1 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      href={document.documentUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open document
                    </a>
                  </div>
                  <TrendPill
                    tone={
                      document.reviewStatus === "verified"
                        ? "positive"
                        : document.reviewStatus === "rejected"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {document.reviewedAt
                      ? `Reviewed ${formatIsoDate(document.reviewedAt)}`
                      : "Awaiting review"}
                  </TrendPill>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {document.reviewNotes ?? "No document review notes yet."}
                </p>
                {canManageMembers ? (
                  <div className="mt-4">
                    <OpenMemberDetailDocumentReviewSheet
                      documentId={document.id}
                    />
                  </div>
                ) : null}
              </DashboardSurfaceCard>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No supporting documents have been attached yet.
            </p>
          )}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <TrendPill>{detail.contributions.length} entries</TrendPill>
            }
            eyebrow="Savings"
            title="Recent contributions"
          />
          <div className="mt-5 space-y-3">
            {detail.contributions.length ? (
              detail.contributions.map((contribution) => (
                <DashboardSurfaceCard key={contribution.id}>
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(Number(contribution.amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contribution.periodLabel ?? "Unlabeled period"} ·{" "}
                        {contribution.channel}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatIsoDate(contribution.postedAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Commitment{" "}
                    {formatCurrency(Number(contribution.committedAmount ?? 0))}{" "}
                    · Extra savings{" "}
                    {formatCurrency(
                      Number(contribution.extraSavingsAmount ?? 0)
                    )}
                  </p>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No contributions recorded yet.
              </p>
            )}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<TrendPill>{detail.repayments.length} postings</TrendPill>}
            eyebrow="Repayments"
            title="Recent repayments"
          />
          <div className="mt-5 space-y-3">
            {detail.repayments.length ? (
              detail.repayments.map((repayment) => (
                <DashboardSurfaceCard key={repayment.id}>
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(Number(repayment.amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {repayment.loan.loanProduct.name} · {repayment.status}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatIsoDate(repayment.paidAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Outstanding after posting{" "}
                    {formatCurrency(
                      Number(repayment.loan.outstandingPrincipal)
                    )}
                  </p>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No repayments recorded yet.
              </p>
            )}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill>
              {detail.ledgerTransactions.length} transactions
            </TrendPill>
          }
          eyebrow="Ledger"
          title="Ledger timeline"
        />
        <div className="mt-5 space-y-3">
          {detail.ledgerTransactions.length ? (
            detail.ledgerTransactions.slice(0, 20).map((transaction) => (
              <DashboardSurfaceCard
                as="article"
                className="rounded-lg"
                key={transaction.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.narration ?? transaction.transactionType}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground capitalize">
                      {transaction.transactionType} ·{" "}
                      {formatIsoDate(transaction.postedAt) ?? "not dated"}
                    </p>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    {transaction.entries.map((entry) => (
                      <p
                        className="text-xs text-muted-foreground"
                        key={entry.id}
                      >
                        {entry.ledgerAccount.name} · {entry.direction} ·{" "}
                        {formatCurrency(Number(entry.amount))}
                      </p>
                    ))}
                  </div>
                </div>
              </DashboardSurfaceCard>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No ledger transactions recorded yet.
            </p>
          )}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{detail.loans.length} loans</TrendPill>}
          eyebrow="Loans"
          title="Loans and schedules"
        />
        <div className="mt-5 space-y-4">
          {detail.loans.length ? (
            detail.loans.map((loan) => (
              <DashboardSurfaceCard key={loan.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {loan.loanProduct.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Principal {formatCurrency(Number(loan.principalAmount))} ·
                      Outstanding{" "}
                      {formatCurrency(Number(loan.outstandingPrincipal))}
                    </p>
                  </div>
                  <TrendPill
                    tone={
                      loan.status === "active" || loan.status === "disbursed"
                        ? "positive"
                        : "neutral"
                    }
                  >
                    {loan.status}
                  </TrendPill>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {loan.termMonths} months · servicing{" "}
                  {formatCurrency(Number(loan.estimatedMonthlyServicing))} ·
                  extra savings{" "}
                  {formatCurrency(Number(loan.extraMonthlySavingsAmount))}
                </p>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {loan.repaymentScheduleItems.map((item) => (
                    <DashboardSurfaceCard
                      key={item.id}
                      className="bg-card p-3 text-sm"
                    >
                      <p className="font-medium text-foreground">
                        Installment {item.installmentNumber}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Due {formatIsoDate(item.dueAt)}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {formatCurrency(Number(item.amountPaid))} /{" "}
                        {formatCurrency(Number(item.totalDue))}
                      </p>
                      <p className="mt-1">
                        <TrendPill
                          tone={
                            item.status === "paid"
                              ? "positive"
                              : item.status === "overdue"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {item.status}
                        </TrendPill>
                      </p>
                    </DashboardSurfaceCard>
                  ))}
                </div>
              </DashboardSurfaceCard>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No loan records yet.
            </p>
          )}
        </div>
      </DashboardSectionCard>

      <MemberDetailSheet
        activePlan={activePlan}
        devMode={quickFillEnabled}
        documents={detail.member.documents}
        member={detail.member}
      />
    </WorkspacePageShell>
  )
}
