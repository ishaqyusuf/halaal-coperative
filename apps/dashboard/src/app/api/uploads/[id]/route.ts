import { NextResponse } from "next/server"
import { getUploadedDashboardEvidenceUpload } from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import { hasLinkedDashboardUploadAccess } from "@/lib/uploads/linked-upload-access"
import { isDashboardUploadStorageUnavailable, isPrivateDashboardUploadEnabled } from "@/lib/uploads/upload-policy"
import { isSupportedDashboardUploadPurpose } from "@/lib/uploads/upload-policy"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const serverContext = await getDashboardServerContext()

  if (!hasActiveUploadMembership(serverContext) || !serverContext.tenant || !serverContext.auth.user) {
    return new Response("Unauthorized", { status: 403 })
  }

  if (isDashboardUploadStorageUnavailable()) {
    if (!isPrivateDashboardUploadEnabled()) return new Response("Private uploads are disabled.", { status: 503 })
    try {
      const record = await getUploadedDashboardEvidenceUpload({ id, tenantId: serverContext.tenant.id })
      if (!record || !isSupportedDashboardUploadPurpose(record.purpose)) return new Response("Not found", { status: 404 })
      const allowed = await hasLinkedDashboardUploadAccess({
        tenantId: serverContext.tenant.id,
        userId: serverContext.auth.user.id,
        role: serverContext.auth.membership!.role,
        purpose: record.purpose,
        linkedEntityType: record.linkedEntityType,
        linkedEntityId: record.linkedEntityId,
        url: `/api/uploads/${id}`,
      })
      if (!allowed) return new Response("Not found", { status: 404 })
      const { readPrivateUpload } = await import("@/lib/uploads/private-blob-storage")
      const upload = await readPrivateUpload(serverContext.tenant.id, id)
      if (!upload) return new Response("Not found", { status: 404 })
      return new Response(upload.stream, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="evidence-${id}"`,
          "Content-Type": upload.blob.contentType,
          "X-Content-Type-Options": "nosniff",
        },
      })
    } catch {
      return new Response("Not found", { status: 404 })
    }
  }

  try {
    const { readDashboardUpload } = await import("@/lib/uploads/local-upload-storage")
    const upload = await readDashboardUpload(id)
    if (!upload || upload.metadata.tenantId !== serverContext.tenant.id) {
      return new Response("Not found", { status: 404 })
    }
    return new NextResponse(upload.bytes, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${upload.metadata.originalName}"`,
        "Content-Type": upload.metadata.contentType,
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
