/** Where financing intake is fixed: Finance settings → Loans. */
export const loanIntakeFixHref = "/settings/finance/loan"

export type LoanIntakeFix = { href: string; label: string }

/**
 * The link `/loans` shows beside a blocked intake reason (ADR-20261113).
 * Only finance managers get it, since only they can change products and
 * cycles; members and other staff see the reason alone.
 */
export function getLoanIntakeFix(input: {
  canManageFinance: boolean
  intakeStatus: "closed" | "missing" | "open" | "paused"
  productCount: number
}): LoanIntakeFix | null {
  if (!input.canManageFinance) return null

  if (input.productCount === 0) {
    return { href: loanIntakeFixHref, label: "Set up financing products" }
  }

  if (input.intakeStatus === "missing") {
    return { href: loanIntakeFixHref, label: "Open this month's financing" }
  }

  if (input.intakeStatus === "paused") {
    return { href: loanIntakeFixHref, label: "Resume financing" }
  }

  if (input.intakeStatus === "closed") {
    return { href: loanIntakeFixHref, label: "Review financing settings" }
  }

  return null
}
