/**
 * Accounting for goods the cooperative buys on a member's behalf
 * (Procurement and Foodstuff Purchase), ADR-20261116.
 *
 * When goods are released the member owes cost + markup, cash goes down by
 * the cost and the markup waits as profit not yet earned. Each repayment
 * moves the matching share of markup to earned profit, in proportion to what
 * has been paid. Amounts are naira with kobo; maths runs in whole kobo so the
 * last repayment always earns exactly what is left.
 */

/** Standard chart codes owned by this flow (additive to the base chart). */
export const memberPurchaseAccountCodes = {
  cash: "2000",
  earnedProfit: "3300",
  receivable: "1200",
  unearnedProfit: "2200",
} as const

export type MemberPurchaseSource = "procurement" | "food_purchase"

function toKobo(amount: number) {
  return Math.round(amount * 100)
}

function fromKobo(kobo: number) {
  return kobo / 100
}

export type MemberPurchaseRelease = {
  /** What the cooperative paid for the goods. */
  cost: number
  /** The cooperative's added profit. */
  markup: number
  /** What the member owes: cost + markup. */
  receivable: number
}

/** Splits a release into what the member owes, the cash out and the markup. */
export function buildMemberPurchaseRelease(input: {
  cost: number
  markup: number
}): MemberPurchaseRelease {
  const costKobo = toKobo(input.cost)
  const markupKobo = toKobo(input.markup)

  if (!Number.isFinite(input.cost) || costKobo <= 0) {
    throw new RangeError("Goods cost must be more than zero.")
  }
  if (!Number.isFinite(input.markup) || markupKobo < 0) {
    throw new RangeError("Added profit cannot be negative.")
  }

  return {
    cost: fromKobo(costKobo),
    markup: fromKobo(markupKobo),
    receivable: fromKobo(costKobo + markupKobo),
  }
}

/**
 * Markup earned by one repayment. Earned-to-date is markup × paid ÷ owed,
 * rounded to the kobo; this repayment earns the difference between the
 * figure after it and the figure before it, so rounding never drifts and a
 * full repayment earns the whole markup.
 */
export function earnedMarkupForRepayment(input: {
  markup: number
  /** Total the member owes (cost + markup). */
  receivable: number
  /** Repaid before this repayment. */
  paidBefore: number
  /** This repayment. */
  amount: number
}) {
  const receivableKobo = toKobo(input.receivable)
  const markupKobo = toKobo(input.markup)
  const paidBeforeKobo = toKobo(input.paidBefore)
  const amountKobo = toKobo(input.amount)

  if (receivableKobo <= 0) {
    throw new RangeError("Nothing is owed on this purchase.")
  }
  if (markupKobo < 0 || markupKobo > receivableKobo) {
    throw new RangeError(
      "Added profit must be between zero and the amount owed."
    )
  }
  if (amountKobo <= 0) {
    throw new RangeError("Repayment must be more than zero.")
  }
  if (paidBeforeKobo < 0 || paidBeforeKobo + amountKobo > receivableKobo) {
    throw new RangeError("Repayment is more than what is left to pay.")
  }

  const earnedTo = (paidKobo: number) =>
    paidKobo >= receivableKobo
      ? markupKobo
      : Math.round((markupKobo * paidKobo) / receivableKobo)

  return fromKobo(
    earnedTo(paidBeforeKobo + amountKobo) - earnedTo(paidBeforeKobo)
  )
}

export type LedgerLine = {
  accountCode: string
  amount: number
  direction: "credit" | "debit"
}

/** Release: Dr receivable (cost + markup) / Cr cash (cost) / Cr unearned (markup). */
export function memberPurchaseReleaseLines(
  release: MemberPurchaseRelease
): LedgerLine[] {
  const codes = memberPurchaseAccountCodes
  return [
    {
      accountCode: codes.receivable,
      amount: release.receivable,
      direction: "debit" as const,
    },
    {
      accountCode: codes.cash,
      amount: release.cost,
      direction: "credit" as const,
    },
    {
      accountCode: codes.unearnedProfit,
      amount: release.markup,
      direction: "credit" as const,
    },
  ].filter((line) => line.amount > 0)
}

/**
 * Repayment: Dr cash / Cr receivable for the amount, then Dr unearned /
 * Cr earned profit for the markup this repayment earns.
 */
export function memberPurchaseRepaymentLines(input: {
  amount: number
  earnedMarkup: number
}): LedgerLine[] {
  const codes = memberPurchaseAccountCodes
  const lines: LedgerLine[] = [
    { accountCode: codes.cash, amount: input.amount, direction: "debit" },
    {
      accountCode: codes.receivable,
      amount: input.amount,
      direction: "credit",
    },
  ]
  if (input.earnedMarkup > 0) {
    lines.push(
      {
        accountCode: codes.unearnedProfit,
        amount: input.earnedMarkup,
        direction: "debit",
      },
      {
        accountCode: codes.earnedProfit,
        amount: input.earnedMarkup,
        direction: "credit",
      }
    )
  }
  return lines
}

/** Unique posting keys: each release and each repayment allocation posts once. */
export const memberPurchasePostingKeys = {
  release: (source: MemberPurchaseSource, id: string) =>
    `member-purchase-release:${source}:${id}`,
  repayment: (allocationId: string) =>
    `member-purchase-repayment:${allocationId}`,
  /** Repayments made before the receivable existed, posted with the release. */
  priorRepayments: (source: MemberPurchaseSource, id: string) =>
    `member-purchase-repayment:prior:${source}:${id}`,
}
