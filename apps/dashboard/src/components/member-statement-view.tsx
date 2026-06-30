import Link from "next/link"
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
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  TrendPill,
} from "@/components/dashboard"
import { loadMemberDetailPageData } from "@/lib/members"

type MemberDetailPageData = Extract<
  Awaited<ReturnType<typeof loadMemberDetailPageData>>,
  { state: "ready" }
>

function formatIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

export function MemberStatementView({ detail }: MemberDetailPageData) {
  return (
    <section className="mx-auto max-w-6xl space-y-6 px-6 py-10 print:px-0">
      <div className="rounded-[28px] border border-border/70 bg-card px-6 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Member statement
            </p>
            <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.04em] text-foreground">
              {detail.member.fullName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {detail.member.memberNumber} · {detail.member.memberType.replace(/_/g, " ")} ·{" "}
              {detail.member.status}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Link
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              href={`/members/${detail.member.id}`}
            >
              Back to member view
            </Link>
            <span className="text-sm text-muted-foreground">
              Use your browser print action for a hard copy.
            </span>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          label="Commitment"
          value={formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}
        />
        <DashboardStatCard
          label="Savings"
          value={formatCurrency(detail.summary?.totalSavingsSnapshot ?? 0)}
        />
        <DashboardStatCard
          label="Outstanding loans"
          value={formatCurrency(detail.summary?.totalOutstandingPrincipal ?? 0)}
        />
        <DashboardStatCard
          label="Repayments"
          value={formatCurrency(detail.summary?.totalRepaymentsPosted ?? 0)}
        />
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
    </section>
  )
}
