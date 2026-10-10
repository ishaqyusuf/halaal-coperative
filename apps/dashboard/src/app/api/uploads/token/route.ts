import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { getPendingDashboardEvidenceUpload } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import { verifyPrivateUploadIntent } from "@/lib/uploads/private-upload-intent"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import { isPrivateDashboardUploadEnabled } from "@/lib/uploads/upload-policy"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!isPrivateDashboardUploadEnabled()) return NextResponse.json({ error: "Private uploads are disabled." }, { status: 503 })
  let body: HandleUploadBody
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }) }
  try {
    const response = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const context = await getDashboardServerContext()
        if (!hasActiveUploadMembership(context) || !context.tenant || !context.auth.user || !clientPayload) throw new Error("Unauthorized upload.")
        const intent = verifyPrivateUploadIntent(clientPayload, context.tenant.id, context.auth.user.id, pathname)
        const record = await getPendingDashboardEvidenceUpload({
          id: intent.id, tenantId: context.tenant.id,
          uploaderUserId: context.auth.user.id, purpose: intent.purpose,
        })
        if (!record) throw new Error("Upload intent is no longer active.")
        return {
          allowedContentTypes: [record.contentType],
          maximumSizeInBytes: record.declaredSize,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 5 * 60 * 1000,
          tokenPayload: JSON.stringify({ id: intent.id, tenantId: context.tenant.id, purpose: intent.purpose }),
        }
      },
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: "Upload authorization failed." }, { status: 403 })
  }
}
