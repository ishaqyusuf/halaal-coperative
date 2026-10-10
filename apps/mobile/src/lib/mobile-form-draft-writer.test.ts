import { expect, test } from "bun:test"
import { createMobileFormDraftWriter } from "./mobile-form-draft-writer"

test("clear waits for an in-flight autosave and blocks later writes/hydration", async () => {
  const events: string[] = []
  let finishWrite = () => {}
  const writer = createMobileFormDraftWriter({
    setItem: async (key) => {
      events.push(`write:${key}`)
      await new Promise<void>((resolve) => { finishWrite = resolve })
      events.push("write-finished")
    },
    removeItem: async (key) => { events.push(`remove:${key}`) },
  }, "tenant:user:procurement", { freezeAfterClear: true })
  const write = writer.write("draft")
  await Promise.resolve()
  const clear = writer.clear()
  await writer.write("late render")
  expect(writer.canHydrate()).toBe(false)
  expect(events).toEqual(["write:tenant:user:procurement"])
  finishWrite()
  await Promise.all([write, clear])
  expect(events).toEqual(["write:tenant:user:procurement", "write-finished", "remove:tenant:user:procurement"])
})

test("queued autosaves cannot resurrect a cleared draft", async () => {
  const events: string[] = []
  const writer = createMobileFormDraftWriter({
    setItem: async () => { events.push("write") },
    removeItem: async () => { events.push("remove") },
  }, "scope:service", { freezeAfterClear: true })
  const first = writer.write("first")
  const second = writer.write("second")
  await writer.clear()
  await Promise.all([first, second])
  expect(events).toEqual(["remove"])
})

test("write failure does not prevent discard, and failed discard is reported", async () => {
  let failRemove = true
  const writer = createMobileFormDraftWriter({
    setItem: async () => { throw new Error("write unavailable") },
    removeItem: async () => { if (failRemove) throw new Error("remove unavailable") },
  }, "scope:service", { freezeAfterClear: true })
  await expect(writer.write("draft")).rejects.toThrow("write unavailable")
  await expect(writer.clear()).rejects.toThrow("remove unavailable")
  expect(writer.canHydrate()).toBe(true)
  failRemove = false
  await writer.clear()
  expect(writer.canHydrate()).toBe(false)
})

test("a new editor lifetime can save without affecting another scope", async () => {
  const values = new Map<string, string>()
  const storage = {
    setItem: async (key: string, value: string) => { values.set(key, value) },
    removeItem: async (key: string) => { values.delete(key) },
  }
  const first = createMobileFormDraftWriter(storage, "tenant-a:procurement", { freezeAfterClear: true })
  const other = createMobileFormDraftWriter(storage, "tenant-b:procurement")
  await first.write("discard me")
  await other.write("retain me")
  await first.clear()
  const reopened = createMobileFormDraftWriter(storage, "tenant-a:procurement")
  await reopened.write("new edit")
  expect(values.get("tenant-a:procurement")).toBe("new edit")
  expect(values.get("tenant-b:procurement")).toBe("retain me")
})

test("persistent screens can save their next draft on the same writer after clear", async () => {
  const values = new Map<string, string>()
  const events: string[] = []
  const writer = createMobileFormDraftWriter({
    setItem: async (key, value) => { values.set(key, value); events.push(value) },
    removeItem: async (key) => { values.delete(key); events.push("clear") },
  }, "tenant:user:support")
  await writer.write("first draft")
  const clear = writer.clear()
  const nextWrite = writer.write("next draft")
  await Promise.all([clear, nextWrite])
  expect(events).toEqual(["first draft", "clear", "next draft"])
  expect(values.get(writer.key)).toBe("next draft")
  expect(writer.canHydrate()).toBe(true)
  await writer.clear()
  expect(values.has(writer.key)).toBe(false)
  await writer.write("third draft")
  expect(values.get(writer.key)).toBe("third draft")
})
