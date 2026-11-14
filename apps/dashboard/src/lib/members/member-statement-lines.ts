/**
 * Turns a member's ledger transactions into plain statement lines.
 *
 * Each line says what happened to the member's own balances, read from the
 * member-facing accounts of the standard chart (`packages/db` ledger.ts):
 * 1000 Member Savings, 3200 Member Share Capital and 1100 Loan Receivable.
 * A fee paid in cash touches none of them, so it shows as "Paid".
 */

export type StatementMoveKind =
  | "loan_given"
  | "loan_repaid"
  | "paid"
  | "savings_in"
  | "savings_out"
  | "shares_in"
  | "shares_out"

export type StatementMove = {
  amount: number
  kind: StatementMoveKind
}

export type StatementLine = {
  date: Date
  description: string
  id: string
  moves: StatementMove[]
}

type AmountLike = number | string | { toString(): string }

export type StatementLedgerTransaction = {
  entries: Array<{
    amount: AmountLike
    direction: "credit" | "debit"
    ledgerAccount: { code: string }
  }>
  id: string
  narration: string | null
  postedAt: Date | string
  transactionType: string
}

const SAVINGS = "1000"
const LOAN = "1100"
const CASH = "2000"
const SHARES = "3200"

export const statementMoveLabels: Record<StatementMoveKind, string> = {
  loan_given: "Loan given",
  loan_repaid: "Loan repaid",
  paid: "Paid",
  savings_in: "Added to savings",
  savings_out: "Taken from savings",
  shares_in: "Added to shares",
  shares_out: "Taken from shares",
}

/** Moves that add to what the member has (shown as money in). */
export function isMoneyIn(kind: StatementMoveKind) {
  return kind === "savings_in" || kind === "shares_in" || kind === "loan_repaid"
}

const typeLabels: Record<string, string> = {
  adjustment: "Adjustment",
  charge: "Fee",
  contribution: "Monthly savings",
  dividend: "Profit share",
  levy: "Levy",
  loan_disbursement: "Loan paid out",
  loan_repayment: "Loan repayment",
}

export function describeStatementTransaction(
  narration: string | null,
  transactionType: string
) {
  const cleaned = (narration ?? "")
    .replace(/\s+assessed$/i, "")
    .replace(/^Brought-forward opening/i, "Opening")
    .replace(/^Backfill\s+/i, "")
    .replace(/\s+receivable\b/i, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) {
    return typeLabels[transactionType] ?? "Other"
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function sumEntries(
  entries: StatementLedgerTransaction["entries"],
  code: string,
  direction: "credit" | "debit"
) {
  return entries
    .filter(
      (entry) =>
        entry.ledgerAccount.code === code && entry.direction === direction
    )
    .reduce((total, entry) => total + Number(entry.amount.toString()), 0)
}

export function getStatementMoves(
  entries: StatementLedgerTransaction["entries"]
): StatementMove[] {
  const candidates: StatementMove[] = [
    { amount: sumEntries(entries, SAVINGS, "credit"), kind: "savings_in" },
    { amount: sumEntries(entries, SAVINGS, "debit"), kind: "savings_out" },
    { amount: sumEntries(entries, SHARES, "credit"), kind: "shares_in" },
    { amount: sumEntries(entries, SHARES, "debit"), kind: "shares_out" },
    { amount: sumEntries(entries, LOAN, "debit"), kind: "loan_given" },
    { amount: sumEntries(entries, LOAN, "credit"), kind: "loan_repaid" },
  ]
  const moves = candidates.filter((move) => move.amount > 0)

  if (moves.length) {
    return moves
  }

  const paid = sumEntries(entries, CASH, "debit")

  return paid > 0 ? [{ amount: paid, kind: "paid" }] : []
}

export function buildMemberStatementLines(
  transactions: StatementLedgerTransaction[]
): StatementLine[] {
  return transactions
    .map((transaction) => ({
      date: new Date(transaction.postedAt),
      description: describeStatementTransaction(
        transaction.narration,
        transaction.transactionType
      ),
      id: transaction.id,
      moves: getStatementMoves(transaction.entries),
    }))
    .filter((line) => line.moves.length > 0)
}
