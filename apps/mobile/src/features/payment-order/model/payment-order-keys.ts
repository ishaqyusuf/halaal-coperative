import type { QueryKey } from "@tanstack/react-query"

/**
 * Reads that depend on the tenant's payment order, invalidated after a save.
 * Filled in once lane C exports the member payables key from
 * `features/receipts/public` (T30).
 */
export const paymentOrderDependentKeys: QueryKey[] = []
