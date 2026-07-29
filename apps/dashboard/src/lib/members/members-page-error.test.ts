import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function readMembersErrorBoundary() {
  return readFileSync(
    new URL("../../app/(app)/(sidebar)/members/error.tsx", import.meta.url),
    "utf8"
  )
}

describe("members page error boundary", () => {
  test("keeps unexpected member-directory failures inside a retryable route boundary", () => {
    const boundary = readMembersErrorBoundary()

    expect(boundary).toContain('"use client"')
    expect(boundary).toContain("reset")
    expect(boundary).toContain("Try again")
    expect(boundary).toContain("member directory")
    expect(boundary).not.toContain("error.message")
    expect(boundary).not.toContain("error.stack")
  })
})
