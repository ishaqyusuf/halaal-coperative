import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { randomUUID } from "node:crypto"

import { createTRPCContext } from "./context"
import { appRouter } from "./routers/_app"
import { captureTrpcError } from "./observability/sentry"
import { getSafeObservabilityRequestId } from "./observability/sentry-policy"

export type TrpcErrorReporter = (
  input: Parameters<typeof captureTrpcError>[0]
) => unknown

/**
 * `reportError` lets a host that mounts this router (the dashboard on Vercel)
 * send failures to its own Sentry SDK; the standalone Bun API keeps the
 * default `@sentry/bun` capture.
 */
export async function handleTrpcRequest(
  request: Request,
  endpoint = "/api/trpc",
  reportError: TrpcErrorReporter = captureTrpcError
) {
  const requestId =
    getSafeObservabilityRequestId(
      request.headers.get("x-request-id") ?? undefined
    ) ?? randomUUID()
  const headers = new Headers(request.headers)
  headers.set("x-request-id", requestId)
  const correlatedRequest = new Request(request, { headers })
  const response = await fetchRequestHandler({
    allowMethodOverride: true,
    endpoint,
    req: correlatedRequest,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path, type }) {
      reportError({
        error,
        path,
        requestId,
        router: "app",
        type,
      })
    },
  })
  response.headers.set("x-request-id", requestId)
  return response
}

export function GET(request: Request) {
  return handleTrpcRequest(request)
}

export function POST(request: Request) {
  return handleTrpcRequest(request)
}
