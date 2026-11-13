import { resolveRequestSessionScope } from "@halaalvest/auth"
import { buildRequestContext } from "@halaalvest/api/context"
import { appRouter } from "@halaalvest/api/router"
import { createCallerFactory } from "@halaalvest/api/trpc"
import { NextResponse, type NextRequest } from "next/server"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { toQaAccessErrorResponse } from "@/lib/qa-access-errors"
import {
  buildSessionCookieOptions,
  setDashboardSessionCookies,
} from "@/lib/auth-session-cookies"

const qaAuthorizationCookie = "halaalvest_qa_authorization"
const qaClientCookie = "halaalvest_qa_client"
const createCaller = createCallerFactory(appRouter)

async function callerFor(request: NextRequest) {
  return createCaller(await buildRequestContext(request.headers))
}

async function loadProfiles(request: NextRequest) {
  const authorizationToken = request.cookies.get(qaAuthorizationCookie)?.value
  const clientId = request.cookies.get(qaClientCookie)?.value
  if (!authorizationToken || !clientId) return null
  return (await callerFor(request)).qaAccelerator.profiles({
    authorizationToken,
    clientId,
    clientKind: "web",
    contractVersion: 1,
  })
}

export async function GET(request: NextRequest) {
  const caller = await callerFor(request)
  const capability = await caller.qaAccelerator.capability({
    clientKind: "web",
    contractVersion: 1,
  })
  if (!capability.available) {
    return NextResponse.json({ capability, profiles: null })
  }
  try {
    return NextResponse.json({
      capability,
      profiles: await loadProfiles(request),
    })
  } catch {
    const response = NextResponse.json({ capability, profiles: null })
    response.cookies.delete(qaAuthorizationCookie)
    response.cookies.delete(qaClientCookie)
    return response
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action?: "authorize" | "clear" | "enter"
    next?: string
    qaDomain?: string
    selectionRef?: string
  }
  if (body.action === "clear") {
    const response = NextResponse.json({ ok: true })
    response.cookies.delete(qaAuthorizationCookie)
    response.cookies.delete(qaClientCookie)
    return response
  }

  try {
    const caller = await callerFor(request)
    if (body.action === "authorize") {
      const clientId = crypto.randomUUID()
      const authorization = await caller.qaAccelerator.authorize({
        clientId,
        clientKind: "web",
        contractVersion: 1,
        qaDomain: body.qaDomain ?? "",
      })
      const response = NextResponse.json({
        expiresAt: authorization.expiresAt,
        qaDomain: authorization.qaDomain,
      })
      const options = buildSessionCookieOptions(
        request,
        new Date(authorization.expiresAt)
      )
      response.cookies.set(
        qaAuthorizationCookie,
        authorization.authorizationToken,
        options
      )
      response.cookies.set(qaClientCookie, clientId, options)
      return response
    }

    if (body.action === "enter") {
      const authorizationToken = request.cookies.get(
        qaAuthorizationCookie
      )?.value
      const clientId = request.cookies.get(qaClientCookie)?.value
      if (!authorizationToken || !clientId) {
        return NextResponse.json(
          { error: "authorization-required" },
          { status: 401 }
        )
      }
      const result = await caller.qaAccelerator.enterProfile({
        authorizationToken,
        clientId,
        clientKind: "web",
        contractVersion: 1,
        selectionRef: body.selectionRef ?? "",
      })
      if (result.clientKind !== "web") {
        return NextResponse.json({ error: "invalid-client" }, { status: 409 })
      }
      const scope = resolveRequestSessionScope(request.headers.get("host"))
      // Same rule as password sign-in: only a same-origin path survives.
      const response = NextResponse.json({
        ok: true,
        redirectTo: normalizeDashboardRedirectPath(body.next),
      })
      return setDashboardSessionCookies(response, {
        request,
        scope,
        sessionToken: result.sessionToken,
        userId: result.userId,
      })
    }
  } catch (error) {
    // Refused QA authorization or entry is an expected 4xx with safe copy,
    // never an empty 500.
    const failure = toQaAccessErrorResponse(error)
    return NextResponse.json(failure.body, { status: failure.status })
  }

  return NextResponse.json({ error: "invalid-action" }, { status: 400 })
}
