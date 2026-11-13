/**
 * Loan product rules shared by financing settings, loan intake and go-live.
 * Kept free of query imports so every financing module can use it without an
 * import cycle.
 */

/**
 * Applying a brought-forward opening position converts a member's active
 * financing into a loan under this product (`opening-balances.ts`). The name
 * is unique per tenant, so it identifies the product without a schema flag.
 * It exists only for migrated opening loans and is never offered for new
 * requests or shown as the cooperative's Quick/Normal product.
 */
export const BROUGHT_FORWARD_LOAN_PRODUCT_NAME =
  "Brought-forward opening financing"

export function isBroughtForwardLoanProduct(product: {
  name: string | null | undefined
}) {
  return product.name === BROUGHT_FORWARD_LOAN_PRODUCT_NAME
}

/** Prisma `where` fragment that leaves out the brought-forward product. */
export const excludeBroughtForwardLoanProductWhere = {
  NOT: { name: BROUGHT_FORWARD_LOAN_PRODUCT_NAME },
} as const

/** Names go-live gives the default products it creates. */
export const DEFAULT_LOAN_PRODUCT_NAMES = {
  normal: "Normal financing",
  quick: "Quick financing",
} as const
