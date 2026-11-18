import { handleTrpcRequest } from "@halaalvest/api/internal-api"

import { captureDashboardTrpcError } from "@/lib/sentry"

// The Bun API's own Sentry SDK never starts inside Next.js, so failures from
// the hosted router are reported through the dashboard's SDK instead.
function handle(request: Request) {
  return handleTrpcRequest(request, "/api/trpc", captureDashboardTrpcError)
}

export { handle as GET, handle as POST }
