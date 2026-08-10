import { describe, expect, test } from "bun:test"
import {
  dashboardImportConfigs,
  parseDashboardImportCsv,
  parseDashboardImportGrid,
  serializeDashboardImportGrid,
} from "./import-csv"

describe("dashboard CSV imports", () => {
  test("preserves collection-source external references from camel-case headers", () => {
    const parsed = parseDashboardImportCsv("deduction_sources", [
      "name,type,externalReference",
      "Kaduna Payroll Desk,ministry_payroll,KD-PAY-01",
    ].join("\n"))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.rows[0]).toMatchObject({
      externalReference: "KD-PAY-01",
      name: "Kaduna Payroll Desk",
      type: "ministry_payroll",
    })
  })

  test("parses member opening savings and KYC fields from common headers", () => {
    const parsed = parseDashboardImportCsv("members", [
      "member_number,full_name,member_type,joined_at,status,opening_savings_balance,email,phone_number,address,occupation,kyc_status,government_id_number,kyc_document_type,kyc_review_notes",
      "MBR-001,Aisha Bello,individual,2025-01-01,active,25000,aisha@example.com,+2348010001001,Kaduna,Trader,verified,NIN-001,national_id,Imported file",
    ].join("\n"))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.rows[0]).toMatchObject({
      fullName: "Aisha Bello",
      address: "Kaduna",
      email: "aisha@example.com",
      governmentIdNumber: "NIN-001",
      kycDocumentType: "national_id",
      kycReviewNotes: "Imported file",
      kycStatus: "verified",
      memberNumber: "MBR-001",
      occupation: "Trader",
      openingSavingsBalance: 25000,
      phoneNumber: "+2348010001001",
    })
  })

  test("parses loan migration monthly repayment amount", () => {
    const parsed = parseDashboardImportCsv("loan_migrations", [
      "member_number,loan_product_name,loan_type,principal_amount,outstanding_principal,term_months,monthly_repayment_pay,requested_at,status,first_repayment_due_at,savings_during_loan",
      "MBR-001,Legacy Loan,normal,120000,60000,12,15000,2025-01-01,active,2025-02-01,5000",
    ].join("\n"))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.rows[0]).toMatchObject({
      extraMonthlySavingsAmount: 5000,
      loanProductName: "Legacy Loan",
      memberNumber: "MBR-001",
      monthlyRepaymentAmount: 15000,
      outstandingPrincipal: 60000,
      principalAmount: 120000,
      termMonths: 12,
    })
  })

  test("loan migration template uses operator-facing repayment and saving headers", () => {
    const [header] = dashboardImportConfigs.loan_migrations.sampleCsv.split("\n")

    expect(header).toContain("monthly_repayment_pay")
    expect(header).toContain("savings_during_loan")
    expect(header).not.toContain("monthlyRepaymentAmount")
    expect(header).not.toContain("savingsDuringLoan")
  })

  test("parses loan product codes and exposes them in the template", () => {
    const [header] = dashboardImportConfigs.loan_products.sampleCsv.split("\n")
    const parsed = parseDashboardImportCsv("loan_products", [
      "code,name,loan_type,term_months,max_savings_multiple",
      "EMG,Emergency Support,quick,6,1",
    ].join("\n"))

    expect(header).toContain("code")
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.rows[0]).toMatchObject({
      code: "EMG",
      loanType: "quick",
      maxSavingsMultiple: 1,
      name: "Emergency Support",
      termMonths: 6,
    })
  })

  test("parses editable member import grid with canonical template columns", () => {
    const grid = parseDashboardImportGrid(
      "members",
      [
        "member_number,full_name,member_type,joined_at,status",
        "MBR-001,Aisha Bello,individual,2025-01-01,active",
      ].join("\n")
    )

    expect(grid.headers).toContain("memberNumber")
    expect(grid.headers).toContain("fullName")
    expect(grid.headers).toContain("openingSavingsBalance")
    expect(grid.rows[0]).toMatchObject({
      fullName: "Aisha Bello",
      joinedAt: "2025-01-01",
      memberNumber: "MBR-001",
    })
  })

  test("serializes editable grid rows and omits blank trailing rows", () => {
    const csvText = serializeDashboardImportGrid(
      ["memberNumber", "fullName", "kycReviewNotes"],
      [
        {
          fullName: "Aisha Bello",
          kycReviewNotes: "Reviewed, imported",
          memberNumber: "MBR-001",
        },
        {
          fullName: "",
          kycReviewNotes: "",
          memberNumber: "",
        },
      ]
    )

    expect(csvText).toBe(
      [
        "memberNumber,fullName,kycReviewNotes",
        'MBR-001,Aisha Bello,"Reviewed, imported"',
      ].join("\n")
    )
  })
})
