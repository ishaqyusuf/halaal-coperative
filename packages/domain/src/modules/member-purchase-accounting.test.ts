import { describe, expect, test } from "bun:test"

import {
  buildMemberPurchaseRelease,
  earnedMarkupForRepayment,
  memberPurchasePostingKeys,
  memberPurchaseReleaseLines,
  memberPurchaseRepaymentLines,
} from "./member-purchase-accounting"

const sum = (lines: { amount: number; direction: string }[], side: string) =>
  lines
    .filter((line) => line.direction === side)
    .reduce((total, line) => total + line.amount, 0)

describe("member purchase release", () => {
  test("member owes cost plus markup; cash down by cost; markup unearned", () => {
    const release = buildMemberPurchaseRelease({
      cost: 100_000,
      markup: 12_000,
    })
    expect(release).toEqual({
      cost: 100_000,
      markup: 12_000,
      receivable: 112_000,
    })

    const lines = memberPurchaseReleaseLines(release)
    expect(lines).toEqual([
      { accountCode: "1200", amount: 112_000, direction: "debit" },
      { accountCode: "2000", amount: 100_000, direction: "credit" },
      { accountCode: "2200", amount: 12_000, direction: "credit" },
    ])
    expect(sum(lines, "debit")).toBe(sum(lines, "credit"))
  })

  test("no markup leaves out the unearned line", () => {
    const lines = memberPurchaseReleaseLines(
      buildMemberPurchaseRelease({ cost: 5_000, markup: 0 })
    )
    expect(lines.map((line) => line.accountCode)).toEqual(["1200", "2000"])
  })

  test("rejects a zero cost or a negative markup", () => {
    expect(() => buildMemberPurchaseRelease({ cost: 0, markup: 10 })).toThrow()
    expect(() => buildMemberPurchaseRelease({ cost: 10, markup: -1 })).toThrow()
  })
})

describe("earning markup as the member repays", () => {
  const owed = { markup: 12_000, receivable: 112_000 }

  test("partial repayment earns its share of markup", () => {
    expect(
      earnedMarkupForRepayment({ ...owed, amount: 28_000, paidBefore: 0 })
    ).toBe(3_000)
  })

  test("full repayment earns exactly all of the markup", () => {
    const payments = [37_333.33, 37_333.33, 37_333.34]
    let paid = 0
    let earned = 0
    for (const amount of payments) {
      earned += earnedMarkupForRepayment({ ...owed, amount, paidBefore: paid })
      paid += amount
    }
    expect(Math.round(earned * 100)).toBe(1_200_000)
  })

  test("odd amounts never drift: kobo-level earnings add up to the markup", () => {
    const markup = 1_000
    const receivable = 7_777.77
    let paid = 0
    let earnedKobo = 0
    for (let i = 0; i < 9; i++) {
      const amount = i < 8 ? 864.19 : Number((receivable - paid).toFixed(2))
      earnedKobo += Math.round(
        earnedMarkupForRepayment({
          amount,
          markup,
          paidBefore: paid,
          receivable,
        }) * 100
      )
      paid = Number((paid + amount).toFixed(2))
    }
    expect(earnedKobo).toBe(100_000)
  })

  test("a repayment over what is left is refused", () => {
    expect(() =>
      earnedMarkupForRepayment({ ...owed, amount: 2, paidBefore: 111_999 })
    ).toThrow()
  })

  test("repayment lines balance and move earned markup", () => {
    const lines = memberPurchaseRepaymentLines({
      amount: 28_000,
      earnedMarkup: 3_000,
    })
    expect(lines).toEqual([
      { accountCode: "2000", amount: 28_000, direction: "debit" },
      { accountCode: "1200", amount: 28_000, direction: "credit" },
      { accountCode: "2200", amount: 3_000, direction: "debit" },
      { accountCode: "3300", amount: 3_000, direction: "credit" },
    ])
    expect(sum(lines, "debit")).toBe(sum(lines, "credit"))
  })

  test("posting keys are unique per release and per allocation", () => {
    expect(memberPurchasePostingKeys.release("procurement", "a")).not.toBe(
      memberPurchasePostingKeys.release("food_purchase", "a")
    )
    expect(memberPurchasePostingKeys.repayment("x")).toBe(
      "member-purchase-repayment:x"
    )
  })
})
