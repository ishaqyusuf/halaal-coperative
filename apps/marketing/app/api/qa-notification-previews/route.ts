import { NextResponse } from "next/server"
import { consumeQaPreviewFlash } from "@/lib/qa-preview-flash.server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    { previews: await consumeQaPreviewFlash() },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  )
}
