import { finalizeDashboardEvidenceUpload } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import { verifyPrivateUpload } from "@/lib/uploads/private-blob-storage"
import { verifyPrivateUploadIntent } from "@/lib/uploads/private-upload-intent"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import { isPrivateDashboardUploadEnabled } from "@/lib/uploads/upload-policy"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const context = await getDashboardServerContext()
  if (!hasActiveUploadMembership(context) || !context.tenant || !context.auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  if (!isPrivateDashboardUploadEnabled()) return NextResponse.json({ error: "Private uploads are disabled." }, { status: 503 })
  let input: { intent?: unknown }
  try { input = await request.json() } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }) }
  if (!input || typeof input !== "object" || typeof input.intent !== "string") {
    return NextResponse.json({ error: "Invalid upload details." }, { status: 400 })
  }
  try {
    const intent = verifyPrivateUploadIntent(input.intent, context.tenant.id, context.auth.user.id)
    const blob = await verifyPrivateUpload(context.tenant.id, intent.id)
    const finalized = await finalizeDashboardEvidenceUpload({
      id: intent.id, tenantId: context.tenant.id, uploaderUserId: context.auth.user.id,
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
