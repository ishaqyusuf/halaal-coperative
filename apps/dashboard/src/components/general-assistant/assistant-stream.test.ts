import { describe, expect, mock, test } from "bun:test"
import type {
  AssistantStreamStage,
  AssistantTurnInput,
  AssistantTurnOutput,
} from "@halaalvest/assistant/contracts"
import { fixtureConversation } from "@halaalvest/assistant/fixtures"
import {
  AssistantStreamError,
  AssistantStreamUnavailable,
  parseAssistantStreamLine,
  readAssistantStream,
  sendTurnWithFallback,
} from "./assistant-stream"

const output: AssistantTurnOutput = {
  conversationId: "c1",
  userMessage: fixtureConversation[0]!,
  reply: fixtureConversation[1]!,
  proposals: [],
}
const input: AssistantTurnInput = {
  conversationId: "c1",
  requestId: "req_same",
  text: "What are my savings?",
}

/** A response whose body arrives in the given chunks. */
function ndjson(chunks: string[], init: ResponseInit = { status: 200 }) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, init)
}

const line = (event: unknown) => `${JSON.stringify(event)}\n`

describe("readAssistantStream", () => {
  test("reports each stage, then resolves with done.output across split chunks", async () => {
    const stages: AssistantStreamStage[] = []
    const done = line({ type: "done", output })
    const result = await readAssistantStream(
      ndjson([
        line({ type: "status", stage: "received" }),
        `${line({ type: "status", stage: "thinking" })}{"type":"sta`,
        `tus","stage":"reading"}\n`,
        done.slice(0, 20),
        done.slice(20),
      ]),
      (stage) => stages.push(stage)
    )
    expect(stages).toEqual(["received", "thinking", "reading"])
    expect(result.reply.id).toBe(output.reply.id)
  })

  test("a server error event rejects with its code and message", async () => {
    const run = readAssistantStream(
      ndjson([line({ type: "error", code: "forbidden", message: "Not allowed." })]),
      () => {}
    )
    await expect(run).rejects.toBeInstanceOf(AssistantStreamError)
    await expect(run).rejects.toThrow("Not allowed.")
  })

  test("non-200 and a body that ends early are stream failures", async () => {
    await expect(
      readAssistantStream(ndjson([], { status: 502 }), () => {})
    ).rejects.toBeInstanceOf(AssistantStreamUnavailable)
    await expect(
      readAssistantStream(
        ndjson([line({ type: "status", stage: "thinking" })]),
        () => {}
      )
    ).rejects.toBeInstanceOf(AssistantStreamUnavailable)
  })

  test("skips malformed and unknown lines", () => {
    expect(parseAssistantStreamLine("not json")).toBeNull()
    expect(parseAssistantStreamLine(`{"type":"status","stage":"other"}`)).toBeNull()
    expect(parseAssistantStreamLine("")).toBeNull()
  })
})

describe("sendTurnWithFallback", () => {
  test("a broken stream repeats the turn once through send with the same requestId", async () => {
    const send = mock(async (_: AssistantTurnInput) => output)
    const result = await sendTurnWithFallback(
      {
        streamTurn: async () => {
          throw new AssistantStreamUnavailable("network")
        },
        send,
      },
      input,
      () => {}
    )
    expect(result).toBe(output)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0].requestId).toBe("req_same")
  })

  test("a streamed reply or a server error never calls send", async () => {
    const send = mock(async (_: AssistantTurnInput) => output)
    await sendTurnWithFallback({ streamTurn: async () => output, send }, input, () => {})
    await expect(
      sendTurnWithFallback(
        {
          streamTurn: async () => {
            throw new AssistantStreamError({ type: "error", code: "busy", message: "Busy." })
          },
          send,
        },
        input,
        () => {}
      )
    ).rejects.toThrow("Busy.")
    expect(send).toHaveBeenCalledTimes(0)
  })
})
