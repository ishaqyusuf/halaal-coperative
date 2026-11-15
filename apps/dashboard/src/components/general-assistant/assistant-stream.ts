import {
  type AssistantStreamEvent,
  type AssistantStreamStage,
  type AssistantTurnInput,
  type AssistantTurnOutput,
  assistantStreamEventSchema,
} from "@halaalvest/assistant/contracts"

/**
 * The stream itself failed (network, non-200, or it ended without a `done`
 * or `error` event). The turn may or may not have run, so the caller repeats
 * it through `assistant.send` with the same `requestId`: the server returns
 * the saved reply instead of answering twice.
 */
export class AssistantStreamUnavailable extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "AssistantStreamUnavailable"
  }
}

/** The server finished the turn with an `error` event; not retried here. */
export class AssistantStreamError extends Error {
  readonly code: Extract<AssistantStreamEvent, { type: "error" }>["code"]
  constructor(event: Extract<AssistantStreamEvent, { type: "error" }>) {
    super(event.message)
    this.name = "AssistantStreamError"
    this.code = event.code
  }
}

/** Parses one NDJSON line; unknown or malformed lines are skipped. */
export function parseAssistantStreamLine(
  line: string
): AssistantStreamEvent | null {
  const text = line.trim()
  if (!text) return null
  try {
    const parsed = assistantStreamEventSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/**
 * Reads a POST /api/assistant/turn response: `status` events go to
 * `onStage`, then the first `done` resolves with its output and the first
 * `error` rejects with `AssistantStreamError`. Anything else (a non-200, a
 * dropped connection, a body that ends early) rejects with
 * `AssistantStreamUnavailable`.
 */
export async function readAssistantStream(
  response: Response,
  onStage: (stage: AssistantStreamStage) => void
): Promise<AssistantTurnOutput> {
  if (!response.ok || !response.body)
    throw new AssistantStreamUnavailable(`status ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const handle = (line: string) => {
    const event = parseAssistantStreamLine(line)
    if (!event) return null
    if (event.type === "status") {
      onStage(event.stage)
      return null
    }
    return event
  }
  try {
    while (true) {
      let chunk: Awaited<ReturnType<typeof reader.read>>
      try {
        chunk = await reader.read()
      } catch {
        throw new AssistantStreamUnavailable("connection lost")
      }
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), {
        stream: !chunk.done,
      })
      const lines = buffer.split("\n")
      buffer = chunk.done ? "" : (lines.pop() ?? "")
      for (const line of lines) {
        const event = handle(line)
        if (event?.type === "done") return event.output
        if (event?.type === "error") throw new AssistantStreamError(event)
      }
      if (chunk.done) break
    }
  } finally {
    reader.cancel().catch(() => {})
  }
  throw new AssistantStreamUnavailable("ended without a reply")
}

/**
 * Streams one turn; if the stream itself failed, sends the same input (same
 * `requestId`) once through `send`, which returns the saved reply when the
 * turn already ran. A server `error` event is final and is not resent.
 */
export async function sendTurnWithFallback(
  api: {
    streamTurn: (
      input: AssistantTurnInput,
      onStage: (stage: AssistantStreamStage) => void
    ) => Promise<AssistantTurnOutput>
    send: (input: AssistantTurnInput) => Promise<AssistantTurnOutput>
  },
  input: AssistantTurnInput,
  onStage: (stage: AssistantStreamStage) => void
): Promise<AssistantTurnOutput> {
  try {
    return await api.streamTurn(input, onStage)
  } catch (error) {
    if (error instanceof AssistantStreamUnavailable) return api.send(input)
    throw error
  }
}
