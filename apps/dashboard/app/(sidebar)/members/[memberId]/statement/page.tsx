import Link from "next/link"
import { createDbRuntime, getMemberStatementDetail } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import { notFound } from "next/navigation"
import { DashboardDataTable, DashboardTable, DashboardTableBody, DashboardTableCell, DashboardTableHead, DashboardTableHeaderCell, DashboardTableRow, TrendPill } from "@/components/dashboard/primitives"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function MemberStatementPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") notFound()
  const detail = await getMemberStatementDetail(context.tenant.id, memberId)
  if (!detail) notFound()

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-6 py-10 print:px-0">
      <div className="rounded-[28px] border border-border/70 bg-card px-6 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Member statement</p>
            <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.04em] text-foreground">{detail.member.fullName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{detail.member.memberNumber} · {detail.member.memberType.replace(/_/g, " ")} · {detail.member.status}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Link className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href={`/members/${detail.member.id}`}>Back to member view</Link>
            <span className="text-sm text-muted-foreground">Use your browser print action for a hard copy.</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[22px] border border-border/70 bg-card p-5"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Commitment</p><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}</p></div>
        <div className="rounded-[22px] border border-border/70 bg-card p-5"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Savings</p><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{formatCurrency(detail.summary?.totalSavingsSnapshot ?? 0)}</p></div>
        <div className="rounded-[22px] border border-border/70 bg-card p-5"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Outstanding loans</p><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{formatCurrency(detail.summary?.totalOutstandingPrincipal ?? 0)}</p></div>
        <div className="rounded-[22px] border border-border/70 bg-card p-5"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Repayments</p><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{formatCurrency(detail.summary?.totalRepaymentsPosted ?? 0)}</p></div>
      </div>

      <div className="rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Ledger</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">Ledger timeline</h2>
          </div>
          <TrendPill>{detail.ledgerTransactions.length} transactions</TrendPill>
        </div>
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
      </div>
    </section>
  )
}
