import { previewApkDownload } from "@/lib/preview-apk-download"
import { createPrismaClient } from "@halaalvest/db"
import { getMobileBuild } from "@halaalvest/db/app-update"
export const dynamic = "force-dynamic"
export function GET() {
  const preview =
    process.env.HALAALVEST_ENV === "preview" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.DEPLOYMENT_ENVIRONMENT !== "production"
  return previewApkDownload(preview ? "preview" : undefined, async () => {
    const db = createPrismaClient()
    if (!db) throw new Error("Registry unavailable")
    return getMobileBuild(db)
  })
}
