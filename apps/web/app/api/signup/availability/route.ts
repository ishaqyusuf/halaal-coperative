import { NextResponse } from "next/server"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import { normalizeWorkspaceSlug } from "@/lib/signup-flow"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const cooperativeName = url.searchParams.get("cooperativeName")
  const workspaceSlug = normalizeWorkspaceSlug(url.searchParams.get("workspaceSlug") ?? "")
  const availability = await checkTenantSignupAvailability({
    cooperativeName,
    workspaceSlug,
  })

  return NextResponse.json(availability)
}
