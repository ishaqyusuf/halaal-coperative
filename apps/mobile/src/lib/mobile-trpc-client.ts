import { getBaseUrl } from "@/lib/base-url"
import { getToken } from "@/lib/session-store"
import type { AppRouter } from "@halaalvest/api/trpc/routers/_app"
import { createTRPCClient, httpLink } from "@trpc/client"
import superjson from "superjson"

function getTrpcUrl() {
  return `${getBaseUrl()}/api/trpc`
}

export function createMobileTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        headers: () => {
          const token = getToken()

          return {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            "x-trpc-source": "mobile",
          }
        },
        transformer: superjson,
        url: getTrpcUrl(),
      }),
    ],
  }) as any
}
