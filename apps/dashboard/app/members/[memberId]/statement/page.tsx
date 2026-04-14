import { createDbRuntime, getMemberStatementDetail } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function MemberStatementPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    notFound()
  }

  const detail = await getMemberStatementDetail(context.tenant.id, memberId)

  if (!detail) {
    notFound()
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Member statement</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{detail.member.fullName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.member.memberNumber} · {detail.member.memberType.replace(/_/g, " ")} · {detail.member.status}
          </p>
        </div>
        <div className="flex gap-3">
          <Link className="text-sm underline-offset-4 hover:underline" href={`/members/${detail.member.id}`}>
            Back to member view
          </Link>
          <span className="text-sm text-muted-foreground">Use your browser print action for a hard copy.</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-border/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Commitment</p>
          <p className="mt-3 text-2xl font-semibold">{formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}</p>
        </article>
        <article className="rounded-3xl border border-border/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Savings</p>
          <p className="mt-3 text-2xl font-semibold">{formatCurrency(detail.summary?.totalSavingsSnapshot ?? 0)}</p>
        </article>
        <article className="rounded-3xl border border-border/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Outstanding loans</p>
          <p className="mt-3 text-2xl font-semibold">{formatCurrency(detail.summary?.totalOutstandingPrincipal ?? 0)}</p>
        </article>
        <article className="rounded-3xl border border-border/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Repayments</p>
          <p className="mt-3 text-2xl font-semibold">{formatCurrency(detail.summary?.totalRepaymentsPosted ?? 0)}</p>
        </article>
      </div>

      <div className="rounded-3xl border border-border/70 p-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Ledger timeline</h2>
        <div className="mt-4 space-y-3">
          {detail.ledgerTransactions.slice(0, 20).map((transaction) => (
            <div key={transaction.id} className="rounded-2xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{transaction.narration ?? transaction.transactionType}</p>
                  <p className="text-sm text-muted-foreground">{transaction.postedAt.toISOString().slice(0, 10)}</p>
                </div>
                <p className="text-sm capitalize text-muted-foreground">{transaction.transactionType}</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {transaction.entries.map((entry) => (
                  <div key={entry.id} className="text-sm text-muted-foreground">
                    {entry.ledgerAccount.name} · {entry.direction} · {formatCurrency(Number(entry.amount))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
