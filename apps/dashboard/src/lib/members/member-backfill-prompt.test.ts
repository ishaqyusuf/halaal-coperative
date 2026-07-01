import { describe, expect, test } from "bun:test"
import { shouldPromptMemberBackfill } from "./member-backfill-prompt"

describe("shouldPromptMemberBackfill", () => {
  const now = new Date("2026-06-30T12:00:00.000Z")

  test("prompts when the joined date is before the current calendar month", () => {
    expect(shouldPromptMemberBackfill("2026-05-31", now)).toBe(true)
    expect(shouldPromptMemberBackfill("2025-12-01T00:00:00.000Z", now)).toBe(
      true
    )
  })

  test("does not prompt when the joined date is in the current month", () => {
    expect(shouldPromptMemberBackfill("2026-06-01", now)).toBe(false)
    expect(shouldPromptMemberBackfill("2026-06-30T00:00:00.000Z", now)).toBe(
      false
    )
  })

  test("does not prompt when the joined date cannot be read", () => {
    expect(shouldPromptMemberBackfill("", now)).toBe(false)
    expect(shouldPromptMemberBackfill("not-a-date", now)).toBe(false)
  })
})
