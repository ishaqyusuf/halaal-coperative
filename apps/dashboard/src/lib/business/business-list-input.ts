/** The business list input, shared by the page prefetch and the client list. */
export function getBusinessesListInput(filters: {
  q?: string | null
  status?: "active" | "planned" | "completed" | "archived" | null
}) {
  const q = filters.q?.trim()

  return {
    pageSize: 25,
    ...(q ? { q } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
}
