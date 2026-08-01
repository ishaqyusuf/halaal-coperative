import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import type { MemberStatementPageData } from "@/lib/members"

type ReadyMemberStatementPageData = Extract<
  MemberStatementPageData,
  { state: "ready" }
>

type MemberStatementCharge = {
  amount: number | string | { toString(): string }
  chargeApplicability?: { workflow?: string | null } | null
  chargeDefinition: { name: string }
  collectionMode: string
  foodPurchaseApplication?: unknown
  id: string
  loanRequest?: unknown
  procurementRequest?: { itemName: string } | null
  projectFinancingRequest?: { businessName: string } | null
  status: string
}

function formatIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

function formatChargeSource(charge: MemberStatementCharge) {
  if (charge.procurementRequest) {
    return `Procurement: ${charge.procurementRequest.itemName}`
  }

  if (charge.foodPurchaseApplication) {
    return "Foodstuff Purchase"
  }

  if (charge.projectFinancingRequest) {
    return `Project financing: ${charge.projectFinancingRequest.businessName}`
  }

  if (charge.loanRequest) {
    return "Financing request"
  }

  return (
    charge.chargeApplicability?.workflow?.replace(/_/g, " ") ?? "Manual charge"
  )
}

function EmptyStatementRows({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export function MemberStatementView({ detail }: ReadyMemberStatementPageData) {
  return (
    <section className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6 sm:py-10 print:px-0">
      <div className="rounded-lg border border-border/70 bg-card px-4 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase">
              Member statement
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-[32px]">
              {detail.member.fullName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {detail.member.memberNumber} ·{" "}
              {detail.member.memberType.replace(/_/g, " ")} ·{" "}
              {detail.member.status}
            </p>
          </div>
          <div className="flex flex-col gap-2 print:hidden md:items-end">
            <div className="grid gap-2 sm:grid-cols-2">
              <DashboardActionLink
                className="h-11 w-full md:h-9 md:w-auto"
                href={`/members/${detail.member.id}`}
              >
                Back to member view
              </DashboardActionLink>
              <DashboardActionLink
                className="h-11 w-full md:h-9 md:w-auto"
                href={`/members/${detail.member.id}/statement-export`}
                variant="secondary"
              >
                Download statement
              </DashboardActionLink>
            </div>
            <span className="text-sm text-muted-foreground">
              Use your browser print action for a hard copy or PDF.
            </span>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
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
        <DashboardStatCard
          label="Published dividends"
          value={formatCurrency(detail.summary?.totalDividendAllocations ?? 0)}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill>
              {detail.dividendAllocations.length} allocations
            </TrendPill>
          }
          eyebrow="Dividends"
          headingLevel={2}
          title="Published dividend allocations"
        />
        <div className="mt-5 space-y-3">
          {detail.dividendAllocations.length ? (
            detail.dividendAllocations.slice(0, 20).map((allocation) => (
              <DashboardSurfaceCard
                as="article"
                className="rounded-lg"
                key={allocation.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {allocation.dividendPeriod.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Published{" "}
                      {formatIsoDate(allocation.dividendPeriod.publishedAt) ??
                        "not dated"}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="text-muted-foreground">
                      Basis{" "}
                      {formatCurrency(Number(allocation.savingsBasisAmount))}
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatCurrency(Number(allocation.allocationAmount))}
                    </p>
                  </div>
                </div>
              </DashboardSurfaceCard>
            ))
          ) : (
            <EmptyStatementRows label="No dividend allocations published yet." />
          )}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill>{detail.chargeApplications.length} charges</TrendPill>
          }
          eyebrow="Charges"
          headingLevel={2}
          title="Workflow and manual charges"
        />
        <div className="mt-5 space-y-3">
          {detail.chargeApplications.length ? (
            detail.chargeApplications
              .slice(0, 20)
              .map((charge: MemberStatementCharge) => (
                <DashboardSurfaceCard
                  as="article"
                  className="rounded-lg"
                  key={charge.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {charge.chargeDefinition.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatChargeSource(charge)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground capitalize">
                        {charge.status} ·{" "}
                        {charge.collectionMode.replace(/_/g, " ")}
                      </p>
                    </div>
                    <p className="font-medium text-foreground">
                      {formatCurrency(Number(charge.amount))}
                    </p>
                  </div>
                </DashboardSurfaceCard>
              ))
          ) : (
            <EmptyStatementRows label="No workflow or manual charges recorded yet." />
          )}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill>
              {detail.ledgerTransactions.length} transactions
            </TrendPill>
          }
          eyebrow="Ledger"
          headingLevel={2}
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
            <EmptyStatementRows label="No ledger transactions recorded yet." />
          )}
        </div>
      </DashboardSectionCard>
    </section>
  )
}
