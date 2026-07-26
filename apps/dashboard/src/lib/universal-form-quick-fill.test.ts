import { describe, expect, test } from "bun:test"
import { getGenericQuickFillValue } from "./universal-form-quick-fill"

describe("generic dashboard quick fill values", () => {
  test("uses the active QA domain for email fields", () => {
    expect(
      getGenericQuickFillValue({
        emailDomain: "ishaq.qa.test",
        name: "incidentContactEmail",
        type: "email",
      }),
    ).toEndWith("@ishaq.qa.test")
  })

  test("uses safe reusable passwords for password confirmation forms", () => {
    expect(
      getGenericQuickFillValue({
        emailDomain: "ishaq.qa.test",
        name: "confirmPassword",
        type: "password",
      }),
    ).toBe("password123")
  })

  test("creates external-looking reserved evidence URLs", () => {
    expect(
      getGenericQuickFillValue({
        emailDomain: "ishaq.qa.test",
        name: "proofDocumentUrl",
        type: "url",
      }),
    ).toBe("https://example.test/qa-evidence")
  })
})
