import { describe, expect, test } from "bun:test"
import {
  canonicalizeDashboardImportCsv,
  dashboardImportConfigs,
  getDashboardImportIdentityKeys,
  MAX_IMPORT_ROWS,
  parseDashboardImportCsv,
} from "./import-csv"

describe("dashboard import API CSV parser", () => {
  test("keeps normalized loan-product codes in the server payload", () => {
    const parsed = parseDashboardImportCsv(
      "loan_products",
      [
        "code,name,loanType,termMonths,maxSavingsMultiple",
        "emg,Emergency Support,quick,6,1",
      ].join("\n")
    )

    expect(dashboardImportConfigs.loan_products.sampleCsv).toContain(
      "code,name,loanType,termMonths,maxSavingsMultiple"
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.rows[0]).toMatchObject({
      code: "EMG",
      loanType: "quick",
      maxSavingsMultiple: 1,
      name: "Emergency Support",
      termMonths: 6,
    })
  })

  test("rejects unsafe policy values and identifies duplicate names or codes", () => {
    const invalid = parseDashboardImportCsv(
      "loan_products",
      [
        "code,name,loanType,termMonths,maxSavingsMultiple",
        "BAD,Invalid Product,normal,-1,0",
      ].join("\n")
    )

    expect(invalid.ok).toBe(false)
    expect(invalid.errors.join(" ")).toContain(
      "termMonths must be a positive whole number"
    )
    expect(invalid.errors.join(" ")).toContain(
      "maxSavingsMultiple must be greater than zero"
    )
    expect(
      getDashboardImportIdentityKeys("loan_products", {
        code: "emg",
        name: "Emergency Support",
      })
    ).toEqual(["name:emergency support", "code:EMG"])
  })

  test("reads every template, including the contributions postedAt column", () => {
    for (const [kind, config] of Object.entries(dashboardImportConfigs)) {
      const parsed = parseDashboardImportCsv(
        kind as keyof typeof dashboardImportConfigs,
        config.sampleCsv
      )
      expect({ kind, ok: parsed.ok }).toEqual({ kind, ok: true })
    }
  })

  test("gives the same canonical text for the same file sent differently", () => {
    const original = [
      "memberNumber,amount,channel,postedAt,reference",
      "MEM-1,1000,cash,2025-03-01,R1",
      "",
    ].join("\n")
    const resent = [
      "Reference , Posted At,MemberNumber,AMOUNT,channel",
      " R1 ,2025-03-01, MEM-1 ,1000,cash",
    ].join("\r\n")

    expect(canonicalizeDashboardImportCsv("contributions", resent)).toBe(
      canonicalizeDashboardImportCsv("contributions", original)
    )
    expect(canonicalizeDashboardImportCsv("contributions", original)).toBe(
      "memberNumber,amount,channel,postedAt,reference\nMEM-1,1000,cash,2025-03-01,R1"
    )
  })

  test("refuses files over the row limit", () => {
    const rows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      (_, index) => `MEM-${index},1000,cash,2025-03-01`
    )
    const parsed = parseDashboardImportCsv(
      "contributions",
      ["memberNumber,amount,channel,postedAt", ...rows].join("\n")
    )

    expect(parsed.ok).toBe(false)
    expect(parsed.errors[0]).toContain("Add at most 5,000")
  })

  test("treats repeated member numbers on money rows as different payments", () => {
    const march = getDashboardImportIdentityKeys("contributions", {
      amount: 1000,
      memberNumber: "MEM-1",
      postedAt: new Date("2025-03-01T00:00:00.000Z"),
    })
    const april = getDashboardImportIdentityKeys("contributions", {
      amount: 1000,
      memberNumber: "MEM-1",
      postedAt: new Date("2025-04-01T00:00:00.000Z"),
    })

    expect(march).not.toEqual(april)
    expect(
      getDashboardImportIdentityKeys("members", { memberNumber: "MEM-1" })
    ).toEqual(["primary:MEM-1"])
  })
})
