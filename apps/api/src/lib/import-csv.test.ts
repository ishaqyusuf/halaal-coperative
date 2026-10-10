import { describe, expect, test } from "bun:test"
import {
  dashboardImportConfigs,
  getDashboardImportIdentityKeys,
  parseDashboardImportCsv,
} from "./import-csv"

describe("dashboard import API CSV parser", () => {
  test("keeps normalized loan-product codes in the server payload", () => {
    const parsed = parseDashboardImportCsv("loan_products", [
      "code,name,loanType,termMonths,maxSavingsMultiple",
      "emg,Emergency Support,quick,6,1",
    ].join("\n"))

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
    const invalid = parseDashboardImportCsv("loan_products", [
      "code,name,loanType,termMonths,maxSavingsMultiple",
      "BAD,Invalid Product,normal,-1,0",
    ].join("\n"))

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
})
