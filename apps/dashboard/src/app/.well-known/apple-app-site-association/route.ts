import {
  appLinksJsonResponse,
  buildAppleAppSiteAssociation,
} from "@/lib/app-links/app-links"

// Prerendered at build time from env; Apple's CDN fetches it, no request work.
export const dynamic = "force-static"

export function GET() {
  return appLinksJsonResponse(buildAppleAppSiteAssociation(process.env))
}
