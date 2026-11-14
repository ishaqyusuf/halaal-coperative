import { describe, expect, test } from "bun:test"
import {
  activityAreas,
  getActivityActionLabel,
  getActivityActorFallback,
  getActivityArea,
  getActivityAreaActionPrefixes,
  getActivityEntityLabel,
} from "./activity-words"

describe("activity words", () => {
  test("uses plain sentences for common actions", () => {
    expect(getActivityActionLabel("charge.applied")).toBe("Charge added")
    expect(getActivityActionLabel("loan_request.rejected")).toBe(
      "Loan request declined"
    )
    expect(getActivityActionLabel("notification.email_failed")).toBe(
      "Email failed to send"
    )
  })

  test("builds a readable fallback for actions without a sentence", () => {
    expect(getActivityActionLabel("widget_order.created")).toBe(
      "Widget order added"
    )
    expect(getActivityActionLabel("migration.some_step.updated")).toBe(
      "Setup some step changed"
    )
    expect(getActivityActionLabel("plainaction")).toBe("Plainaction")
  })

  test("names records and actors without code words", () => {
    expect(getActivityEntityLabel("ChargeApplication")).toBe("Charge")
    expect(getActivityEntityLabel("SomeNewThing")).toBe("Some new thing")
    expect(getActivityActorFallback("system")).toBe("System")
    expect(getActivityActorFallback("integration")).toBe("Connected service")
  })

  test("puts each action in one area, matched on the whole prefix", () => {
    expect(getActivityArea("member.created")).toBe("members")
    expect(getActivityArea("member_payment.recorded")).toBe("money")
    expect(getActivityArea("member_share_application.approved")).toBe("shares")
    expect(getActivityArea("mobile.session.created")).toBe("access")
    expect(getActivityArea("unknown.thing")).toBe("setup")
    expect(getActivityAreaActionPrefixes("members")).toContain("member.")
    expect(getActivityAreaActionPrefixes("members")).not.toContain(
      "member_payment."
    )
    expect(activityAreas).toHaveLength(8)
  })
})
