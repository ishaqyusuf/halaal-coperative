/**
 * Whether the dashboard's private evidence upload can take a receipt proof in
 * this environment. Mirrors `apps/dashboard/src/lib/uploads/upload-policy.ts`:
 * local development uses the filesystem adapter; deployed environments need
 * the private Blob store switched on (see
 * .brain/runbooks/private-upload-storage-readiness.md).
 */
export function receiptProofUploadsAvailable(env: Record<string, string | undefined> = process.env) {
  const deployed = env.NODE_ENV === "production" || env.VERCEL === "1" || Boolean(env.VERCEL_ENV)
  if (!deployed) return true
  return (
    env.DASHBOARD_PRIVATE_BLOB_ENABLED === "1" &&
    Boolean(env.BLOB_READ_WRITE_TOKEN) &&
    (env.DASHBOARD_UPLOAD_SIGNING_SECRET?.length ?? 0) >= 32
  )
}

const uploadPath = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The `/api/uploads/<id>` URL the receipt writer claims, or null. */
export function receiptProofUrl(evidenceUploadId: string | null | undefined) {
  return evidenceUploadId && uploadPath.test(evidenceUploadId) ? `/api/uploads/${evidenceUploadId}` : null
}
