import { expect, test } from "bun:test"
import { handleTrpcRequest } from "@halaalvest/api/internal-api"
import type { AppRouter } from "@halaalvest/api/trpc/routers/_app"
import { createTRPCClient, httpLink } from "@trpc/client"
import superjson from "superjson"

test("mobile-style POST queries keep search input out of the request URL", async () => {
  const marker = "private-member-search-marker"
  let observedRequest = false
  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        methodOverride: "POST",
        transformer: superjson,
        url: "https://api.halaalvest.test/api/trpc",
        fetch: async (url, init) => {
          const request = new Request(url, init)
          observedRequest = true
          expect(request.method).toBe("POST")
          expect(request.url).not.toContain(marker)
          expect(request.url).not.toContain("input=")
          expect(await request.clone().text()).toContain(marker)
          return handleTrpcRequest(request)
        },
      }),
    ],
  })

  await client.health.tenant.query({ tenantId: marker })
  expect(observedRequest).toBe(true)
})
