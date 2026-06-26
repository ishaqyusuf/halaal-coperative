import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import { createTRPCContext } from "./context"
import { appRouter } from "./routers/_app"

export function handleTrpcRequest(request: Request, endpoint = "/api/trpc") {
  return fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
  })
}

export function GET(request: Request) {
  return handleTrpcRequest(request)
}

export function POST(request: Request) {
  return handleTrpcRequest(request)
}
