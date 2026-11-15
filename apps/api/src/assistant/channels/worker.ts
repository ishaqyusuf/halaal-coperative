import {
  ASSISTANT_CHANNEL_WORKER_KEY_HEADER,
  parseAssistantChannelJob,
} from "@halaalvest/jobs/assistant-channels"
import { safeEqual } from "./identity"
import type { AssistantChannelRuntime } from "./runtime"

const MAX_JOB_BYTES = 512

export type AssistantChannelWorkerDeps = {
  secret: () => string | undefined
  runtime: () => AssistantChannelRuntime
  log?: (event: string, detail?: Record<string, unknown>) => void
}

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

/**
 * Machine-only channel worker, called by the Trigger.dev channel jobs. The
 * body can only name an existing row ID; the worker re-reads everything else
 * (link, membership, flags) from the database and env.
 *
 * 404 until `ASSISTANT_CHANNEL_WORKER_SECRET` is set, 401 for a wrong key,
 * 400/413 for a bad body (the job stops retrying on these), 503 when the
 * step throws (the job retries), else 200 `{ status }`.
 */
export async function handleAssistantChannelWorker(
  kind: "turn" | "delivery",
  request: Request,
  deps: AssistantChannelWorkerDeps
) {
  const secret = deps.secret()?.trim()
  if (!secret || secret.length < 32) return json({ code: "NOT_FOUND" }, 404)
  if (!safeEqual(request.headers.get(ASSISTANT_CHANNEL_WORKER_KEY_HEADER), secret))
    return json({ code: "UNAUTHORIZED" }, 401)
  if (Number(request.headers.get("content-length")) > MAX_JOB_BYTES)
    return json({ code: "PAYLOAD_TOO_LARGE" }, 413)
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_JOB_BYTES)
    return json({ code: "PAYLOAD_TOO_LARGE" }, 413)
  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch {
    return json({ code: "BAD_REQUEST" }, 400)
  }
  try {
    if (kind === "turn") {
      const job = parseAssistantChannelJob("inboxId", input)
      if (!job) return json({ code: "BAD_REQUEST" }, 400)
      return json(await deps.runtime().runTurnJob(job.inboxId), 200)
    }
    const job = parseAssistantChannelJob("outboxId", input)
    if (!job) return json({ code: "BAD_REQUEST" }, 400)
    return json(await deps.runtime().runDeliveryJob(job.outboxId), 200)
  } catch (error) {
    deps.log?.("channel_worker_failed", {
      kind,
      name: error instanceof Error ? error.name : "unknown",
    })
    return json({ code: "CHANNEL_WORKER_UNAVAILABLE" }, 503)
  }
}
