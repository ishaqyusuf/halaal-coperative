import { describe, expect, test } from "bun:test"
import { AbortTaskRunError } from "@trigger.dev/sdk/v3"
import {
  ASSISTANT_CHANNEL_WORKER_KEY_HEADER,
  assistantChannelWorkerEndpoint,
  parseAssistantChannelJob,
  runAssistantChannelDeliveryJob,
  runAssistantChannelTurnJob,
} from "./assistant-channels"

const ID = "6f1c2a8e-4b7d-4c1e-9a2b-3c4d5e6f7a8b"
const SECRET = "fixture-worker-secret-0123456789abcdef"
const endpoint = () => ({
  base: new URL("https://app.halaalvest.test"),
  secret: SECRET,
})

function worker(...responses: (Response | Error)[]) {
  const requests: { url: string; init: RequestInit }[] = []
  const send = async (url: URL, init: RequestInit) => {
    requests.push({ url: url.toString(), init })
    const next = responses.shift() ?? new Error("no response")
    if (next instanceof Error) throw next
    return next
  }
  return { requests, send }
}

const ok = (status: string) => Response.json({ status })

describe("assistant channel job contract", () => {
  test("payloads carry exactly one row id", () => {
    expect(parseAssistantChannelJob("inboxId", { inboxId: ID })).toEqual({
      inboxId: ID,
    })
    for (const value of [
      null,
      [ID],
      { inboxId: "x" },
      { inboxId: ID, chatId: "2348000000000" },
      { outboxId: ID },
    ])
      expect(parseAssistantChannelJob("inboxId", value)).toBeNull()
  })

  test("the worker endpoint needs HTTPS (or a local host) and a long secret", () => {
    const secret = { ASSISTANT_CHANNEL_WORKER_SECRET: SECRET }
    expect(
      assistantChannelWorkerEndpoint({
        ...secret,
        ASSISTANT_CHANNEL_WORKER_URL: "https://app.halaalvest.com",
      }).base.origin
    ).toBe("https://app.halaalvest.com")
    expect(
      assistantChannelWorkerEndpoint({
        ...secret,
        ASSISTANT_CHANNEL_WORKER_URL: "http://halaalvest-dash.localhost:1441",
      }).base.hostname
    ).toBe("halaalvest-dash.localhost")
    for (const env of [
      {},
      { ...secret },
      { ASSISTANT_CHANNEL_WORKER_URL: "https://app.halaalvest.com" },
      { ...secret, ASSISTANT_CHANNEL_WORKER_URL: "http://app.halaalvest.com" },
      { ...secret, ASSISTANT_CHANNEL_WORKER_URL: "https://u:p@app.halaalvest.com" },
      {
        ASSISTANT_CHANNEL_WORKER_URL: "https://app.halaalvest.com",
        ASSISTANT_CHANNEL_WORKER_SECRET: "short",
      },
    ])
      expect(() => assistantChannelWorkerEndpoint(env)).toThrow(
        AbortTaskRunError
      )
  })
})

describe("turn job", () => {
  test("posts only the row id with the worker key, no redirects, with a timeout", async () => {
    const { requests, send } = worker(ok("done"))
    expect(
      await runAssistantChannelTurnJob({ inboxId: ID }, { endpoint, send })
    ).toEqual({ status: "done" })
    const [request] = requests
    expect(request!.url).toBe(
      "https://app.halaalvest.test/api/internal/assistant/channels/turn"
    )
    expect(request!.init.method).toBe("POST")
    expect(request!.init.redirect).toBe("error")
    expect(request!.init.signal).toBeInstanceOf(AbortSignal)
    expect(request!.init.body).toBe(JSON.stringify({ inboxId: ID }))
    expect(
      (request!.init.headers as Record<string, string>)[
        ASSISTANT_CHANNEL_WORKER_KEY_HEADER
      ]
    ).toBe(SECRET)
  })

  test("a transient turn failure retries; idle, skipped and disabled finish", async () => {
    const retry = worker(ok("retry"))
    const error = await runAssistantChannelTurnJob(
      { inboxId: ID },
      { endpoint, send: retry.send }
    ).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(AbortTaskRunError)

    for (const status of ["idle", "skipped", "disabled"]) {
      const { send } = worker(ok(status))
      expect(
        await runAssistantChannelTurnJob({ inboxId: ID }, { endpoint, send })
      ).toEqual({ status })
    }
  })

  test("validation and authorization failures stop retrying", async () => {
    await expect(
      runAssistantChannelTurnJob({ inboxId: "nope" }, { endpoint, send: worker().send })
    ).rejects.toBeInstanceOf(AbortTaskRunError)
    for (const status of [400, 401, 403, 404, 413]) {
      const { send } = worker(Response.json({ code: "X" }, { status }))
      await expect(
        runAssistantChannelTurnJob({ inboxId: ID }, { endpoint, send })
      ).rejects.toBeInstanceOf(AbortTaskRunError)
    }
  })

  test("network loss, 429, 5xx and unreadable results retry", async () => {
    for (const response of [
      new Error("socket hang up"),
      Response.json({}, { status: 429 }),
      Response.json({}, { status: 503 }),
      new Response("not json"),
      ok("something-else"),
    ]) {
      const { send } = worker(response)
      const error = await runAssistantChannelTurnJob(
        { inboxId: ID },
        { endpoint, send }
      ).catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(AbortTaskRunError)
      // Job errors never echo the response body or chat content.
      expect(String((error as Error).message)).not.toContain("not json")
    }
  })
})

describe("delivery job", () => {
  test("posts the outbox id to the delivery worker", async () => {
    const { requests, send } = worker(ok("sent"))
    expect(
      await runAssistantChannelDeliveryJob({ outboxId: ID }, { endpoint, send })
    ).toEqual({ status: "sent" })
    expect(requests[0]!.url).toBe(
      "https://app.halaalvest.test/api/internal/assistant/channels/delivery"
    )
    expect(requests[0]!.init.body).toBe(JSON.stringify({ outboxId: ID }))
  })

  test("a retryable rejection retries; an unknown outcome finishes without resending", async () => {
    const retry = worker(ok("retry"))
    await expect(
      runAssistantChannelDeliveryJob({ outboxId: ID }, { endpoint, send: retry.send })
    ).rejects.not.toBeInstanceOf(AbortTaskRunError)

    for (const status of ["unknown", "failed", "idle", "disabled"]) {
      const { requests, send } = worker(ok(status))
      expect(
        await runAssistantChannelDeliveryJob({ outboxId: ID }, { endpoint, send })
      ).toEqual({ status })
      expect(requests).toHaveLength(1)
    }
  })
})
