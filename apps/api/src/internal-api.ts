import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { randomUUID } from "node:crypto"

import { createTRPCContext } from "./context"
import { appRouter } from "./routers/_app"
import { captureTrpcError } from "./observability/sentry"
import { getSafeObservabilityRequestId } from "./observability/sentry-policy"

export async function handleTrpcRequest(
  request: Request,
  endpoint = "/api/trpc"
) {
  const requestId =
    getSafeObservabilityRequestId(
      request.headers.get("x-request-id") ?? undefined
    ) ?? randomUUID()
  const headers = new Headers(request.headers)
  headers.set("x-request-id", requestId)
  const correlatedRequest = new Request(request, { headers })
  const response = await fetchRequestHandler({
    endpoint,
    req: correlatedRequest,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path, type }) {
      captureTrpcError({
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
