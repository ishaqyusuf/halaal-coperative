import { describe, expect, test } from "bun:test"
import {
  createQaPreviewFlashValue,
  parseQaPreviewFlashValue,
} from "./qa-preview-flash"

const previews = [
  {
    artifacts: [
      {
        kind: "link" as const,
        label: "Continue",
        value: "https://example.test/setup?token=secret",
      },
    ],
    deliveryStatus: "sent" as const,
    id: "message-1",
    notificationType: "signup.verification",
    recipient: "admin@ishaq.qa.test",
  },
]

describe("QA preview flash", () => {
  test("round-trips signed request-time previews", () => {
    const value = createQaPreviewFlashValue(previews, {
      now: new Date("2026-07-24T10:00:00.000Z"),
      secret: "test-secret",
    })

    expect(
      parseQaPreviewFlashValue(value, {
        now: new Date("2026-07-24T10:00:30.000Z"),
        secret: "test-secret",
      }),
    ).toEqual(previews)
  })

  test("rejects tampered and expired preview values", () => {
    const value = createQaPreviewFlashValue(previews, {
      now: new Date("2026-07-24T10:00:00.000Z"),
      secret: "test-secret",
    })

    expect(
      parseQaPreviewFlashValue(`${value}x`, {
        now: new Date("2026-07-24T10:00:30.000Z"),
        secret: "test-secret",
      }),
    ).toEqual([])
    expect(
      parseQaPreviewFlashValue(value, {
        now: new Date("2026-07-24T10:02:00.000Z"),
        secret: "test-secret",
      }),
    ).toEqual([])
  })
})
