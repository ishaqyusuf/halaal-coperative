import { NextResponse } from "next/server"
import { getDashboardServerContext } from "@/lib/server-context"
import { readDashboardUpload } from "@/lib/uploads/local-upload-storage"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const serverContext = await getDashboardServerContext()

  if (!serverContext.tenant || !serverContext.auth.user) {
    return new Response("Unauthorized", { status: 403 })
  }

  let upload: Awaited<ReturnType<typeof readDashboardUpload>> | null

  try {
    upload = await readDashboardUpload(id)
  } catch {
    upload = null
  }

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
}
