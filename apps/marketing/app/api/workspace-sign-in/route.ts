import { NextResponse } from "next/server"
import {
  findTenantByCooperativeCodePrefixAsync,
  findTenantBySlugAsync,
} from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import { getMarketingErrorResponse } from "@/lib/error-response"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { parseMarketingJson } from "@/lib/parse-json.server"
import { buildOnboardingWorkspaceUrls } from "@/lib/tenant-workspace-urls"
import {
  buildWorkspaceLoginUrl,
  resolveWorkspaceSignInSlug,
  WORKSPACE_NOT_FOUND_MESSAGE,
  type WorkspaceSignInLookups,
} from "@/lib/workspace-sign-in"
import {
  enforceMarketingRateLimit,
  type MarketingRateLimiter,
} from "@/lib/public-rate-limit.server"

const defaultLookups: WorkspaceSignInLookups = {
  findByPrefix: findTenantByCooperativeCodePrefixAsync,
  findBySlug: findTenantBySlugAsync,
}

export async function handleWorkspaceSignInRequest(
  request: Request,
  lookups: WorkspaceSignInLookups = defaultLookups,
  limit: MarketingRateLimiter = enforceMarketingRateLimit
) {
  try {
    const body = (await parseMarketingJson(request)) as unknown
    const workspace =
      body && typeof body === "object" && "workspace" in body
        ? (body as { workspace?: unknown }).workspace
        : null

    if (typeof workspace !== "string" || !workspace.trim()) {
      throw new AppError({
        code: "VALIDATION_FAILED",
        publicMessage: "Enter your workspace address or member code.",
      })
    }

    await limit({ headers: request.headers, operation: "workspace_sign_in" })
    const tenantSlug = await resolveWorkspaceSignInSlug(workspace, lookups)

    if (!tenantSlug) {
      const response = getMarketingErrorResponse(
        new AppError({
          code: "NOT_FOUND",
          publicMessage: WORKSPACE_NOT_FOUND_MESSAGE,
        })
      )
      return NextResponse.json(response.body, { status: response.status })
    }

    const { dashboardUrl } = buildOnboardingWorkspaceUrls({
      currentOrigin: request.url,
      tenantSlug,
    })

    return NextResponse.json({ loginUrl: buildWorkspaceLoginUrl(dashboardUrl) })
  } catch (error) {
    const response = getMarketingServerErrorResponse(error, { method: "POST" })
    return NextResponse.json(response.body, { status: response.status })
  }
}

export function POST(request: Request) {
  return handleWorkspaceSignInRequest(request)
}
