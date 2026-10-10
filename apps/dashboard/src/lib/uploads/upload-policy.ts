// Production uploads go directly from the browser to a private Blob store.
export const MAX_DASHBOARD_UPLOAD_BYTES = 10 * 1024 * 1024
export const DASHBOARD_UPLOAD_MAX_SIZE_LABEL = "10 MB"

export const DASHBOARD_UPLOAD_CONTENT_TYPES = [
  "application/pdf", "image/gif", "image/jpeg", "image/png", "image/webp", "text/csv", "text/plain",
] as const

export function isSupportedDashboardUploadContentType(value: string) {
  return DASHBOARD_UPLOAD_CONTENT_TYPES.includes(value as (typeof DASHBOARD_UPLOAD_CONTENT_TYPES)[number])
}

export type DashboardUploadPurpose =
  | "member_document"
  | "opening_balance_source"
  | "payment_receipt_proof"
  | "support_attachment"

export function isSupportedDashboardUploadPurpose(value: string): value is DashboardUploadPurpose {
  return ["member_document", "opening_balance_source", "payment_receipt_proof", "support_attachment"].includes(value)
}

export function isDashboardUploadStorageUnavailable() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV)
}

export function isPrivateDashboardUploadEnabled() {
  return process.env.DASHBOARD_PRIVATE_BLOB_ENABLED === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN) &&
    Boolean(process.env.DASHBOARD_UPLOAD_SIGNING_SECRET && process.env.DASHBOARD_UPLOAD_SIGNING_SECRET.length >= 32)
}
