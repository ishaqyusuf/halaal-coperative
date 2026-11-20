import { describe, expect, test } from "bun:test"
import { handleTrpcRequest, type TrpcErrorReporter } from "./internal-api"

describe("tRPC HTTP request adapter", () => {
  test.each(["GET", "POST"])(
    "accepts a wrapped %s request and keeps one request ID",
    async (method) => {
      const requestId = "5cf591fc-92bb-4949-a95e-b4212cd3f1fb"
      const request = new Request(
        "http://localhost/api/trpc/paymentReceipts.ownOptions",
        {
          body: method === "POST" ? "{}" : undefined,
          headers: {
            "content-type": "application/json",
            "x-request-id": requestId,
          },
          method,
        }
      )
      // Like a framework wrapper, this object exposes the fetch interface
      // used by the adapter without carrying Request's runtime internals.
      const wrapped: Request = Object.create(Request.prototype, {
        headers: { value: request.headers },
        json: { value: () => request.json() },
        method: { value: request.method },
        signal: { value: request.signal },
        url: { value: request.url },
      })
      const events: Array<Parameters<TrpcErrorReporter>[0]> = []

      const response = await handleTrpcRequest(wrapped, "/api/trpc", (event) =>
        events.push(event)
      )

      expect(response.status).toBe(401)
      expect(response.headers.get("x-request-id")).toBe(requestId)
      expect(events.map((event) => event.requestId)).toEqual([requestId])
    }
  )
})
