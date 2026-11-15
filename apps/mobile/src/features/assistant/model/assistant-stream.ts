import {
  type AssistantStreamStage,
  type AssistantTurnOutput,
  assistantStreamEventSchema,
} from "@halaalvest/assistant/contracts"

/**
 * Reads the streamed turn (`POST /api/assistant/turn`, newline-delimited
 * JSON: `status`, then one `done` or `error`). Pure: the transport hands in
 * text chunks, so this is tested without a network.
 *
 * `fallback` says whether `assistant.send` with the same `requestId` may be
 * tried next. Transport trouble (no route, dropped stream, server busy or
 * failed) falls back; a refusal the plain send would repeat (signed out,
 * not allowed, bad input) does not.
 */
export class AssistantStreamError extends Error {
  constructor(
    message: string,
    readonly fallback: boolean,
    readonly code: string = "transport"
  ) {
    super(message)
    this.name = "AssistantStreamError"
  }
}

const final = new Set(["unauthorized", "forbidden", "invalid"])

export async function readAssistantStream(
  chunks: AsyncIterable<string>,
  onStage: (stage: AssistantStreamStage) => void
): Promise<AssistantTurnOutput> {
  let buffer = ""
  const line = (raw: string): AssistantTurnOutput | null => {
    const text = raw.trim()
    if (!text) return null
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new AssistantStreamError("The reply stream was unreadable.", true)
    }
    const event = assistantStreamEventSchema.safeParse(json)
    // An unknown event from a newer server is skipped, not fatal.
    if (!event.success) return null
    if (event.data.type === "status") {
      onStage(event.data.stage)
      return null
    }
    if (event.data.type === "done") return event.data.output
    throw new AssistantStreamError(
      event.data.message,
      !final.has(event.data.code),
      event.data.code
    )
  }
  for await (const chunk of chunks) {
    buffer += chunk
    let index = buffer.indexOf("\n")
    while (index >= 0) {
      const output = line(buffer.slice(0, index))
      if (output) return output
      buffer = buffer.slice(index + 1)
      index = buffer.indexOf("\n")
    }
  }
  const output = line(buffer)
  if (output) return output
  throw new AssistantStreamError("The reply stream ended early.", true)
}

/** Plain progress words for each stage (EwaTrade's "Thinking…" row). */
export const assistantStageLabel: Record<AssistantStreamStage, string> = {
  received: "Sending…",
  thinking: "Thinking…",
  reading: "Checking your records…",
  drafting: "Preparing a draft…",
}
