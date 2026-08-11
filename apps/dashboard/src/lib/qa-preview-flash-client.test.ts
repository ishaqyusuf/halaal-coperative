import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"
import { createQaPreviewFlashLoader } from "./qa-preview-flash-client"

describe("QA preview flash client", () => {
  test("deduplicates preview consumption for the same flash key", async () => {
    let requestCount = 0
    const load = createQaPreviewFlashLoader(async () => {
      requestCount += 1

      return Response.json({
        previews: [
          {
            artifacts: [],
            deliveryStatus: "sent",
            id: "preview-1",
            notificationType: "member.created",
            recipient: "tester@example.test",
          },
        ],
      })
    })

    const first = load("flash-key-1")
    const duplicate = load("flash-key-1")

    expect(duplicate).toBe(first)
    expect(await first).toHaveLength(1)
    expect(requestCount).toBe(1)

    await load("flash-key-2")
    expect(requestCount).toBe(2)
  })

  test("does not retain a continuous polling interval", async () => {
    const component = await Bun.file(
      resolve(import.meta.dir, "../components/qa-preview-flash-consumer.tsx")
    ).text()

    expect(component).not.toContain("setInterval")
    expect(component).not.toContain("clearInterval")
  })
})
