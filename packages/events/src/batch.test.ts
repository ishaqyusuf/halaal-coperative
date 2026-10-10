import { expect, test } from "bun:test"
import { packBatch } from "./batch"
test("batch sizing counts UTF-8 bytes including supplementary characters", () => {
  const events = Array.from({ length: 25 }, () => ({
    value: "😀".repeat(1000),
  }))
  const batch = packBatch(events, new Date().toISOString())
  expect(batch.events.length).toBeLessThan(25)
  expect(
    new TextEncoder().encode(JSON.stringify(batch)).length
  ).toBeLessThanOrEqual(48 * 1024)
  expect(
    new TextEncoder().encode(
      JSON.stringify({ ...batch, events: [...batch.events, events[0]] })
    ).length
  ).toBeGreaterThan(48 * 1024)
})
