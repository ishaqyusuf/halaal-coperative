import { describe, expect, test } from "bun:test"
import { getDashboardRandomDevFormFill } from "./dev-form-fill"

describe("dashboard QA quick fill", () => {
  test("uses the active tester domain for member identities", () => {
    const values = getDashboardRandomDevFormFill<{
      email: string
      fullName: string
    }>("member_create", {
      emailDomain: "ishaq.qa.test",
    })

    expect(values.email).toEndWith("@ishaq.qa.test")
    expect(values.fullName.length).toBeGreaterThan(0)
  })

  test("uses the active tester domain for role assignments", () => {
    const values = getDashboardRandomDevFormFill<{ email: string }>(
      "role_assignment",
      {
        emailDomain: "mubarak.qa.test",
      }
    )

    expect(values.email).toEndWith("@mubarak.qa.test")
  })

  test("keeps live charge recipes inside the current accounting day", () => {
    const today = new Date().toISOString().slice(0, 10)

    const definition = getDashboardRandomDevFormFill<{
      effectiveFrom: string
    }>("charge_definition")
    const application = getDashboardRandomDevFormFill<{
      assessedAt: string
    }>("charge_application")

    expect(definition.effectiveFrom).toBe(today)
    expect(application.assessedAt).toBe(today)
  })

  test("keeps live contribution recipes inside the current accounting period", () => {
    const today = new Date().toISOString().slice(0, 10)
    const periodLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date())

    const plan = getDashboardRandomDevFormFill<{ startsAt: string }>(
      "contribution_plan"
    )
    const payment = getDashboardRandomDevFormFill<{
      periodLabel: string
      postedAt: string
    }>("member_payment")

    expect(plan.startsAt).toBe(today)
    expect(payment.postedAt).toBe(today)
    expect(payment.periodLabel).toBe(periodLabel)
  })
})
