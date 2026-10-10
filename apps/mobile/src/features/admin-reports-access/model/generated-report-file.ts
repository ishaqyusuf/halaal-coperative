export type GeneratedReportFileStatus =
  | "cancelled"
  | "expired"
  | "failed"
  | "pending"
  | "ready"

export type GeneratedReportFile = {
  error: string | null
  expiresAt: string | null
  filterSnapshot: {
    fromDate: string | null
    toDate: string | null
  } | null
  filename: string | null
  generatedAt: string
  id: string
  mimeType: "text/csv" | null
  reportKey: string
  reportTitle: string
  rowCount: number | null
  status: GeneratedReportFileStatus
  uri: string | null
}

export function createPendingReportFile(input: {
  filterSnapshot?: GeneratedReportFile["filterSnapshot"]
  id: string
  reportKey: string
  reportTitle: string
}): GeneratedReportFile {
  return {
    error: null,
    expiresAt: null,
    filterSnapshot: input.filterSnapshot ?? null,
    filename: null,
    generatedAt: new Date().toISOString(),
    id: input.id,
    mimeType: null,
    reportKey: input.reportKey,
    reportTitle: input.reportTitle,
    rowCount: null,
    status: "pending",
    uri: null,
  }
}

export function completeReportFile(
  current: GeneratedReportFile,
  input: {
    expiresAt: string
    filename: string
    generatedAt: string
    mimeType: "text/csv"
    rowCount: number
    uri: string
  },
): GeneratedReportFile {
  return {
    ...current,
    error: null,
    expiresAt: input.expiresAt,
    filename: input.filename,
    generatedAt: input.generatedAt,
    mimeType: input.mimeType,
    rowCount: input.rowCount,
    status: "ready",
    uri: input.uri,
  }
}

export function failReportFile(
  current: GeneratedReportFile,
  error: string,
): GeneratedReportFile {
  return { ...current, error, status: "failed" }
}

export function cancelReportFile(current: GeneratedReportFile) {
  return { ...current, error: null, status: "cancelled" as const }
}

export function expireGeneratedReportFile(
  current: GeneratedReportFile,
  now = Date.now(),
) {
  if (
    current.status !== "ready" ||
    !current.expiresAt ||
    new Date(current.expiresAt).getTime() > now
  ) {
    return current
  }
  return { ...current, status: "expired" as const, uri: null }
}
