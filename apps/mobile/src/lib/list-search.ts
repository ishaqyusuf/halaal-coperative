/** Floating search appears once a list has more than this many items (ADR §1). */
export const LIST_SEARCH_THRESHOLD = 10

export function shouldShowListSearch(totalCount: number) {
  return totalCount > LIST_SEARCH_THRESHOLD
}
