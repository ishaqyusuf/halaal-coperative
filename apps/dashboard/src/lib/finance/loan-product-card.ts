import type { LoanProductSettingsRow } from "@halaalvest/db"

export type LoanProductCardState = {
  actionLabel: string
  description: string
  pill: "active" | "inactive" | "not set up"
  tone: "positive" | "warning"
}

/**
 * Card copy for a Finance settings → Loans product. A card reflects a real
 * `loan_products` row; without one it says "not set up" instead of showing
 * synthetic defaults as active (ADR-20261113).
 */
export function getLoanProductCardState(
  product: Pick<LoanProductSettingsRow, "id" | "isActive" | "loanType" | "name">
): LoanProductCardState {
  const kind = product.loanType === "quick" ? "quick" : "normal"

  if (!product.id) {
    return {
      actionLabel: `Set up ${kind} product`,
      description: `No ${kind} product yet. Members can't request ${kind} financing until you set one up.`,
      pill: "not set up",
      tone: "warning",
    }
  }

  return {
    actionLabel: `Edit ${kind} product`,
    description: product.isActive
      ? `${product.name} is offered for new ${kind} financing requests.`
      : `${product.name} is turned off, so members can't request ${kind} financing.`,
    pill: product.isActive ? "active" : "inactive",
    tone: product.isActive ? "positive" : "warning",
  }
}
