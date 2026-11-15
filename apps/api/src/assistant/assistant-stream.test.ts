import { describe, expect, test } from "bun:test"

import { handleAssistantTurnStream } from "./stream-route"
import { receiptProofUploadsAvailable, receiptProofUrl } from "./uploads"

describe("receipt proof uploads", () => {
  test("local development uses the filesystem adapter; deployed needs private Blob", () => {
    expect(receiptProofUploadsAvailable({ NODE_ENV: "development" })).toBe(true)
    expect(receiptProofUploadsAvailable({ NODE_ENV: "production" })).toBe(false)
    expect(receiptProofUploadsAvailable({ VERCEL_ENV: "preview", DASHBOARD_PRIVATE_BLOB_ENABLED: "1" })).toBe(false)
    expect(
      receiptProofUploadsAvailable({
        VERCEL_ENV: "production",
        DASHBOARD_PRIVATE_BLOB_ENABLED: "1",
        BLOB_READ_WRITE_TOKEN: "token",
        DASHBOARD_UPLOAD_SIGNING_SECRET: "x".repeat(32),
      })
    ).toBe(true)
  })

  test("only a private upload id becomes a claimable proof URL", () => {
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e"
    expect(receiptProofUrl(id)).toBe(`/api/uploads/${id}`)
    expect(receiptProofUrl("https://evil.example/proof.pdf")).toBeNull()
    expect(receiptProofUrl("../../etc/passwd")).toBeNull()
    expect(receiptProofUrl(null)).toBeNull()
  })
})

describe("streamed turn route", () => {
  const url = "https://coop.halaalvest.test/api/assistant/turn"

  test("refuses a cross-site browser post before touching the session", async () => {
    const response = await handleAssistantTurnStream(
      new Request(url, {
        method: "POST",
        headers: { host: "coop.halaalvest.test", origin: "https://evil.example" },
        body: "{}",
      })
    )
    expect(response.status).toBe(403)
  })

  test("rejects oversized and malformed bodies", async () => {
    const big = await handleAssistantTurnStream(
      new Request(url, { method: "POST", headers: { host: "coop.halaalvest.test" }, body: "x".repeat(20_000) })
    )
    expect(big.status).toBe(413)
    const bad = await handleAssistantTurnStream(
      new Request(url, { method: "POST", headers: { host: "coop.halaalvest.test" }, body: "{not json" })
    )
    expect(bad.status).toBe(400)
  })
})
