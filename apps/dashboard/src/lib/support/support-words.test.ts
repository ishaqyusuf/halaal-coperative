import { describe, expect, test } from "bun:test"
import {
  getSupportCaseState,
  supportSubjectFromMessage,
  supportTopicOptions,
} from "./support-words"

describe("support words", () => {
  test("staff see Needs reply until they answer", () => {
    expect(
      getSupportCaseState({ lastAuthor: "member", status: "open" }, "staff")
    ).toMatchObject({ isYourTurn: true, label: "Needs reply" })
    expect(
      getSupportCaseState({ lastAuthor: null, status: "in_progress" }, "staff")
    ).toMatchObject({ label: "Needs reply" })
    expect(
      getSupportCaseState({ lastAuthor: "staff", status: "open" }, "staff")
    ).toMatchObject({ isYourTurn: false, label: "Replied" })
    expect(
      getSupportCaseState(
        { lastAuthor: "staff", status: "waiting_on_member" },
        "staff"
      ).label
    ).toBe("Waiting for member")
  })

  test("members see Answered once staff reply", () => {
    expect(
      getSupportCaseState({ lastAuthor: "member", status: "open" }, "member")
        .label
    ).toBe("Sent")
    expect(
      getSupportCaseState({ lastAuthor: "system", status: "open" }, "member")
        .label
    ).toBe("Sent")
    expect(
      getSupportCaseState({ lastAuthor: "staff", status: "open" }, "member")
    ).toMatchObject({ label: "Answered", tone: "good" })
    expect(
      getSupportCaseState(
        { lastAuthor: "staff", status: "waiting_on_member" },
        "member"
      )
    ).toMatchObject({ isYourTurn: true, label: "Your reply needed" })
  })

  test("finished cases read the same for everyone", () => {
    for (const viewer of ["member", "staff"] as const) {
      expect(
        getSupportCaseState({ lastAuthor: "member", status: "resolved" }, viewer)
          .label
      ).toBe("Solved")
      expect(
        getSupportCaseState({ lastAuthor: "staff", status: "closed" }, viewer)
          .label
      ).toBe("Closed")
    }
  })

  test("a subject comes from the first line of the message", () => {
    expect(supportSubjectFromMessage("My August payment is missing", "payment_issue")).toBe(
      "My August payment is missing"
    )
    expect(supportSubjectFromMessage("   ", "technical")).toBe("Using the app")
    const long = supportSubjectFromMessage(
      "I paid my contribution in August through the bank but the dashboard still shows that I owe it",
      "payment_issue"
    )
    expect(long.length).toBeLessThanOrEqual(81)
    expect(long.endsWith("…")).toBe(true)
  })

  test("every topic has one plain label", () => {
    expect(supportTopicOptions).toHaveLength(8)
    expect(new Set(supportTopicOptions.map((o) => o.label)).size).toBe(8)
  })
})
