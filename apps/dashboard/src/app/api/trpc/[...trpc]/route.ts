import { createTRPCContext } from "@halaalvest/api/context"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/trpc/router"

export const dynamic = "force-dynamic"

function handleDashboardTrpcRequest(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
  })
}

export function GET(request: Request) {
  return handleDashboardTrpcRequest(request)
}

export function POST(request: Request) {
  return handleDashboardTrpcRequest(request)
}
