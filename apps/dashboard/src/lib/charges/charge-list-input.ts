// Shared by the route prefetch and the client hooks so both use one query key.

/** Charge types are a short registry: always the full, unfiltered list. */
export const chargeTypesInput = {}

export function getChargeActivityInput(q: string | null | undefined) {
  const search = q?.trim()

  return search ? { q: search } : {}
}
