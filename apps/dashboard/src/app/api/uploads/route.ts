import { isMobileUploadRequest, getMobileReceiptUploadActor, mobileReceiptUploadPurpose, isMobileReceiptProofType } from "@/lib/uploads/mobile-receipt-upload"
import { createAuditLogEntry, createDashboardEvidenceUpload, createDbRuntime, finalizeDashboardEvidenceUpload, getMemberReceiptSubmissionAccess } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasActiveUploadMembership } from "@/lib/uploads/upload-access"
import {
  isDashboardUploadStorageUnavailable,
  MAX_DASHBOARD_UPLOAD_BYTES,
  isSupportedDashboardUploadPurpose,
} from "@/lib/uploads/upload-policy"

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


  if (isDashboardUploadStorageUnavailable()) {
    return NextResponse.json(
      { error: "File uploads are unavailable until persistent storage is configured." },
      { status: 503 }
    )
  }

  if (mobile && Number(request.headers.get("content-length")) > MAX_DASHBOARD_UPLOAD_BYTES + 16384) {
    return NextResponse.json({ error: "Upload is too large." }, { status: 413 })
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid upload form." }, { status: 400 })
  }

  const file = formData.get("file")
  const purpose = String(formData.get("purpose") ?? "")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload file is required." }, { status: 400 })
  }

  if (!isSupportedDashboardUploadPurpose(purpose)) {
    return NextResponse.json({ error: "Upload purpose is invalid." }, { status: 400 })
  }

  if (mobile && (purpose !== mobileReceiptUploadPurpose || !isMobileReceiptProofType(file.type))) {
    return NextResponse.json({ error: "Select a JPG, PNG or PDF." }, { status: 400 })
  }

  if (
    purpose === mobileReceiptUploadPurpose &&
    context?.auth.membership?.role === "member" &&
    !(await getMemberReceiptSubmissionAccess(actor))
  ) {
    return NextResponse.json({ error: "Receipt submission is unavailable for this membership." }, { status: 403 })
  }

  // Native multipart uploads use the cached file's basename. The storage
  // adapter sanitizes the selected name before saving it.
  const pickedName = mobile ? formData.get("fileName") : null
  const uploadFile =
    typeof pickedName === "string" && pickedName.trim() && pickedName.length <= 160
      ? new File([file], pickedName, { type: file.type })
      : file

  try {
    const { saveDashboardUpload } = await import("@/lib/uploads/local-upload-storage")
    const upload = await saveDashboardUpload({
      file: uploadFile,
      purpose,
      tenantId: actor.tenantId,
      userId: actor.userId,
    })

    if (purpose === mobileReceiptUploadPurpose) {
      await createDashboardEvidenceUpload({
        id: upload.id, tenantId: actor.tenantId, uploaderUserId: actor.userId, purpose,
        originalName: upload.originalName, contentType: upload.contentType, declaredSize: upload.size,
      })
      const finalized = await finalizeDashboardEvidenceUpload({
        id: upload.id, tenantId: actor.tenantId, uploaderUserId: actor.userId,
        purpose, contentType: upload.contentType, storedSize: upload.size,
      })
      if (!finalized) throw new Error("Upload could not be verified.")
    }

    if (!mobile && createDbRuntime().status === "database-configured") {
      await createAuditLogEntry({
        action: "file.uploaded",
        actorType: "user",
        actorUserId: actor.userId,
        entityId: upload.id,
        entityType: "DashboardUpload",
        metadata: {
          contentType: upload.contentType,
          fileName: upload.originalName,
          purpose,
          size: upload.size,
          url: upload.url,
        },
        tenantId: actor.tenantId,
      })
    }

    return NextResponse.json({
      fileName: upload.originalName,
      id: upload.id,
      url: upload.url,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save upload.",
      },
      { status: 400 }
    )
  }
}
