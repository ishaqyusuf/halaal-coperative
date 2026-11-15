import { NextResponse } from "next/server"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { normalizeWorkspaceSlug } from "@/lib/signup-flow"
import {
  enforceMarketingRateLimit,
  type MarketingRateLimiter,
} from "@/lib/public-rate-limit.server"

export async function handleSignupAvailabilityRequest(
  request: Request,
  checkAvailability: typeof checkTenantSignupAvailability = checkTenantSignupAvailability,
  limit: MarketingRateLimiter = enforceMarketingRateLimit
) {
  try {
    await limit({ headers: request.headers, operation: "signup_availability" })
    const url = new URL(request.url)
    const cooperativeCodePrefix = url.searchParams.get("cooperativeCodePrefix")
    const cooperativeName = url.searchParams.get("cooperativeName")
    const workspaceSlug = normalizeWorkspaceSlug(
      url.searchParams.get("workspaceSlug") ?? ""
    )
    const availability = await checkAvailability({
      cooperativeCodePrefix,
      cooperativeName,
      workspaceSlug,
    })

    return NextResponse.json(availability)
  } catch (error) {
    const response = getMarketingServerErrorResponse(error, { method: "GET" })
    return NextResponse.json(response.body, { status: response.status })
  }
}

export function GET(request: Request) {
  return handleSignupAvailabilityRequest(request)
}
