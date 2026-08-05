import { NextResponse } from "next/server"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { normalizeWorkspaceSlug } from "@/lib/signup-flow"

export async function handleSignupAvailabilityRequest(
  request: Request,
  checkAvailability: typeof checkTenantSignupAvailability = checkTenantSignupAvailability
) {
  try {
    const url = new URL(request.url)
    const cooperativeName = url.searchParams.get("cooperativeName")
    const workspaceSlug = normalizeWorkspaceSlug(
      url.searchParams.get("workspaceSlug") ?? ""
    )
    const availability = await checkAvailability({
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
