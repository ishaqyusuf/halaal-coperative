import { describe, expect, test } from "bun:test"
import { AssistantStreamError, readAssistantStream } from "./assistant-stream"

const message = (id: string, role: "user" | "assistant") => ({
  id,
  role,
  parts: [{ type: "text", text: id }],
  createdAt: "2026-11-15T09:00:00.000Z",
})
const output = {
  conversationId: "c1",
  userMessage: message("m1", "user"),
  reply: message("m2", "assistant"),
  proposals: [],
}

async function* chunks(...parts: string[]) {
  for (const part of parts) yield part
}

describe("readAssistantStream", () => {
  test("reports stages and returns the done output across split chunks", async () => {
    const stages: string[] = []
    const done = JSON.stringify({ type: "done", output })
    const result = await readAssistantStream(
      chunks(
        '{"type":"status","stage":"received"}\n{"type":"sta',
        'tus","stage":"reading"}\n',
        done.slice(0, 20),
        `${done.slice(20)}\n`
      ),
      (stage) => stages.push(stage)
    )
    expect(stages).toEqual(["received", "reading"])
    expect(result.reply.id).toBe("m2")
  })

  test("accepts a last line without a newline and skips unknown events", async () => {
    const result = await readAssistantStream(
      chunks('{"type":"ping"}\n', JSON.stringify({ type: "done", output })),
      () => {}
    )
    expect(result.conversationId).toBe("c1")
  })

  test("a stream that ends without done falls back", async () => {
    const error = await readAssistantStream(
      chunks('{"type":"status","stage":"thinking"}\n'),
      () => {}
    ).catch((e) => e)
    expect(error).toBeInstanceOf(AssistantStreamError)
    expect(error.fallback).toBe(true)
  })

  test("busy or failed falls back; signed out or not allowed does not", async () => {
    for (const [code, fallback] of [
      ["busy", true],
      ["failed", true],
      ["unauthorized", false],
      ["forbidden", false],
      ["invalid", false],
    ] as const) {
      const error = await readAssistantStream(
        chunks(`${JSON.stringify({ type: "error", code, message: "No" })}\n`),
        () => {}
      ).catch((e) => e)
      expect(error.fallback).toBe(fallback)
      expect(error.code).toBe(code)
    }
  })

  test("garbage falls back", async () => {
    const error = await readAssistantStream(chunks("<html>\n"), () => {}).catch(
      (e) => e
    )
    expect(error.fallback).toBe(true)
  })
})
