import { describe, expect, test } from "bun:test"
import {
  projectBootstrapPresentation,
  resolveBootstrapPreviewMode,
} from "./bootstrap-presentation"

describe("bootstrap presentation", () => {
  test("keeps hydration concise and free of tenant or role data", () => {
    expect(projectBootstrapPresentation({ mode: "loading" })).toEqual({
      actionLabel: null,
      description: "Preparing your workspace and verifying cooperative access.",
      note: "Your saved session stays locked until the server confirms your access.",
      title: "HalaalVest",
    })
  })

  test("explains fail-closed recovery without promoting cached access", () => {
    expect(projectBootstrapPresentation({ mode: "fatal" })).toEqual({
      actionLabel: "Try again",
      description:
        "Check your connection, then try again. Your saved session has not been opened.",
      note: "No financial or staff action can continue until access is verified.",
      title: "We couldn’t verify your workspace",
    })
  })

  test("makes duplicate retry visibly unavailable", () => {
    expect(
      projectBootstrapPresentation({ mode: "fatal", retrying: true })
        .actionLabel
    ).toBe("Retrying")
  })

  test("allows deterministic previews only in development", () => {
    expect(resolveBootstrapPreviewMode("loading", true)).toBe("loading")
    expect(resolveBootstrapPreviewMode("fatal", true)).toBe("fatal")
    expect(resolveBootstrapPreviewMode("fatal", false)).toBeNull()
    expect(resolveBootstrapPreviewMode("other", true)).toBeNull()
  })
})
