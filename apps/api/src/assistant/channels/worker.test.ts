import { describe, expect, test } from "bun:test"
import type { AssistantChannelRuntime } from "./runtime"
import { handleAssistantChannelWorker } from "./worker"

const SECRET = "fixture-worker-secret-0123456789abcdef"
const INBOX_ID = "6f1c2a8e-4b7d-4c1e-9a2b-3c4d5e6f7a8b"

function request(
  body: unknown,
  key: string | null = SECRET,
  raw?: string
): Request {
  return new Request("https://app.halaalvest.test/api/internal/assistant/channels/turn", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { "x-assistant-channel-worker-key": key } : {}),
    },
    body: raw ?? JSON.stringify(body),
  })
}

function fakeRuntime(overrides: Partial<AssistantChannelRuntime> = {}) {
  const calls: string[] = []
  const runtime = {
    async runTurnJob(id: string) {
      calls.push(`turn:${id}`)
      return { status: "done" as const }
    },
    async runDeliveryJob(id: string) {
      calls.push(`delivery:${id}`)
      return { status: "unknown" as const }
    },
    ...overrides,
  } as unknown as AssistantChannelRuntime
  return { runtime, calls }
}

async function call(
  kind: "turn" | "delivery",
  input: Request,
  options: { secret?: string | undefined; runtime?: AssistantChannelRuntime } = {}
) {
  const { runtime } = fakeRuntime()
  const response = await handleAssistantChannelWorker(kind, input, {
    secret: () => ("secret" in options ? options.secret : SECRET),
    runtime: () => options.runtime ?? runtime,
  })
  return { status: response.status, body: await response.json() }
}

describe("channel worker route", () => {
  test("404 until the worker secret is set", async () => {
    expect((await call("turn", request({ inboxId: INBOX_ID }), { secret: undefined })).status).toBe(404)
    expect((await call("turn", request({ inboxId: INBOX_ID }), { secret: "too-short" })).status).toBe(404)
  })

  test("401 without the exact worker key", async () => {
    expect((await call("turn", request({ inboxId: INBOX_ID }, null))).status).toBe(401)
    expect((await call("turn", request({ inboxId: INBOX_ID }, `${SECRET}x`))).status).toBe(401)
  })

  test("400 for anything but one row id; 413 for a large body", async () => {
    for (const body of [
      { inboxId: "not-a-uuid" },
      { inboxId: INBOX_ID, text: "hello" },
      { outboxId: INBOX_ID },
      [INBOX_ID],
    ])
      expect((await call("turn", request(body))).status).toBe(400)
    expect((await call("turn", request(null, SECRET, "{nope"))).status).toBe(400)
    expect((await call("delivery", request({ inboxId: INBOX_ID }))).status).toBe(400)
    expect(
      (await call("turn", request(null, SECRET, JSON.stringify({ inboxId: "x".repeat(600) })))).status
    ).toBe(413)
  })

  test("runs one step and returns only its status", async () => {
    const { runtime, calls } = fakeRuntime()
    expect(await call("turn", request({ inboxId: INBOX_ID }), { runtime })).toEqual({
      status: 200,
      body: { status: "done" },
    })
    expect(await call("delivery", request({ outboxId: INBOX_ID }), { runtime })).toEqual({
      status: 200,
      body: { status: "unknown" },
    })
    expect(calls).toEqual([`turn:${INBOX_ID}`, `delivery:${INBOX_ID}`])
  })

  test("503 when the step throws, so the job retries", async () => {
    const { runtime } = fakeRuntime({
      runTurnJob: async () => {
        throw new Error("database unavailable")
      },
    })
    const result = await call("turn", request({ inboxId: INBOX_ID }), { runtime })
    expect(result).toEqual({
      status: 503,
      body: { code: "CHANNEL_WORKER_UNAVAILABLE" },
    })
  })
})
