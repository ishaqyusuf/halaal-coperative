import { describe, expect, test } from "bun:test"
import {
  applyDashboardDevFormFill,
  createQaImportCsv,
  getDashboardRandomDevFormFill,
} from "./dev-form-fill"
import { dashboardImportConfigs } from "./import-csv"

const today = () => new Date().toISOString().slice(0, 10)
const nameEmail = (domain: string) =>
  new RegExp(`^[a-z]+(\\.[a-z]+)*@${domain.replaceAll(".", "\\.")}$`)

describe("dashboard QA quick fill", () => {
  test("member identities use a name-based email on the tester domain", () => {
    const values = getDashboardRandomDevFormFill<{
      email: string
      fullName: string
      memberNumber: string
      phoneNumber: string
    }>("member_create", { emailDomain: "ishaq.qa.test" })

    expect(values.email).toMatch(nameEmail("ishaq.qa.test"))
    expect(values.fullName.split(" ").length).toBeGreaterThanOrEqual(2)
    expect(values.fullName).not.toContain("QA")
    expect(values.memberNumber).toMatch(/^\d{6}$/)
    expect(values.phoneNumber).toMatch(/^\+234\d{10}$/)
  })

  test("member, signup and role identities never repeat", () => {
    const seen = new Set<string>()
    for (const kind of [
      "member_create",
      "member_signup",
      "role_assignment",
    ] as const) {
      for (let index = 0; index < 40; index += 1) {
        const values = getDashboardRandomDevFormFill<{
          email: string
          fullName: string
        }>(kind, { emailDomain: "mubarak.qa.test" })
        expect(values.email).toMatch(nameEmail("mubarak.qa.test"))
        expect(seen.has(values.email)).toBe(false)
        expect(seen.has(values.fullName)).toBe(false)
        seen.add(values.email)
        seen.add(values.fullName)
      }
    }
  })

  test("references and charge codes are unique per fill", () => {
    const references = new Set<string>()
    const names = new Set<string>()
    for (let index = 0; index < 50; index += 1) {
      references.add(
        getDashboardRandomDevFormFill<{ reference: string }>("member_payment")
          .reference
      )
      references.add(
        getDashboardRandomDevFormFill<{ reference: string }>("repayment_post")
          .reference
      )
      names.add(
        getDashboardRandomDevFormFill<{ name: string }>("charge_definition")
          .name
      )
    }
    expect(references.size).toBe(100)
    expect(names.size).toBe(50)
  })

  test("keeps live charge and contribution recipes on the current day", () => {
    expect(
      getDashboardRandomDevFormFill<{ effectiveFrom: string }>(
        "charge_definition"
      ).effectiveFrom
    ).toBe(today())
    expect(
      getDashboardRandomDevFormFill<{ assessedAt: string }>(
        "charge_application"
      ).assessedAt
    ).toBe(today())
    expect(
      getDashboardRandomDevFormFill<{ startsAt: string }>("contribution_plan")
        .startsAt
    ).toBe(today())
    expect(
      getDashboardRandomDevFormFill<{ postedAt: string }>("member_payment")
        .postedAt
    ).toBe(today())
  })

  test("keeps fields the recipe does not set instead of wiping them", () => {
    let current: Record<string, unknown> = {
      confirmPassword: "typed-by-tester",
      deductionSourceId: "source-1",
      password: "typed-by-tester",
    }
    applyDashboardDevFormFill(
      {
        getValues: () => current,
        reset: (values) => {
          current = values ?? {}
        },
      },
      "member_signup",
      undefined,
      { emailDomain: "ishaq.qa.test" }
    )
    expect(current.deductionSourceId).toBe("source-1")
    expect(current.password).toBe("typed-by-tester")
    expect(current.email).toMatch(nameEmail("ishaq.qa.test"))
  })

  test("never fills passwords", () => {
    for (const kind of [
      "member_create",
      "member_signup",
      "role_assignment",
      "trust_profile",
    ] as const) {
      const values = getDashboardRandomDevFormFill<Record<string, unknown>>(
        kind,
        { emailDomain: "ishaq.qa.test" }
      )
      expect(Object.keys(values).join(",")).not.toMatch(/password/i)
    }
  })

  test("member import CSV has unique, name-based rows matching the template", () => {
    const config = dashboardImportConfigs.members
    const first = createQaImportCsv("members", config.sampleCsv, {
      emailDomain: "ishaq.qa.test",
    })
    const second = createQaImportCsv("members", config.sampleCsv, {
      emailDomain: "ishaq.qa.test",
    })
    const [header, ...rows] = first.split("\n")
    expect(header).toBe(config.sampleCsv.split("\n")[0])
    expect(rows).toHaveLength(2)
    expect(first).not.toContain("example.com")
    expect(first).not.toContain("MEM-1001")
    const emailIndex = header!.split(",").indexOf("email")
    for (const row of rows) {
      expect(row.split(",")[emailIndex]).toMatch(nameEmail("ishaq.qa.test"))
    }
    expect(second.split("\n")[1]).not.toBe(rows[0])
  })

  test("dependent import CSVs get fresh references", () => {
    const config = dashboardImportConfigs.contributions
    const csv = createQaImportCsv("contributions", config.sampleCsv)
    expect(csv).not.toContain("TRX-APR-001")
    expect(csv).toMatch(/TRX-\d{8}-[0-9A-Z]{6}/)
  })
})
