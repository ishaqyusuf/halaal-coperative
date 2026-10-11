import { buildRequestContext } from "@halaalvest/api/context"
import { appRouter } from "@halaalvest/api/router"
import { createCallerFactory } from "@halaalvest/api/trpc"
import { NextResponse, type NextRequest } from "next/server"

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

async function getAuthorizedDomain(request: NextRequest) {
  const authorizationToken = request.cookies.get(qaAuthorizationCookie)?.value
  const clientId = request.cookies.get(qaClientCookie)?.value
  if (!authorizationToken || !clientId) return null
  const profiles = await (
    await callerFor(request)
  ).qaAccelerator.profiles({
    authorizationToken,
    clientId,
    clientKind: "web",
    contractVersion: 1,
  })
  return profiles.qaDomain
}

export async function GET(request: NextRequest) {
  const capability = await (
    await callerFor(request)
  ).qaAccelerator.capability({ clientKind: "web", contractVersion: 1 })
  if (!capability.available) {
    return NextResponse.json({ capability, qaDomain: null })
  }
  try {
    return NextResponse.json({
      capability,
      qaDomain: await getAuthorizedDomain(request),
    })
  } catch {
    const response = NextResponse.json({ capability, qaDomain: null })
    response.cookies.delete(qaAuthorizationCookie)
    response.cookies.delete(qaClientCookie)
    return response
  }
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
  const authorization = await (
    await callerFor(request)
  ).qaAccelerator.authorize({
    clientId,
    clientKind: "web",
    contractVersion: 1,
    qaDomain: body.qaDomain ?? "",
  })
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
