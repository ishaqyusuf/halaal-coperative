import { isMobileUploadRequest, getMobileReceiptUploadActor, mobileReceiptUploadPurpose } from "@/lib/uploads/mobile-receipt-upload"
import { finalizeDashboardEvidenceUpload } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import { verifyPrivateUpload } from "@/lib/uploads/private-blob-storage"
import { verifyPrivateUploadIntent } from "@/lib/uploads/private-upload-intent"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import { isPrivateDashboardUploadEnabled } from "@/lib/uploads/upload-policy"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const mobile = isMobileUploadRequest(request)
  const context = mobile ? null : await getDashboardServerContext()
  const actor = mobile
    ? await getMobileReceiptUploadActor(request)
    : context && hasActiveUploadMembership(context) && context.tenant && context.auth.user
      ? { tenantId: context.tenant.id, userId: context.auth.user.id }
      : null
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  if (!isPrivateDashboardUploadEnabled()) return NextResponse.json({ error: "Private uploads are disabled." }, { status: 503 })
  let input: { intent?: unknown }
  try { input = await request.json() } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }) }
  if (!input || typeof input !== "object" || typeof input.intent !== "string") {
    return NextResponse.json({ error: "Invalid upload details." }, { status: 400 })
  }
  try {
    const intent = verifyPrivateUploadIntent(input.intent, actor.tenantId, actor.userId)
    if (mobile && intent.purpose !== mobileReceiptUploadPurpose) throw new Error("Invalid upload purpose.")
    const blob = await verifyPrivateUpload(actor.tenantId, intent.id, mobile ? AbortSignal.timeout(10_000) : undefined)
    const finalized = await finalizeDashboardEvidenceUpload({
      id: intent.id, tenantId: actor.tenantId, uploaderUserId: actor.userId,
      purpose: intent.purpose, contentType: blob.contentType, storedSize: blob.size,
    })
    if (!finalized) throw new Error("Upload metadata does not match the stored file.")
    const fileName = finalized.record.originalName
    const url = `/api/uploads/${intent.id}`
    return NextResponse.json({ id: intent.id, fileName, url })
  } catch {
    return NextResponse.json({ error: "Private upload could not be verified." }, { status: 400 })
  }
}
