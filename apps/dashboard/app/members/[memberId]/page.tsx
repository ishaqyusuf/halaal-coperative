import { createDbRuntime, getMemberStatementDetail } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MemberDocumentForm, MemberDocumentReviewForm, MemberKycForm } from "@/features/forms/member-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
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

  const detail = await getMemberStatementDetail(context.tenant.id, memberId)

  if (!detail) {
    notFound()
  }

  const canManageMembers = hasAnyRole(context.auth.membership?.role, memberManagementRoles)
  const activePlan = detail.member.contributionPlans.find((plan) => plan.isActive) ?? null

  return (
    <WorkspacePageShell
      eyebrow="Members"
      title={detail.member.fullName}
      description="Member-specific statement view across identity, commitment plan, savings activity, loan exposure, and repayment history."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href="/members">
          Back to member registry
        </Link>
        <Link
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          href={`/members/${detail.member.id}/statement`}
        >
          Open printable statement
        </Link>
        <a
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          href="/reports/member-statements-export"
        >
          Download full member statements CSV
        </a>
        <a
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          href={`/members/${detail.member.id}/statement-export`}
        >
          Download member statement
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active commitment</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {activePlan ? `From ${activePlan.startsAt.toISOString().slice(0, 10)}` : "No active commitment plan"}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Savings snapshot</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(detail.summary?.totalSavingsSnapshot ?? 0)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.summary?.contributionsCount ?? 0} posted contribution entries
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Outstanding loan balance</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(detail.summary?.totalOutstandingPrincipal ?? 0)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.summary?.activeLoanCount ?? 0} active or open loan records
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Repayments posted</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(detail.summary?.totalRepaymentsPosted ?? 0)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.summary?.lastRepaymentAt
              ? `Last repayment ${detail.summary.lastRepaymentAt.toISOString().slice(0, 10)}`
              : "No repayment recorded yet"}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Profile</h3>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
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
              <dd className="mt-1 font-medium text-foreground">{detail.member.joinedAt.toISOString().slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Primary email</dt>
              <dd className="mt-1 font-medium text-foreground">{detail.member.user?.email ?? "No linked user"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deduction source</dt>
              <dd className="mt-1 font-medium text-foreground">{detail.member.deductionSource?.name ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">KYC status</dt>
              <dd className="mt-1 font-medium capitalize text-foreground">
                {detail.member.kycStatus.replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">KYC document type</dt>
              <dd className="mt-1 font-medium text-foreground">{detail.member.kycDocumentType ?? "Not provided"}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">KYC review notes</dt>
              <dd className="mt-1 font-medium text-foreground">{detail.member.kycReviewNotes ?? "No review notes yet"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document uploaded</dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.member.kycDocumentUploadedAt
                  ? detail.member.kycDocumentUploadedAt.toISOString().slice(0, 10)
                  : "Not uploaded"}
              </dd>
            </div>
          </dl>
          {canManageMembers ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              This page is intended for admin and operations review. Status changes still happen from the member registry while the detail view focuses on statement context.
            </p>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Commitment timeline</h3>
          <div className="mt-4 space-y-3">
            {detail.member.contributionPlans.length ? (
              detail.member.contributionPlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-border/60 p-4">
                  <p className="font-medium text-foreground">{plan.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(Number(plan.amount))} monthly from {plan.startsAt.toISOString().slice(0, 10)}
                    {plan.endsAt ? ` to ${plan.endsAt.toISOString().slice(0, 10)}` : ""}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {plan.isActive ? "Active" : "Closed"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No commitment plan has been recorded for this member yet.</p>
            )}
          </div>
        </article>
      </div>

      {canManageMembers ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <MemberKycForm
            defaultValues={{
              governmentIdNumber: detail.member.governmentIdNumber ?? "",
              kycDocumentType: detail.member.kycDocumentType ?? "",
              kycDocumentUrl: detail.member.kycDocumentUrl ?? "",
              kycReviewNotes: detail.member.kycReviewNotes ?? "",
              kycStatus: detail.member.kycStatus,
              memberId: detail.member.id,
            }}
            devMode={process.env.NODE_ENV !== "production"}
          />
          <MemberDocumentForm defaultMemberId={detail.member.id} devMode={process.env.NODE_ENV !== "production"} />
        </div>
      ) : null}

      <article className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">KYC documents</h3>
        </div>
        <div className="divide-y divide-border/60">
          {detail.member.documents.length ? (
            detail.member.documents.map((document) => (
              <div key={document.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{document.documentType}</p>
                    <p className="text-sm text-muted-foreground">
                      {document.reviewStatus} · uploaded {document.uploadedAt.toISOString().slice(0, 10)}
                    </p>
                    <a
                      className="mt-1 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      href={document.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open document
                    </a>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {document.reviewedAt ? `Reviewed ${document.reviewedAt.toISOString().slice(0, 10)}` : "Awaiting review"}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{document.reviewNotes ?? "No document review notes yet."}</p>
                {canManageMembers ? (
                  <MemberDocumentReviewForm
                    defaultValues={{
                      documentId: document.id,
                      reviewNotes: document.reviewNotes ?? "",
                      reviewStatus: (document.reviewStatus as "pending" | "verified" | "rejected") ?? "pending",
                    }}
                  />
                ) : null}
              </div>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">No supporting documents have been attached yet.</p>
          )}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent contributions</h3>
          </div>
          <div className="divide-y divide-border/60">
            {detail.contributions.length ? (
              detail.contributions.map((contribution) => (
                <div key={contribution.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{formatCurrency(Number(contribution.amount))}</p>
                      <p className="text-sm text-muted-foreground">
                        {contribution.periodLabel ?? "Unlabeled period"} · {contribution.channel}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{contribution.postedAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Commitment {formatCurrency(Number(contribution.committedAmount ?? 0))}
                    {" · "}Extra savings {formatCurrency(Number(contribution.extraSavingsAmount ?? 0))}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">No contributions recorded yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent repayments</h3>
          </div>
          <div className="divide-y divide-border/60">
            {detail.repayments.length ? (
              detail.repayments.map((repayment) => (
                <div key={repayment.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{formatCurrency(Number(repayment.amount))}</p>
                      <p className="text-sm text-muted-foreground">
                        {repayment.loan.loanProduct.name} · {repayment.status}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{repayment.paidAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Outstanding after posting {formatCurrency(Number(repayment.loan.outstandingPrincipal))}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">No repayments recorded yet.</p>
            )}
          </div>
        </article>
      </div>

      <article className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Ledger timeline</h3>
        </div>
        <div className="divide-y divide-border/60">
          {detail.ledgerTransactions.length ? (
            detail.ledgerTransactions.slice(0, 20).map((transaction) => (
              <div key={transaction.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.narration ?? transaction.transactionType}
                    </p>
                    <p className="text-sm capitalize text-muted-foreground">{transaction.transactionType}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{transaction.postedAt.toISOString().slice(0, 10)}</p>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {transaction.entries.map((entry) => (
                    <p key={entry.id} className="text-sm text-muted-foreground">
                      {entry.ledgerAccount.name} · {entry.direction} · {formatCurrency(Number(entry.amount))}
                    </p>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">No ledger transactions recorded yet.</p>
          )}
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Loans and schedules</h3>
        </div>
        <div className="divide-y divide-border/60">
          {detail.loans.length ? (
            detail.loans.map((loan) => (
              <div key={loan.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{loan.loanProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Principal {formatCurrency(Number(loan.principalAmount))}
                      {" · "}Outstanding {formatCurrency(Number(loan.outstandingPrincipal))}
                    </p>
                  </div>
                  <p className="text-sm capitalize text-muted-foreground">{loan.status}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {loan.termMonths} months · servicing {formatCurrency(Number(loan.estimatedMonthlyServicing))}
                  {" · "}extra savings {formatCurrency(Number(loan.extraMonthlySavingsAmount))}
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  {loan.repaymentScheduleItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 p-3 text-sm">
                      <p className="font-medium text-foreground">Installment {item.installmentNumber}</p>
                      <p className="mt-1 text-muted-foreground">Due {item.dueAt.toISOString().slice(0, 10)}</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatCurrency(Number(item.amountPaid))} / {formatCurrency(Number(item.totalDue))}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">No loan records yet.</p>
          )}
        </div>
      </article>
    </WorkspacePageShell>
  )
}
