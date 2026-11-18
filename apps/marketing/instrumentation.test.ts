import { describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"

// Next.js only runs instrumentation placed beside the `app` directory.
describe("marketing instrumentation", () => {
  it("sits beside the app directory so Next.js runs it", () => {
    const appRoot = existsSync(join(import.meta.dir, "src", "app"))
      ? join(import.meta.dir, "src")
      : import.meta.dir
    expect(existsSync(join(appRoot, "app"))).toBe(true)
    expect(existsSync(join(appRoot, "instrumentation.ts"))).toBe(true)
  })
})
