import { NextResponse } from "next/server"
import { createPrismaClient, getUploadedDashboardEvidenceUpload } from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import { hasLinkedDashboardUploadAccess } from "@/lib/uploads/linked-upload-access"
import { isDashboardUploadStorageUnavailable, isPrivateDashboardUploadEnabled } from "@/lib/uploads/upload-policy"
import { isSupportedDashboardUploadPurpose } from "@/lib/uploads/upload-policy"

import { getMobileReceiptProofReader, isMobileUploadRequest, mobileReceiptUploadPurpose } from "@/lib/uploads/mobile-receipt-upload"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const mobile = isMobileUploadRequest(request)
  const contextActor = mobile ? null : await getDashboardServerContext()
  const mobileActor = mobile ? await getMobileReceiptProofReader(request) : null
  const actor = mobileActor
    ? { ...mobileActor, role: "member" as const }
    : contextActor && hasActiveUploadMembership(contextActor) && contextActor.tenant && contextActor.auth.user
      ? { tenantId: contextActor.tenant.id, userId: contextActor.auth.user.id, role: contextActor.auth.membership!.role }
      : null
  if (!actor) return new Response("Unauthorized", { status: 403 })
  const url = `/api/uploads/${id}`
  if (mobile && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Not found", { status: 404 })
  }

  if (isDashboardUploadStorageUnavailable()) {
    if (!isPrivateDashboardUploadEnabled()) return new Response("Private uploads are disabled.", { status: 503 })
    try {
      const record = await getUploadedDashboardEvidenceUpload({ id, tenantId: actor.tenantId })
      if (!record || !isSupportedDashboardUploadPurpose(record.purpose) ||
          (mobile && record.purpose !== mobileReceiptUploadPurpose)) return new Response("Not found", { status: 404 })
      const allowed = await hasLinkedDashboardUploadAccess({
        tenantId: actor.tenantId,
        userId: actor.userId,
        role: actor.role,
        purpose: record.purpose,
        linkedEntityType: record.linkedEntityType,
        linkedEntityId: record.linkedEntityId,
        url,
      })
      if (!allowed) return new Response("Not found", { status: 404 })
      const { readPrivateUpload } = await import("@/lib/uploads/private-blob-storage")
      const upload = await readPrivateUpload(actor.tenantId, id, mobile ? AbortSignal.timeout(30_000) : undefined)
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
    if (mobile) {
      const ownReceipt = await createPrismaClient()?.memberPaymentReceipt.findFirst({
        select: { id: true },
        where: { tenantId: actor.tenantId, proofDocumentUrl: url, member: { userId: actor.userId } },
      })
      if (!ownReceipt) return new Response("Not found", { status: 404 })
    }
    const { readDashboardUpload } = await import("@/lib/uploads/local-upload-storage")
    const upload = await readDashboardUpload(id)
    if (!upload || upload.metadata.tenantId !== actor.tenantId ||
        (mobile && upload.metadata.purpose !== mobileReceiptUploadPurpose)) {
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
