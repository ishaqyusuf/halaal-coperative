import { describe, expect, test } from "bun:test"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { assertCompleteQaFormCoverage } from "@halaalvest/domain/qa-accelerator"
import { parseAdminFinancePositiveNumber } from "@/features/admin-finance-support/model/admin-finance-support-action"
import { normalizeQaDomainInput } from "@/features/auth/model/qa-access-chooser"
import {
  parseFoodPurchaseAmount,
  parseFoodPurchasePositiveInteger,
} from "@/features/food-purchase/model/member-food-purchase-presentation"
import { isValidDateOnly } from "@/lib/date-only"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "./mobile-dev-quick-fill"
import {
  mobileQaFormCoverage,
  mobileQaNonFormFieldSources,
  type MobileQaFormCoverage,
} from "./mobile-qa-form-coverage"

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")
const coverage: readonly MobileQaFormCoverage[] = mobileQaFormCoverage
const fieldPattern =
  /<(?:AuthField|BottomSheetTextInput|CalendarDateField|Input|OtpField|PasswordField|Textarea|TextInput)\b/

function read(source: string) {
  return readFileSync(join(mobileRoot, source), "utf8")
}

function collectSources(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return collectSources(path)
    return /\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry) ? [path] : []
  })
}

function discoverFieldSources() {
  return collectSources(join(mobileRoot, "src"))
    .filter((path) => fieldPattern.test(readFileSync(path, "utf8")))
    .map((path) => relative(mobileRoot, path))
    .sort()
}

const recipes = mobileDevQuickFill as Record<string, Record<string, string>>
const recipeValues = Object.entries(recipes).flatMap(([recipe, fields]) =>
  Object.entries(fields).map(([field, value]) => ({ field, recipe, value }))
)

describe("mobile QA form coverage", () => {
  test("declares every form exactly once", () => {
    const formIds = coverage.map((entry) => entry.formId)
    expect(() =>
      assertCompleteQaFormCoverage({ coverage, formIds })
    ).not.toThrow()
    for (const entry of coverage) {
      expect(entry.formId).toMatch(/^mobile\.[a-z-]+\.[a-z-]+$/)
      if (entry.kind === "recipe") expect(entry.recipe).toBeDefined()
      else expect(entry.reason.length).toBeGreaterThan(10)
    }
  })

  test("points every declaration at existing source files", () => {
    const sources = [
      ...coverage.flatMap((entry) => entry.sources),
      ...mobileQaNonFormFieldSources.map((entry) => entry.source),
    ]
    for (const source of sources) {
      expect(existsSync(join(mobileRoot, source))).toBe(true)
    }
  })

  test("classifies every field-bearing mobile source", () => {
    const classified = new Set([
      ...coverage.flatMap((entry) => entry.sources),
      ...mobileQaNonFormFieldSources.map((entry) => entry.source),
    ])
    const unclassified = discoverFieldSources().filter(
      (source) => !classified.has(source)
    )
    expect(unclassified).toEqual([])
  })

  test("renders a reachable Quick Fill control for every recipe", () => {
    for (const entry of coverage) {
      if (entry.kind !== "recipe") continue
      const source = entry.sources.map(read).join("\n")
      expect(source).toContain("<DevQuickFill")
      expect(source).toMatch(
        new RegExp(`mobileDevQuickFill\\s*\\.\\s*${entry.recipe}\\b`)
      )
    }
  })

  test("leaves no recipe group without a declared form", () => {
    const used = new Set(coverage.map((entry) => entry.recipe))
    expect(Object.keys(recipes).filter((key) => !used.has(key))).toEqual([])
  })
})

describe("mobile Quick Fill exclusions", () => {
  test("recipes never carry passwords, codes, PINs, or payment credentials", () => {
    const secretField =
      /password|passcode|\bpin\b|^pin|otp|^code$|cvv|card|iban|accountnumber|bvn|^nin$|secret|token/i
    expect(
      recipeValues
        .filter(({ field }) => secretField.test(field))
        .map(({ field, recipe }) => `${recipe}.${field}`)
    ).toEqual([])
  })

  test("excluded forms render no Quick Fill of their own", () => {
    for (const source of [
      "src/features/app-lock/screens/app-lock-screen.tsx",
      "src/features/auth/components/qa-domain-composer.tsx",
      "src/features/auth/components/sign-in-form.tsx",
      "src/features/auth/components/password-field.tsx",
      "src/features/auth/components/otp-field.tsx",
    ]) {
      expect(read(source)).not.toContain("DevQuickFill")
    }
  })

  test("recovery Quick Fill stays on the identity step", () => {
    const source = read("src/features/auth/screens/recovery-screen.tsx")
    const quickFill = source.match(/function quickFill\(\) \{[\s\S]*?\n {2}\}/)
    expect(quickFill?.[0]).toBeDefined()
    expect(quickFill?.[0]).not.toMatch(/setCode|setPassword|setConfirmPassword/)
    expect(source).toMatch(/step === "request" \? \(\s*<DevQuickFill/)
  })

  test("recovery never prefills the OTP from a non-production devCode", () => {
    const source = read("src/features/auth/screens/recovery-screen.tsx")
    expect(source).not.toMatch(/response\.devCode/)
  })
})

describe("mobile Quick Fill values", () => {
  test("uses exact QA Domain emails and synthetic contact data", () => {
    for (const { field, recipe, value } of recipeValues) {
      expect(value.trim()).toBe(value)
      expect(value.length).toBeGreaterThan(0)
      expect(value).not.toMatch(/example\.(com|net|org)/i)
      if (/email/i.test(field)) {
        const [local, domain] = value.split("@")
        expect(local?.length, `${recipe}.${field}`).toBeGreaterThan(0)
        expect(normalizeQaDomainInput(domain ?? "")).toBe(domain!)
        expect(domain).toMatch(/\.qa\.test$/)
      }
      if (/phone/i.test(field)) expect(value).toMatch(/^\+234\d{10}$/)
      if (/Url$/.test(field)) {
        expect(new URL(value).hostname).toMatch(/\.test$/)
      }
    }
  })

  test("fills valid dates, amounts, terms, and references", () => {
    for (const { field, recipe, value } of recipeValues) {
      const label = `${recipe}.${field}`
      if (/(At|Date)$/.test(field)) {
        expect(isValidDateOnly(value), label).toBe(true)
      }
      if (/(Amount|Cost|Payoff|Savings)$/.test(field)) {
        const amount = Number(value)
        expect(Number.isFinite(amount), label).toBe(true)
        expect(amount, label).toBeGreaterThanOrEqual(0)
        if (!/^extra/.test(field)) expect(amount, label).toBeGreaterThan(0)
      }
      if (/(Months|Units)$/.test(field)) {
        expect(Number.isInteger(Number(value)), label).toBe(true)
        expect(Number(value), label).toBeGreaterThan(0)
        expect(Number(value), label).toBeLessThanOrEqual(60)
      }
      if (/(Reference|memberNumber|cooperativeNumber)$/i.test(field)) {
        expect(value, label).toMatch(/^[A-Z0-9-]+$/)
      }
      if (/(note|notes|reason|description|reply|purpose)$/i.test(field)) {
        // Server-side evidence checks require at least two characters.
        expect(value.length, label).toBeGreaterThanOrEqual(10)
      }
    }
    expect(mobileDevQuickFillReference("QA-PO")).toMatch(/^QA-PO-\d{6}$/)
  })

  test("passes the feature parsers the forms validate with", () => {
    const { foodPurchase, receipt } = mobileDevQuickFill
    expect(parseFoodPurchaseAmount(foodPurchase.requestedAmount)).toBe(180000)
    expect(
      parseFoodPurchasePositiveInteger(foodPurchase.requestedPaybackMonths)
    ).toBe(3)
    expect(Number(receipt.allocationAmount)).toBe(Number(receipt.totalAmount))
    for (const value of [
      mobileDevQuickFill.adminFoodPurchaseOperations.releasedAmount,
      mobileDevQuickFill.adminRepaymentOperations.repaymentAmount,
      mobileDevQuickFill.adminCharges.basisAmount,
      mobileDevQuickFill.adminContributions.rowAmount,
    ]) {
      expect(parseAdminFinancePositiveNumber(value)).toBe(Number(value))
    }
    const accounting = mobileDevQuickFill.adminFoodPurchaseOperations
    expect(Number(accounting.salesAmount)).toBeGreaterThan(
      Number(accounting.purchaseCostAmount) + Number(accounting.expenseAmount)
    )
  })
})
