import {
  appLinksJsonResponse,
  buildAndroidAssetLinks,
} from "@/lib/app-links/app-links"

// Prerendered at build time from env; Google's verifier fetches it.
export const dynamic = "force-static"

export function GET() {
  return appLinksJsonResponse(buildAndroidAssetLinks(process.env))
}
