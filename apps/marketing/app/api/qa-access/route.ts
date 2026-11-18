import { buildRequestContext } from "@halaalvest/api/context"
import { appRouter } from "@halaalvest/api/router"
import { createCallerFactory } from "@halaalvest/api/trpc"
import { NextResponse, type NextRequest } from "next/server"
import { buildOnboardingWorkspaceUrls } from "@/lib/tenant-workspace-urls"

const qaAuthorizationCookie = "halaalvest_qa_authorization"
const qaClientCookie = "halaalvest_qa_client"
const createCaller = createCallerFactory(appRouter)

function cookieOptions(request: NextRequest, expires?: Date) {
  return {
    ...(expires ? { expires } : {}),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  }
}

async function callerFor(request: NextRequest) {
  return createCaller(await buildRequestContext(request.headers))
}

type QaCooperative = { loginUrl: string; name: string; slug: string }

/** The authorized QA Domain and its cooperatives, one entry per cooperative. */
async function getAuthorizedAccess(request: NextRequest) {
  const authorizationToken = request.cookies.get(qaAuthorizationCookie)?.value
  const clientId = request.cookies.get(qaClientCookie)?.value
  if (!authorizationToken || !clientId) return null
  const result = await (
    await callerFor(request)
  ).qaAccelerator.profiles({
    authorizationToken,
    clientId,
    clientKind: "web",
    contractVersion: 1,
  })
  const cooperatives = new Map<string, QaCooperative>()
  for (const profile of result.profiles) {
    if (cooperatives.has(profile.cooperativeSlug)) continue
    const { dashboardUrl } = buildOnboardingWorkspaceUrls({
      currentOrigin: request.nextUrl.origin,
      tenantSlug: profile.cooperativeSlug,
    })
    cooperatives.set(profile.cooperativeSlug, {
      loginUrl: new URL("/login", dashboardUrl).toString(),
      name: profile.cooperativeName,
      slug: profile.cooperativeSlug,
    })
  }
  return {
    cooperatives: [...cooperatives.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    qaDomain: result.qaDomain,
  }
}

export async function GET(request: NextRequest) {
  const capability = await (
    await callerFor(request)
  ).qaAccelerator.capability({ clientKind: "web", contractVersion: 1 })
  if (!capability.available) {
    return NextResponse.json({ capability, cooperatives: [], qaDomain: null })
  }
  try {
    const access = await getAuthorizedAccess(request)
    return NextResponse.json({
      capability,
      cooperatives: access?.cooperatives ?? [],
      qaDomain: access?.qaDomain ?? null,
    })
  } catch {
    const response = NextResponse.json({
      capability,
      cooperatives: [],
      qaDomain: null,
    })
    response.cookies.delete(qaAuthorizationCookie)
    response.cookies.delete(qaClientCookie)
    return response
  }
}

// tRPC codes the QA authorize procedure uses for an expected refusal.
const refusalCodes: Record<string, number> = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PRECONDITION_FAILED: 412,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
}

function refusedStatus(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : ""
  return refusalCodes[code] ?? 500
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action?: "authorize" | "clear"
    qaDomain?: string
  }
  if (body.action === "clear") {
    const response = NextResponse.json({ ok: true })
    response.cookies.delete(qaAuthorizationCookie)
    response.cookies.delete(qaClientCookie)
    return response
  }
  if (body.action !== "authorize") {
    return NextResponse.json({ error: "invalid-action" }, { status: 400 })
  }

  const clientId = crypto.randomUUID()
  let authorization
  try {
    authorization = await (
      await callerFor(request)
    ).qaAccelerator.authorize({
      clientId,
      clientKind: "web",
      contractVersion: 1,
      qaDomain: body.qaDomain ?? "",
    })
  } catch (error) {
    // A refused QA Domain is an expected 4xx; internals stay server-side.
    const status = refusedStatus(error)
    if (status >= 500) console.error("QA authorization failed", error)
    if (status === 429) {
      return NextResponse.json(
        {
          error: "qa-rate-limited",
          message: "Too many QA access attempts. Try again later.",
        },
        { status: 429 }
      )
    }
    return NextResponse.json(
      status < 500
        ? {
            error: "qa-not-authorized",
            message: "This QA Domain isn't registered for QA access.",
          }
        : {
            error: "qa-unavailable",
            message: "QA access is unavailable right now. Try again later.",
          },
      { status: status < 500 ? 401 : 503 }
    )
  }
  const response = NextResponse.json({
    expiresAt: authorization.expiresAt,
    qaDomain: authorization.qaDomain,
  })
  const options = cookieOptions(request, new Date(authorization.expiresAt))
  response.cookies.set(
    qaAuthorizationCookie,
    authorization.authorizationToken,
    options
  )
  response.cookies.set(qaClientCookie, clientId, options)
  return response
}
