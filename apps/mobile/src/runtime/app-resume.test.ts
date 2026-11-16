import { describe, expect, test } from "bun:test"
import {
  ACCESS_RESUME_REFRESH_MS,
  createBackgroundResumeTracker,
  shouldRefreshAccessOnResume,
} from "./app-resume"

describe("background resume tracker", () => {
  test("counts only a background -> active return", () => {
    const isResume = createBackgroundResumeTracker("active")
    expect(isResume("inactive")).toBe(false)
    expect(isResume("active")).toBe(false)
    expect(isResume("background")).toBe(false)
    expect(isResume("active")).toBe(true)
    expect(isResume("active")).toBe(false)
  })

  test("iOS goes through inactive on the way back and still resumes once", () => {
    const isResume = createBackgroundResumeTracker("active")
    isResume("inactive")
    isResume("background")
    expect(isResume("inactive")).toBe(false)
    expect(isResume("active")).toBe(true)
  })

  test("a biometric or app-lock inactive flip is not a resume", () => {
    const isResume = createBackgroundResumeTracker("active")
    for (let index = 0; index < 5; index += 1) {
      expect(isResume("inactive")).toBe(false)
      expect(isResume("active")).toBe(false)
    }
  })

  test("a tracker created while backgrounded resumes on the first active", () => {
    const isResume = createBackgroundResumeTracker("background")
    expect(isResume("active")).toBe(true)
  })
})

describe("access refresh on resume", () => {
  const now = Date.parse("2026-11-16T10:00:00.000Z")

  test("skips a recent, healthy snapshot", () => {
    expect(
      shouldRefreshAccessOnResume({
        accessEndsAt: null,
        failed: false,
        lastCheckedAt: now - 60_000,
        now,
      })
    ).toBe(false)
  })

  test("refreshes after the window, after a failure, or with no check yet", () => {
    const base = { accessEndsAt: null, failed: false, now }
    expect(
      shouldRefreshAccessOnResume({
        ...base,
        lastCheckedAt: now - ACCESS_RESUME_REFRESH_MS,
      })
    ).toBe(true)
    expect(
      shouldRefreshAccessOnResume({
        ...base,
        failed: true,
        lastCheckedAt: now,
      })
    ).toBe(true)
    expect(shouldRefreshAccessOnResume({ ...base, lastCheckedAt: null })).toBe(
      true
    )
  })

  test("re-checks when the access end passed while backgrounded", () => {
    expect(
      shouldRefreshAccessOnResume({
        accessEndsAt: new Date(now - 1).toISOString(),
        failed: false,
        lastCheckedAt: now - 1_000,
        now,
      })
    ).toBe(true)
    expect(
      shouldRefreshAccessOnResume({
        accessEndsAt: new Date(now + 60_000).toISOString(),
        failed: false,
        lastCheckedAt: now - 1_000,
        now,
      })
    ).toBe(false)
  })
})
