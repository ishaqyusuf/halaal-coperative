import { get, head } from "@vercel/blob"
import { MAX_DASHBOARD_UPLOAD_BYTES, isSupportedDashboardUploadContentType } from "./upload-policy"

const uploadIdPattern = /^[a-f0-9-]{36}$/

export function privateUploadPath(tenantId: string, id: string) {
  if (!uploadIdPattern.test(id) || !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error("Invalid upload identifier.")
  }
  return `dashboard-evidence/${tenantId}/${id}`
}

export function sanitizeUploadName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "upload"
}

export async function verifyPrivateUpload(tenantId: string, id: string) {
  const pathname = privateUploadPath(tenantId, id)
  const blob = await head(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
  if (blob.pathname !== pathname || blob.size <= 0 || blob.size > MAX_DASHBOARD_UPLOAD_BYTES || !isSupportedDashboardUploadContentType(blob.contentType)) {
    throw new Error("Stored upload failed validation.")
  }
  return blob
}

export async function readPrivateUpload(tenantId: string, id: string) {
  const pathname = privateUploadPath(tenantId, id)
  const result = await get(pathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, useCache: false })
  if (!result || result.statusCode !== 200 || result.blob.size <= 0 || result.blob.size > MAX_DASHBOARD_UPLOAD_BYTES || !isSupportedDashboardUploadContentType(result.blob.contentType)) {
    return null
  }
  return result
}
