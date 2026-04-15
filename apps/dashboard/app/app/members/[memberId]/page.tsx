import Link from "next/link"
import { createDbRuntime, getMemberStatementDetail } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import { notFound } from "next/navigation"
import {
  DashboardDataTable,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard/primitives"
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
      <WorkspacePageShell eyebrow="Members" title="Member statement" description="Member finance and identity details are available when the database runtime is active.">
        <WorkspaceEmptyState title="Member detail needs the database runtime." body="Once the database-backed environment is active, this route will show commitment, savings, loan, and repayment history for one member." />
      </WorkspacePageShell>
    )
  }

  const detail = await getMemberStatementDetail(context.tenant.id, memberId)
  if (!detail) notFound()

  const canManageMembers = hasAnyRole(context.auth.membership?.role, memberManagementRoles)
  const activePlan = detail.member.contributionPlans.find((plan) => plan.isActive) ?? null

  return (
    <WorkspacePageShell
      eyebrow="Members"
      title={detail.member.fullName}
      description="A Midday-style member workspace for identity review, KYC, savings history, loan exposure, repayments, and ledger activity."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href="/app/members">Back to member registry</Link>
        <Link className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href={`/app/members/${detail.member.id}/statement`}>Open printable statement</Link>
        <a className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href={`/app/members/${detail.member.id}/statement-export`}>Download member statement</a>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Active commitment" value={formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)} detail={activePlan ? `From ${activePlan.startsAt.toISOString().slice(0, 10)}` : "No active commitment plan"} />
        <DashboardStatCard label="Savings snapshot" value={formatCurrency(detail.summary?.totalSavingsSnapshot ?? 0)} detail={`${detail.summary?.contributionsCount ?? 0} posted contribution entries`} tone="positive" />
        <DashboardStatCard label="Outstanding loan balance" value={formatCurrency(detail.summary?.totalOutstandingPrincipal ?? 0)} detail={`${detail.summary?.activeLoanCount ?? 0} active or open loan records`} tone={detail.summary?.totalOutstandingPrincipal ? "warning" : "default"} />
        <DashboardStatCard label="Repayments posted" value={formatCurrency(detail.summary?.totalRepaymentsPosted ?? 0)} detail={detail.summary?.lastRepaymentAt ? `Last repayment ${detail.summary.lastRepaymentAt.toISOString().slice(0, 10)}` : "No repayment recorded yet"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Profile" title="Member profile and KYC posture" actions={<TrendPill tone={detail.member.kycStatus === "verified" ? "positive" : "warning"}>{detail.member.kycStatus.replace(/_/g, " ")}</TrendPill>} />
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <div><dt className="text-muted-foreground">Member number</dt><dd className="mt-1 font-medium text-foreground">{detail.member.memberNumber}</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1 font-medium capitalize text-foreground">{detail.member.status}</dd></div>
            <div><dt className="text-muted-foreground">Type</dt><dd className="mt-1 font-medium capitalize text-foreground">{detail.member.memberType.replace(/_/g, " ")}</dd></div>
            <div><dt className="text-muted-foreground">Joined</dt><dd className="mt-1 font-medium text-foreground">{detail.member.joinedAt.toISOString().slice(0, 10)}</dd></div>
            <div><dt className="text-muted-foreground">Primary email</dt><dd className="mt-1 font-medium text-foreground">{detail.member.user?.email ?? "No linked user"}</dd></div>
            <div><dt className="text-muted-foreground">Deduction source</dt><dd className="mt-1 font-medium text-foreground">{detail.member.deductionSource?.name ?? "Not set"}</dd></div>
            <div><dt className="text-muted-foreground">Document type</dt><dd className="mt-1 font-medium text-foreground">{detail.member.kycDocumentType ?? "Not provided"}</dd></div>
            <div><dt className="text-muted-foreground">Document uploaded</dt><dd className="mt-1 font-medium text-foreground">{detail.member.kycDocumentUploadedAt ? detail.member.kycDocumentUploadedAt.toISOString().slice(0, 10) : "Not uploaded"}</dd></div>
            <div className="md:col-span-2"><dt className="text-muted-foreground">KYC review notes</dt><dd className="mt-1 font-medium text-foreground">{detail.member.kycReviewNotes ?? "No review notes yet"}</dd></div>
          </dl>
          {canManageMembers ? <p className="mt-4 text-sm leading-6 text-muted-foreground">Registry actions still happen from the main members page, while this view focuses on statement context and KYC review detail.</p> : null}
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Commitment" title="Commitment timeline" actions={<TrendPill>{detail.member.contributionPlans.length} plans</TrendPill>} />
          <div className="mt-5 space-y-3">
            {detail.member.contributionPlans.length ? detail.member.contributionPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(Number(plan.amount))} monthly from {plan.startsAt.toISOString().slice(0, 10)}{plan.endsAt ? ` to ${plan.endsAt.toISOString().slice(0, 10)}` : ""}</p>
                <p className="mt-2"><TrendPill tone={plan.isActive ? "positive" : "neutral"}>{plan.isActive ? "Active" : "Closed"}</TrendPill></p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No commitment plan has been recorded for this member yet.</p>}
          </div>
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
                devMode={process.env.NODE_ENV !== "production"}
              />
            </div>
          </DashboardSectionCard>
          <DashboardSectionCard>
            <DashboardSectionHeader eyebrow="Documents" title="Attach supporting document" />
            <div className="mt-5">
              <MemberDocumentForm defaultMemberId={detail.member.id} devMode={process.env.NODE_ENV !== "production"} />
            </div>
          </DashboardSectionCard>
        </section>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Documents" title="KYC documents" actions={<TrendPill>{detail.member.documents.length} documents</TrendPill>} />
        <div className="mt-5 space-y-3">
          {detail.member.documents.length ? detail.member.documents.map((document) => (
            <div key={document.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{document.documentType}</p>
                  <p className="text-sm text-muted-foreground">{document.reviewStatus} · uploaded {document.uploadedAt.toISOString().slice(0, 10)}</p>
                  <a className="mt-1 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline" href={document.documentUrl} target="_blank" rel="noreferrer">Open document</a>
                </div>
                <TrendPill tone={document.reviewStatus === "verified" ? "positive" : document.reviewStatus === "rejected" ? "warning" : "neutral"}>
                  {document.reviewedAt ? `Reviewed ${document.reviewedAt.toISOString().slice(0, 10)}` : "Awaiting review"}
                </TrendPill>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{document.reviewNotes ?? "No document review notes yet."}</p>
              {canManageMembers ? (
                <div className="mt-4">
                  <MemberDocumentReviewForm
                    defaultValues={{
                      documentId: document.id,
                      reviewNotes: document.reviewNotes ?? "",
                      reviewStatus: (document.reviewStatus as "pending" | "verified" | "rejected") ?? "pending",
                    }}
                  />
                </div>
              ) : null}
            </div>
          )) : <p className="text-sm text-muted-foreground">No supporting documents have been attached yet.</p>}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Savings" title="Recent contributions" actions={<TrendPill>{detail.contributions.length} entries</TrendPill>} />
          <div className="mt-5 space-y-3">
            {detail.contributions.length ? detail.contributions.map((contribution) => (
              <div key={contribution.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{formatCurrency(Number(contribution.amount))}</p>
                    <p className="text-sm text-muted-foreground">{contribution.periodLabel ?? "Unlabeled period"} · {contribution.channel}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{contribution.postedAt.toISOString().slice(0, 10)}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Commitment {formatCurrency(Number(contribution.committedAmount ?? 0))} · Extra savings {formatCurrency(Number(contribution.extraSavingsAmount ?? 0))}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No contributions recorded yet.</p>}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Repayments" title="Recent repayments" actions={<TrendPill>{detail.repayments.length} postings</TrendPill>} />
          <div className="mt-5 space-y-3">
            {detail.repayments.length ? detail.repayments.map((repayment) => (
              <div key={repayment.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{formatCurrency(Number(repayment.amount))}</p>
                    <p className="text-sm text-muted-foreground">{repayment.loan.loanProduct.name} · {repayment.status}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{repayment.paidAt.toISOString().slice(0, 10)}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Outstanding after posting {formatCurrency(Number(repayment.loan.outstandingPrincipal))}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No repayments recorded yet.</p>}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Ledger" title="Ledger timeline" actions={<TrendPill>{detail.ledgerTransactions.length} transactions</TrendPill>} />
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
                    <DashboardTableCell>{transaction.narration ?? transaction.transactionType}</DashboardTableCell>
                    <DashboardTableCell className="capitalize">{transaction.transactionType}</DashboardTableCell>
                    <DashboardTableCell>{transaction.postedAt.toISOString().slice(0, 10)}</DashboardTableCell>
                    <DashboardTableCell>
                      <div className="space-y-1">
                        {transaction.entries.map((entry) => (
                          <p key={entry.id} className="text-xs text-muted-foreground">{entry.ledgerAccount.name} · {entry.direction} · {formatCurrency(Number(entry.amount))}</p>
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
        <DashboardSectionHeader eyebrow="Loans" title="Loans and schedules" actions={<TrendPill>{detail.loans.length} loans</TrendPill>} />
        <div className="mt-5 space-y-4">
          {detail.loans.length ? detail.loans.map((loan) => (
            <div key={loan.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{loan.loanProduct.name}</p>
                  <p className="text-sm text-muted-foreground">Principal {formatCurrency(Number(loan.principalAmount))} · Outstanding {formatCurrency(Number(loan.outstandingPrincipal))}</p>
                </div>
                <TrendPill tone={loan.status === "active" || loan.status === "disbursed" ? "positive" : "neutral"}>{loan.status}</TrendPill>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{loan.termMonths} months · servicing {formatCurrency(Number(loan.estimatedMonthlyServicing))} · extra savings {formatCurrency(Number(loan.extraMonthlySavingsAmount))}</p>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {loan.repaymentScheduleItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                    <p className="font-medium text-foreground">Installment {item.installmentNumber}</p>
                    <p className="mt-1 text-muted-foreground">Due {item.dueAt.toISOString().slice(0, 10)}</p>
                    <p className="mt-1 text-muted-foreground">{formatCurrency(Number(item.amountPaid))} / {formatCurrency(Number(item.totalDue))}</p>
                    <p className="mt-1"><TrendPill tone={item.status === "paid" ? "positive" : item.status === "overdue" ? "warning" : "neutral"}>{item.status}</TrendPill></p>
                  </div>
                ))}
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No loan records yet.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
