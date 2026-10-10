export type ProjectFinancingDetailFailureKind =
  | "request_unavailable"
  | "retryable"

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null

  const candidate = error as {
    code?: string
    data?: { code?: string }
    shape?: { data?: { code?: string } }
  }

  return (
    candidate.data?.code ??
    candidate.shape?.data?.code ??
    candidate.code ??
    null
  )
}

export function getProjectFinancingDetailFailureKind(
  error: unknown
): ProjectFinancingDetailFailureKind {
  return getErrorCode(error) === "NOT_FOUND"
    ? "request_unavailable"
    : "retryable"
}
