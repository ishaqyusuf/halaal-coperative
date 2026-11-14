import { formatCurrency } from "@halaalvest/utils"
import { cn } from "@halaalvest/ui/lib/utils"
import { DownloadIcon } from "lucide-react"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
} from "@/components/dashboard"
import { MemberBalanceStatCards } from "@/components/member-balance-stat-cards"
import { PrintPageButton } from "@/components/print-page-button"
import type { MemberStatementPageData } from "@/lib/members"
import {
  buildMemberStatementLines,
  isMoneyIn,
  statementMoveLabels,
  type StatementLine,
} from "@/lib/members/member-statement-lines"
import { getMemberStatusLabel } from "@/lib/members/member-status-words"
import { formatDayMonthYear } from "@/utils/format"

type ReadyMemberStatementPageData = Extract<
  MemberStatementPageData,
  { state: "ready" }
>

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function MoveAmounts({ line }: { line: StatementLine }) {
  return (
    <div className="flex flex-col gap-1 sm:items-end">
      {line.moves.map((move) => (
        <p
          className="flex items-baseline justify-between gap-3"
          key={move.kind}
        >
          <span className="text-sm text-muted-foreground">
            {statementMoveLabels[move.kind]}
          </span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              isMoneyIn(move.kind)
                ? "text-emerald-800 dark:text-emerald-300"
                : "text-foreground"
            )}
          >
            {formatCurrency(move.amount)}
          </span>
        </p>
      ))}
    </div>
  )
}

function EmptyStatementRows({ label }: { label: string }) {
  return <p className="py-4 text-muted-foreground">{label}</p>
}

/**
 * Printable member statement, written for the member to read: balances,
 * then every posting in plain words, newest first.
 */
export function MemberStatementView({
  cooperativeName,
  detail,
}: ReadyMemberStatementPageData) {
  const lines = buildMemberStatementLines(detail.ledgerTransactions)
  const { member } = detail

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-6 print:max-w-none print:gap-4">
      <header className="flex flex-col gap-5 rounded-lg border border-border/70 bg-background p-4 sm:p-6 print:border-0 print:p-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {cooperativeName} · Statement
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">
              {member.fullName}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap print:hidden">
            <DashboardActionLink href={`/members/${member.id}`}>
              Back
            </DashboardActionLink>
            <PrintPageButton />
            <DashboardActionLink
              className="col-span-2"
              href={`/members/${member.id}/statement-export`}
            >
              <DownloadIcon data-icon="inline-start" />
              Download
            </DashboardActionLink>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoItem label="Member no." value={member.memberNumber} />
          <InfoItem
            label="Workplace"
            value={member.deductionSource?.name ?? "None"}
          />
          <InfoItem
            label="Joined"
            value={formatDayMonthYear(member.joinedAt) ?? ""}
          />
          <InfoItem
            label="Status"
            value={getMemberStatusLabel(member.status)}
          />
          <InfoItem
            label="Monthly savings"
            value={formatCurrency(detail.summary?.activeCommitmentAmount ?? 0)}
          />
          <InfoItem
            label="Statement date"
            value={formatDayMonthYear(new Date()) ?? ""}
          />
        </dl>
      </header>

      <MemberBalanceStatCards summary={detail.summary} />

      <DashboardSectionCard className="print:border-0 print:p-0">
        <DashboardSectionHeader headingLevel={2} title="Money in and out" />
        {lines.length ? (
          <>
            <div
              aria-hidden
              className="hidden grid-cols-[9rem_minmax(0,1fr)_minmax(16rem,auto)] gap-4 border-b border-border/70 py-3 text-sm font-medium text-muted-foreground md:grid"
            >
              <span>Date</span>
              <span>Details</span>
              <span className="text-right">Amount</span>
            </div>
            <ol>
              {lines.map((line) => (
                <li
                  className="grid break-inside-avoid gap-1 border-b border-border/70 py-3 last:border-b-0 md:grid-cols-[9rem_minmax(0,1fr)_minmax(16rem,auto)] md:items-start md:gap-4"
                  key={line.id}
                >
                  <span className="text-sm text-muted-foreground md:text-base md:text-foreground">
                    {formatDayMonthYear(line.date)}
                  </span>
                  <span className="font-medium text-foreground">
                    {line.description}
                  </span>
                  <MoveAmounts line={line} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <EmptyStatementRows label="Nothing has been posted yet." />
        )}
      </DashboardSectionCard>

      {detail.pendingCharges.length ? (
        <DashboardSectionCard className="print:border-0 print:p-0">
          <DashboardSectionHeader headingLevel={2} title="Fees still to pay" />
          <ul>
            {detail.pendingCharges.map((charge) => (
              <li
                className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0"
                key={charge.id}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {charge.chargeDefinition.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDayMonthYear(charge.assessedAt)}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(Number(charge.amount))}
                </p>
              </li>
            ))}
          </ul>
        </DashboardSectionCard>
      ) : null}

      {detail.dividendAllocations.length ? (
        <DashboardSectionCard className="print:border-0 print:p-0">
          <DashboardSectionHeader headingLevel={2} title="Profit shared" />
          <ul>
            {detail.dividendAllocations.map((allocation) => (
              <li
                className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0"
                key={allocation.id}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {allocation.dividendPeriod.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDayMonthYear(
                      allocation.dividendPeriod.publishedAt
                    ) ?? "Not dated"}
                  </p>
                </div>
                <p className="font-semibold text-emerald-800 tabular-nums dark:text-emerald-300">
                  {formatCurrency(Number(allocation.allocationAmount))}
                </p>
              </li>
            ))}
          </ul>
        </DashboardSectionCard>
      ) : null}
    </article>
  )
}
