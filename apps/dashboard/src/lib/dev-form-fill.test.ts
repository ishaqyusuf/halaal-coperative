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
      },
    )

    expect(values.email).toEndWith("@mubarak.qa.test")
  })
})
