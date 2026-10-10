import { randomUUID } from "node:crypto"
import { createDashboardEvidenceUpload } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import { privateUploadPath, sanitizeUploadName } from "@/lib/uploads/private-blob-storage"
import { createPrivateUploadIntent } from "@/lib/uploads/private-upload-intent"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import { MAX_DASHBOARD_UPLOAD_BYTES, isDashboardUploadStorageUnavailable, isPrivateDashboardUploadEnabled, isSupportedDashboardUploadContentType, isSupportedDashboardUploadPurpose } from "@/lib/uploads/upload-policy"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const context = await getDashboardServerContext()
  if (!hasActiveUploadMembership(context) || !context.tenant || !context.auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  if (!isDashboardUploadStorageUnavailable()) return NextResponse.json({ mode: "local" })
  if (!isPrivateDashboardUploadEnabled()) return NextResponse.json({ error: "Private uploads are not configured for this environment." }, { status: 503 })

  let input: { purpose?: unknown; contentType?: unknown; size?: unknown; fileName?: unknown }
  try { input = await request.json() } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }) }
  if (!input || typeof input !== "object" || typeof input.purpose !== "string" || !isSupportedDashboardUploadPurpose(input.purpose) ||
      typeof input.contentType !== "string" || !isSupportedDashboardUploadContentType(input.contentType) ||
      typeof input.fileName !== "string" || !input.fileName.trim() || input.fileName.length > 255 ||
      typeof input.size !== "number" || !Number.isSafeInteger(input.size) || input.size <= 0 || input.size > MAX_DASHBOARD_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Upload type, purpose, or size is invalid." }, { status: 400 })
  }
  const id = randomUUID()
  try {
    await createDashboardEvidenceUpload({
      id, tenantId: context.tenant.id, uploaderUserId: context.auth.user.id,
      purpose: input.purpose, originalName: sanitizeUploadName(input.fileName),
      contentType: input.contentType, declaredSize: input.size,
    })
  } catch {
    return NextResponse.json({ error: "Private upload records are unavailable." }, { status: 503 })
  }
  return NextResponse.json({
    mode: "private_blob", id, pathname: privateUploadPath(context.tenant.id, id),
    // The provider token is valid for five minutes; finalization also needs
    // time for a slow 10 MiB transfer after that token has been issued.
    intent: createPrivateUploadIntent({ id, tenantId: context.tenant.id, userId: context.auth.user.id, purpose: input.purpose, expiresAt: Date.now() + 30 * 60 * 1000 }),
  })
}
