import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
} from "@/components/dashboard/static-table"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  MemberCommitmentForm,
  MemberDocumentForm,
  MemberDocumentReviewForm,
  MemberKycForm,
} from "@/components/forms/member-forms"
import { loadMemberDetailPageData } from "@/lib/members"

type MemberDetailPageData = Extract<
  Awaited<ReturnType<typeof loadMemberDetailPageData>>,
  { state: "ready" }
>

function formatIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

export function MemberDetailView({
  canManageCommitments,
  canManageMembers,
  detail,
  quickFillEnabled,
}: MemberDetailPageData) {
  const activePlan = detail.member.contributionPlans.find((plan) => plan.isActive) ?? null
  const today = new Date()

  return (
    <WorkspacePageShell
      eyebrow="Members"
      title={detail.member.fullName}
      description="A Midday-style member workspace for identity review, KYC, savings history, loan exposure, repayments, and ledger activity."
    >
      <div className="flex flex-wrap items-center gap-3">
        <DashboardActionLink href="/members">
          Back to member registry
        </DashboardActionLink>
        <DashboardActionLink href={`/members/${detail.member.id}/statement`}>
          Open printable statement
        </DashboardActionLink>
        <DashboardActionLink
          href={`/members/${detail.member.id}/backfill?step=baseline`}
          variant="secondary"
        >
          Backfill history
        </DashboardActionLink>
        <a
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          href={`/members/${detail.member.id}/statement-export`}
        >
          Download member statement
        </a>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          tone={detail.summary?.totalOutstandingPrincipal ? "warning" : "default"}
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
              <TrendPill tone={detail.member.kycStatus === "verified" ? "positive" : "warning"}>
                {detail.member.kycStatus.replace(/_/g, " ")}
              </TrendPill>
            }
            eyebrow="Profile"
            title="Member profile and KYC posture"
          />
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Member number</dt>
              <dd className="mt-1 font-medium text-foreground">{detail.member.memberNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 font-medium capitalize text-foreground">{detail.member.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="mt-1 font-medium capitalize text-foreground">
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
                {detail.member.email ?? detail.member.user?.email ?? "Not provided"}
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
                {formatIsoDate(detail.member.kycDocumentUploadedAt) ?? "Not uploaded"}
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
              Registry actions still happen from the main members page, while this view focuses on
              statement context and KYC review detail.
            </p>
          ) : null}
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<TrendPill>{detail.member.contributionPlans.length} plans</TrendPill>}
            eyebrow="Commitment"
            title="Monthly commitment history"
          />
          <DashboardSurfaceCard as="article" className="mt-5">
            <details open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    Current monthly commitment {formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activePlan
                      ? `Effective from ${formatIsoDate(activePlan.startsAt)}`
                      : "No active monthly commitment has been recorded"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TrendPill>{detail.member.contributionPlans.length} dated updates</TrendPill>
                  <TrendPill tone="neutral">View history</TrendPill>
                </div>
              </summary>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="text-sm font-medium text-foreground">Commitment update history</p>
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
                            className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {startsAt}
                                {endsAt ? ` to ${endsAt}` : ""}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{plan.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">
                                {formatCurrency(Number(plan.amount))}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
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

                {canManageCommitments ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">New commitment version</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Add the member’s next monthly commitment and the date it starts.
                    </p>
                    <div className="mt-5">
                      <MemberCommitmentForm
                        defaultAmount={
                          activePlan ? String(Number(activePlan.amount)) : undefined
                        }
                        defaultStartDate={
                          activePlan ? undefined : formatIsoDate(detail.member.joinedAt) ?? undefined
                        }
                        memberId={detail.member.id}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Saving closes the existing active commitment from the selected effective date.
                    </p>
                  </div>
                ) : null}
              </div>
            </details>
          </DashboardSurfaceCard>
        </DashboardSectionCard>
      </section>

      {canManageMembers ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader eyebrow="Review" title="Update KYC details" />
            <div className="mt-5">
              <MemberKycForm
                defaultValues={{
                  governmentIdNumber: detail.member.governmentIdNumber ?? "",
                  kycDocumentType: detail.member.kycDocumentType ?? "",
                  kycDocumentUrl: detail.member.kycDocumentUrl ?? "",
                  kycReviewNotes: detail.member.kycReviewNotes ?? "",
                  kycStatus: detail.member.kycStatus,
                  memberId: detail.member.id,
                }}
                devMode={quickFillEnabled}
              />
            </div>
          </DashboardSectionCard>
          <DashboardSectionCard>
            <DashboardSectionHeader eyebrow="Documents" title="Attach supporting document" />
            <div className="mt-5">
              <MemberDocumentForm
                defaultMemberId={detail.member.id}
                devMode={quickFillEnabled}
              />
            </div>
          </DashboardSectionCard>
        </section>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{detail.member.documents.length} documents</TrendPill>}
          eyebrow="Documents"
          title="KYC documents"
        />
        <div className="mt-5 space-y-3">
          {detail.member.documents.length ? (
            detail.member.documents.map((document) => (
              <DashboardSurfaceCard key={document.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{document.documentType}</p>
                    <p className="text-sm text-muted-foreground">
                      {document.reviewStatus} · uploaded {formatIsoDate(document.uploadedAt)}
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
                    <MemberDocumentReviewForm
                      defaultValues={{
                        documentId: document.id,
                        reviewNotes: document.reviewNotes ?? "",
                        reviewStatus:
                          (document.reviewStatus as "pending" | "verified" | "rejected") ??
                          "pending",
                      }}
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
            actions={<TrendPill>{detail.contributions.length} entries</TrendPill>}
            eyebrow="Savings"
            title="Recent contributions"
          />
          <div className="mt-5 space-y-3">
            {detail.contributions.length ? (
              detail.contributions.map((contribution) => (
                <DashboardSurfaceCard key={contribution.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(Number(contribution.amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contribution.periodLabel ?? "Unlabeled period"} · {contribution.channel}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatIsoDate(contribution.postedAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Commitment {formatCurrency(Number(contribution.committedAmount ?? 0))} · Extra
                    savings {formatCurrency(Number(contribution.extraSavingsAmount ?? 0))}
                  </p>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No contributions recorded yet.</p>
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
                  <div className="flex items-start justify-between gap-4">
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
                    {formatCurrency(Number(repayment.loan.outstandingPrincipal))}
                  </p>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No repayments recorded yet.</p>
            )}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{detail.ledgerTransactions.length} transactions</TrendPill>}
          eyebrow="Ledger"
          title="Ledger timeline"
        />
        <div className="mt-5">
          <DashboardDataTable>
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Narration</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Type</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Posted</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Entries</DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {detail.ledgerTransactions.slice(0, 20).map((transaction) => (
                  <DashboardTableRow key={transaction.id}>
                    <DashboardTableCell>
                      {transaction.narration ?? transaction.transactionType}
                    </DashboardTableCell>
                    <DashboardTableCell className="capitalize">
                      {transaction.transactionType}
                    </DashboardTableCell>
                    <DashboardTableCell>{formatIsoDate(transaction.postedAt)}</DashboardTableCell>
                    <DashboardTableCell>
                      <div className="space-y-1">
                        {transaction.entries.map((entry) => (
                          <p key={entry.id} className="text-xs text-muted-foreground">
                            {entry.ledgerAccount.name} · {entry.direction} ·{" "}
                            {formatCurrency(Number(entry.amount))}
                          </p>
                        ))}
                      </div>
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
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
                    <p className="font-medium text-foreground">{loan.loanProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Principal {formatCurrency(Number(loan.principalAmount))} · Outstanding{" "}
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
                  {formatCurrency(Number(loan.estimatedMonthlyServicing))} · extra savings{" "}
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
            <p className="text-sm text-muted-foreground">No loan records yet.</p>
          )}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
