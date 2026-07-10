import { createAuditLogEntry, createDbRuntime } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  isSupportedDashboardUploadPurpose,
  saveDashboardUpload,
} from "@/lib/uploads/local-upload-storage"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const context = await getDashboardServerContext()

  if (!context.tenant || !context.auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
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

  try {
    const upload = await saveDashboardUpload({
      file,
      purpose,
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (createDbRuntime().status === "database-configured") {
      await createAuditLogEntry({
        action: "file.uploaded",
        actorType: "user",
        actorUserId: context.auth.user.id,
        entityId: upload.id,
        entityType: "DashboardUpload",
        metadata: {
          contentType: upload.contentType,
          fileName: upload.originalName,
          purpose,
          size: upload.size,
          url: upload.url,
        },
        tenantId: context.tenant.id,
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
