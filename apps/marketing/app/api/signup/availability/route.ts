import { NextResponse } from "next/server"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import { getMarketingErrorResponse } from "@/lib/error-response"
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
    const response = getMarketingErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
}

export function GET(request: Request) {
  return handleSignupAvailabilityRequest(request)
}
