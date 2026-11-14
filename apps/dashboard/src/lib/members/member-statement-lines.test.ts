import { describe, expect, test } from "bun:test"
import {
  buildMemberStatementLines,
  describeStatementTransaction,
  isMoneyIn,
  type StatementLedgerTransaction,
} from "./member-statement-lines"

function entry(code: string, direction: "credit" | "debit", amount: number) {
  return { amount, direction, ledgerAccount: { code } }
}

function transaction(
  id: string,
  transactionType: string,
  narration: string | null,
  entries: StatementLedgerTransaction["entries"]
): StatementLedgerTransaction {
  return { entries, id, narration, postedAt: "2026-08-30", transactionType }
}

describe("member statement lines", () => {
  test("reads each balance from the member-facing accounts", () => {
    const lines = buildMemberStatementLines([
      transaction("c", "contribution", "Member savings payment for July", [
        entry("2000", "debit", 25000),
        entry("1000", "credit", 25000),
      ]),
      transaction("f", "charge", "Admin Charges assessed", [
        entry("1000", "debit", 500),
        entry("3000", "credit", 500),
      ]),
      transaction("s", "adjustment", "Brought-forward opening share capital", [
        entry("4000", "debit", 10000),
        entry("3200", "credit", 10000),
      ]),
      transaction("l", "loan_disbursement", "Loan disbursement", [
        entry("1100", "debit", 80000),
        entry("2000", "credit", 80000),
      ]),
      transaction("r", "loan_repayment", "Backfill loan repayment", [
        entry("2000", "debit", 20000),
        entry("1100", "credit", 20000),
      ]),
      transaction("p", "charge", "Membership fee separate payment received", [
        entry("2000", "debit", 2000),
        entry("3000", "credit", 2000),
      ]),
    ])

    expect(lines.map((line) => [line.id, line.moves])).toEqual([
      ["c", [{ amount: 25000, kind: "savings_in" }]],
      ["f", [{ amount: 500, kind: "savings_out" }]],
      ["s", [{ amount: 10000, kind: "shares_in" }]],
      ["l", [{ amount: 80000, kind: "loan_given" }]],
      ["r", [{ amount: 20000, kind: "loan_repaid" }]],
      ["p", [{ amount: 2000, kind: "paid" }]],
    ])
    expect(lines[1]?.description).toBe("Admin Charges")
    expect(lines[2]?.description).toBe("Opening share capital")
    expect(lines[4]?.description).toBe("Loan repayment")
  })

  test("drops transactions that move none of the member's money", () => {
    const lines = buildMemberStatementLines([
      transaction("x", "adjustment", "Internal", [
        entry("4000", "debit", 1),
        entry("3000", "credit", 1),
      ]),
    ])

    expect(lines).toEqual([])
  })

  test("uses plain words when there is no narration", () => {
    expect(describeStatementTransaction(null, "contribution")).toBe(
      "Monthly savings"
    )
    expect(
      describeStatementTransaction(
        "Brought-forward opening financing receivable",
        "adjustment"
      )
    ).toBe("Opening financing")
  })

  test("money in covers savings, shares and loan repaid", () => {
    expect(isMoneyIn("savings_in")).toBe(true)
    expect(isMoneyIn("loan_repaid")).toBe(true)
    expect(isMoneyIn("loan_given")).toBe(false)
    expect(isMoneyIn("savings_out")).toBe(false)
  })
})
