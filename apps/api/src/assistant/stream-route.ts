import type { AssistantStreamEvent, AssistantStreamStage } from "@halaalvest/assistant"
import { TRPCError } from "@trpc/server"

import { createTRPCContext } from "../context"
import { appRouter } from "../routers/_app"
import { getTrpcPublicError } from "../trpc/error-contract"
import { ASSISTANT_HOOKS } from "./stream-hooks"
import type { TurnHooks } from "./turn"

/**
 * POST /api/assistant/turn — the same turn as `assistant.send`, streamed as
 * newline-delimited JSON: zero or more `status` events, then one `done` (the
 * saved turn output) or one `error`. It runs through the tRPC caller, so the
 * session, tenant, membership and mobile-access guards are exactly those of
 * `assistant.send`. A retried request with the same `requestId` returns the
 * saved reply. Mounted by the dashboard at `app/api/assistant/turn/route.ts`.
 *
 * Runtime: one request per user message (same frequency as `assistant.send`,
 * which it replaces for web/native clients), bounded by the turn itself (one
 * optional model call plus guarded reads/drafts). No polling, no retries here.
 */

const MAX_BODY_BYTES = 16_000

const encoder = new TextEncoder()
const line = (event: AssistantStreamEvent) => encoder.encode(`${JSON.stringify(event)}\n`)

function errorEvent(error: unknown): AssistantStreamEvent {
  if (error instanceof TRPCError) {
    const code =
      error.code === "UNAUTHORIZED"
        ? "unauthorized"
        : error.code === "FORBIDDEN"
          ? "forbidden"
          : error.code === "CONFLICT"
            ? "busy"
            : error.code === "BAD_REQUEST" || error.code === "NOT_FOUND"
              ? "invalid"
              : "failed"
    const message = getTrpcPublicError(error).message.slice(0, 300)
    return { type: "error", code, message }
  }
  return { type: "error", code: "failed", message: "The assistant couldn't finish that. Nothing was changed." }
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  // Native clients send no Origin; browsers always do on a cross-site POST.
  if (!origin) return true
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function handleAssistantTurnStream(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 })
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const ctx = await createTRPCContext({ req: request })
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: AssistantStreamEvent) => {
        if (!closed) controller.enqueue(line(event))
      }
      const hooks: TurnHooks = {
        onStage: (stage: AssistantStreamStage) => send({ type: "status", stage }),
      }
      try {
        const caller = appRouter.createCaller({ ...ctx, [ASSISTANT_HOOKS]: hooks } as typeof ctx)
        const output = await caller.assistant.send(body as Parameters<typeof caller.assistant.send>[0])
        send({ type: "done", output })
      } catch (error) {
        send(errorEvent(error))
      } finally {
        closed = true
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-accel-buffering": "no",
    },
  })
}

export function POST(request: Request) {
  return handleAssistantTurnStream(request)
}
