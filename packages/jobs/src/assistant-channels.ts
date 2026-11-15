import { AbortTaskRunError, tasks } from "@trigger.dev/sdk/v3"

/**
 * WhatsApp and Telegram assistant jobs (Trigger.dev).
 *
 * The webhook admits an event to `AssistantChannelInbox` and triggers the turn
 * job. Jobs carry row IDs only (no chat text, phone numbers or chat IDs). Each
 * run asks the dashboard's channel worker route to do one bounded step, because
 * the assistant turn lives in `apps/api` and that package already depends on
 * this one (a reverse import would make a package cycle, and Trigger's bundler
 * drops task files outside `packages/jobs`). See
 * `.brain/features/cooperative-assistant-messaging.md` → Jobs.
 */

export const ASSISTANT_CHANNEL_TURN_JOB_ID = "assistant-channel-turn"
export const ASSISTANT_CHANNEL_DELIVERY_JOB_ID = "assistant-channel-delivery"

/** Trigger attempts. The store separately bounds turns and sends at 3. */
export const ASSISTANT_CHANNEL_TURN_MAX_ATTEMPTS = 3
export const ASSISTANT_CHANNEL_DELIVERY_MAX_ATTEMPTS = 3

/** Worker route budgets: the route's `maxDuration` plus headroom. */
export const ASSISTANT_CHANNEL_TURN_REQUEST_MS = 130_000
export const ASSISTANT_CHANNEL_DELIVERY_REQUEST_MS = 70_000

export const ASSISTANT_CHANNEL_WORKER_PATHS = {
  turn: "/api/internal/assistant/channels/turn",
  delivery: "/api/internal/assistant/channels/delivery",
} as const

export const ASSISTANT_CHANNEL_WORKER_KEY_HEADER =
  "x-assistant-channel-worker-key"

export type AssistantChannelTurnJob = { inboxId: string }
export type AssistantChannelDeliveryJob = { outboxId: string }

export const assistantChannelTurnStatuses = [
  "done",
  "retry",
  "skipped",
  "idle",
  "disabled",
] as const
export type AssistantChannelTurnStatus =
  (typeof assistantChannelTurnStatuses)[number]

export const assistantChannelDeliveryStatuses = [
  "sent",
  "failed",
  "unknown",
  "retry",
  "idle",
  "skipped",
  "disabled",
] as const
export type AssistantChannelDeliveryStatus =
  (typeof assistantChannelDeliveryStatuses)[number]

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Accepts exactly `{ [key]: uuid }`; anything else is a validation failure. */
export function parseAssistantChannelJob<K extends "inboxId" | "outboxId">(
  key: K,
  value: unknown
): Record<K, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length !== 1 || entries[0]![0] !== key) return null
  const id = entries[0]![1]
  return typeof id === "string" && UUID.test(id)
    ? ({ [key]: id } as Record<K, string>)
    : null
}

// ---------------------------------------------------------------------------
// Trigger (webhook and worker side)
// ---------------------------------------------------------------------------

/**
 * One concurrency key per linked chat (a digest, never the raw chat ID), so
 * each chat runs one turn and one delivery at a time, oldest first.
 */
export async function enqueueAssistantChannelTurn(input: {
  inboxId: string
  chatKey: string
}) {
  await tasks.trigger(
    ASSISTANT_CHANNEL_TURN_JOB_ID,
    { inboxId: input.inboxId } satisfies AssistantChannelTurnJob,
    {
      concurrencyKey: input.chatKey,
      idempotencyKey: [ASSISTANT_CHANNEL_TURN_JOB_ID, input.inboxId],
      idempotencyKeyTTL: "1h",
      maxAttempts: ASSISTANT_CHANNEL_TURN_MAX_ATTEMPTS,
    }
  )
}

export async function enqueueAssistantChannelDelivery(input: {
  outboxId: string
  chatKey: string
}) {
  await tasks.trigger(
    ASSISTANT_CHANNEL_DELIVERY_JOB_ID,
    { outboxId: input.outboxId } satisfies AssistantChannelDeliveryJob,
    {
      concurrencyKey: input.chatKey,
      idempotencyKey: [ASSISTANT_CHANNEL_DELIVERY_JOB_ID, input.outboxId],
      idempotencyKeyTTL: "1h",
      maxAttempts: ASSISTANT_CHANNEL_DELIVERY_MAX_ATTEMPTS,
    }
  )
}

// ---------------------------------------------------------------------------
// Job handlers (Trigger worker side)
// ---------------------------------------------------------------------------

export type AssistantChannelWorkerEndpoint = { base: URL; secret: string }

type Env = Record<string, string | undefined>
type Send = (url: URL, init: RequestInit) => Promise<Response>

/** Retries stop: wrong config, bad payload or authorization failure. */
export class AssistantChannelJobAbort extends AbortTaskRunError {}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  )
}

export function assistantChannelWorkerEndpoint(
  env: Env = process.env
): AssistantChannelWorkerEndpoint {
  const raw = env.ASSISTANT_CHANNEL_WORKER_URL?.trim()
  const secret = env.ASSISTANT_CHANNEL_WORKER_SECRET?.trim()
  if (!raw || !secret || secret.length < 32)
    throw new AssistantChannelJobAbort(
      "The assistant channel worker is not configured."
    )
  let base: URL
  try {
    base = new URL(raw)
  } catch {
    throw new AssistantChannelJobAbort(
      "The assistant channel worker URL is not valid."
    )
  }
  if (
    base.username ||
    base.password ||
    !(
      base.protocol === "https:" ||
      (base.protocol === "http:" && isLocalHost(base.hostname))
    )
  )
    throw new AssistantChannelJobAbort(
      "The assistant channel worker URL must use HTTPS."
    )
  return { base, secret }
}

/**
 * One worker step. Network loss, timeouts, 429 and 5xx retry (Trigger
 * backoff); 400/401/403/404/413 abort. Error messages never carry the
 * response body, chat content or configuration.
 */
async function requestWorker(
  path: string,
  body: AssistantChannelTurnJob | AssistantChannelDeliveryJob,
  timeoutMs: number,
  deps: { endpoint: AssistantChannelWorkerEndpoint; send: Send }
): Promise<string> {
  let response: Response
  try {
    response = await deps.send(new URL(path, deps.endpoint.base), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [ASSISTANT_CHANNEL_WORKER_KEY_HEADER]: deps.endpoint.secret,
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new Error("Assistant channel worker request interrupted.")
  }
  if ([400, 401, 403, 404, 413].includes(response.status))
    throw new AssistantChannelJobAbort(
      `Assistant channel worker refused the job (${response.status}).`
    )
  if (!response.ok)
    throw new Error(
      `Assistant channel worker unavailable (${response.status}).`
    )
  let status: unknown
  try {
    const text = await response.text()
    if (text.length <= 1024)
      status = (JSON.parse(text) as { status?: unknown }).status
  } catch {
    // An unreadable body is retried like an interrupted request.
  }
  if (typeof status !== "string")
    throw new Error("Invalid assistant channel worker result.")
  return status
}

export type AssistantChannelJobDeps = {
  endpoint?: () => AssistantChannelWorkerEndpoint
  send?: Send
}

function resolveDeps(deps: AssistantChannelJobDeps) {
  return {
    endpoint: (deps.endpoint ?? assistantChannelWorkerEndpoint)(),
    send: deps.send ?? ((url: URL, init: RequestInit) => fetch(url, init)),
  }
}

/**
 * Processes the oldest received inbox row in this row's chat. The worker
 * re-resolves the link and membership, runs the turn, records the outbox and
 * triggers delivery. `retry` (a transient turn failure) throws so Trigger
 * retries; the store caps attempts at 3, then replies with an apology.
 */
export async function runAssistantChannelTurnJob(
  payload: unknown,
  deps: AssistantChannelJobDeps = {}
): Promise<{ status: AssistantChannelTurnStatus }> {
  const job = parseAssistantChannelJob("inboxId", payload)
  if (!job) throw new AssistantChannelJobAbort("Invalid assistant channel job.")
  const status = await requestWorker(
    ASSISTANT_CHANNEL_WORKER_PATHS.turn,
    job,
    ASSISTANT_CHANNEL_TURN_REQUEST_MS,
    resolveDeps(deps)
  )
  if (!assistantChannelTurnStatuses.includes(status as never))
    throw new Error("Invalid assistant channel worker result.")
  if (status === "retry") throw new Error("Assistant turn will be retried.")
  return { status: status as AssistantChannelTurnStatus }
}

/**
 * Sends this chat's pending replies oldest first. `retry` (a retryable
 * rejection such as 429) throws so Trigger backs off. `unknown` is final: the
 * message may have arrived, so it is reconciled, never resent.
 */
export async function runAssistantChannelDeliveryJob(
  payload: unknown,
  deps: AssistantChannelJobDeps = {}
): Promise<{ status: AssistantChannelDeliveryStatus }> {
  const job = parseAssistantChannelJob("outboxId", payload)
  if (!job) throw new AssistantChannelJobAbort("Invalid assistant channel job.")
  const status = await requestWorker(
    ASSISTANT_CHANNEL_WORKER_PATHS.delivery,
    job,
    ASSISTANT_CHANNEL_DELIVERY_REQUEST_MS,
    resolveDeps(deps)
  )
  if (!assistantChannelDeliveryStatuses.includes(status as never))
    throw new Error("Invalid assistant channel worker result.")
  if (status === "retry") throw new Error("Assistant reply will be retried.")
  return { status: status as AssistantChannelDeliveryStatus }
}
