import { NextResponse, type NextRequest } from "next/server"
import { sweepPrivateDashboardUploadOrphans } from "@/lib/uploads/private-blob-cleanup"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const secret = process.env.DASHBOARD_UPLOAD_CLEANUP_SECRET
  if (!secret || secret.length < 32 || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await sweepPrivateDashboardUploadOrphans())
  } catch {
    return NextResponse.json({ error: "Private upload cleanup is unavailable." }, { status: 503 })
  }
}
