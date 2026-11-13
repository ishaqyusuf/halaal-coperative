"use client"

import {
  createQaAddress,
  createQaAmount,
  createQaCode,
  createQaCooperative,
  createQaDigits,
  createQaOccupation,
  createQaPerson,
  createQaReference,
  pickQaValue,
  qaDateOffset,
  qaMonthLabel,
  qaToday,
} from "@halaalvest/utils"

/*
 * Dashboard Quick Fill recipes (dev and preview only; the QA gate lives in
 * `DashboardQuickFill`). Every identity comes from the shared generator in
 * @halaalvest/utils: Nigerian Muslim names, emails built only from the
 * person's name on the active QA Domain, and clock-based unique numbers and
 * references. Passwords, OTPs and approval decisions are never filled.
 */

type FieldValues = Record<string, unknown>

type DashboardFormReset<TFieldValues> = {
  getValues?: () => TFieldValues
  reset: (values?: TFieldValues) => void
}

type FillOptions = { emailDomain?: string }

function randomRecentDate(fromYear: number, toYear: number) {
  const year = fromYear + Math.floor(Math.random() * (toYear - fromYear + 1))
  const month = 1 + Math.floor(Math.random() * 12)
  const day = 1 + Math.floor(Math.random() * 28)
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  return value > qaToday() ? qaToday() : value
}

const memberTypes = ["individual", "civil_servant", "business"] as const

const chargeNames = [
  "Welfare Levy",
  "Development Levy",
  "Building Levy",
  "Education Support Levy",
  "Ramadan Support Levy",
  "Admin Charge",
  "Registration Fee",
  "Passbook Fee",
] as const

const loanPurposes = [
  "School fees for the new session",
  "Restocking a provisions shop",
  "Sewing machines for a tailoring business",
  "Farm inputs for the planting season",
  "Repairs to a commercial tricycle",
] as const

export function createDashboardDevFormFill(
  kind: DashboardDevFormKind,
  options?: FillOptions
) {
  const emailDomain = options?.emailDomain
  const today = qaToday()

  switch (kind) {
    case "member_create": {
      const person = createQaPerson({ emailDomain })
      return {
        address: createQaAddress(),
        email: person.email,
        fullName: person.fullName,
        joinedAt: randomRecentDate(2021, 2026),
        memberNumber: createQaDigits(6),
        memberType: pickQaValue(memberTypes),
        monthlyCommitment: createQaAmount(10_000, 50_000, 5_000),
        occupation: createQaOccupation(),
        phoneNumber: person.phoneNumber,
      }
    }
    case "member_signup": {
      const person = createQaPerson({ emailDomain })
      return {
        email: person.email,
        fullName: person.fullName,
        memberNumber: createQaDigits(6),
        phoneNumber: person.phoneNumber,
      }
    }
    case "role_assignment": {
      const person = createQaPerson({ emailDomain })
      return {
        email: person.email,
        fullName: person.fullName,
        makeDefault: true,
        role: "member",
      }
    }
    case "charge_definition": {
      const name = pickQaValue(chargeNames)
      const code = createQaCode(name.split(" ")[0]!.slice(0, 5))
      return {
        amount: createQaAmount(500, 5_000, 250),
        appliesToLoanRequests: false,
        appliesToLoans: false,
        appliesToMembers: true,
        code,
        effectiveFrom: today,
        isMonthlyLevy: true,
        kind: "fixed",
        // The name carries the unique code so repeat fills never clash.
        name: `${name} ${code.split("-")[1]}`,
      }
    }
    case "charge_application":
      return {
        assessedAt: today,
        notes: `${pickQaValue(chargeNames)} for ${qaMonthLabel()}.`,
      }
    case "contribution_plan":
      return {
        amount: createQaAmount(10_000, 50_000, 5_000),
        name: "Monthly commitment",
        startsAt: today,
      }
    case "cooperative_profile": {
      const cooperative = createQaCooperative({ emailDomain })
      return {
        city: cooperative.city,
        country: "Nigeria",
        currentSize: "250",
        memberNumberPrefix: `${cooperative.codePrefix.slice(0, 3)}-`,
        name: cooperative.name,
        officeAddress: cooperative.officeAddress,
        state: cooperative.state,
        timezone: "Africa/Lagos",
      }
    }
    case "custom_domain":
      return {
        hostname: `${createQaCooperative({ emailDomain }).slug}.example.org`,
      }
    case "loan_request":
      return {
        extraMonthlySavingsAmount: "5000",
        purpose: pickQaValue(loanPurposes),
        requestedAmount: createQaAmount(50_000, 300_000, 10_000),
        requestedTermMonths: pickQaValue(["6", "10", "12"] as const),
      }
    case "member_payment":
      return {
        channel: "transfer",
        committedSavingsAmount: "25000",
        extraLoanPaymentAmount: "5000",
        extraSavingsAmount: "5000",
        periodLabel: qaMonthLabel(),
        postedAt: today,
        reference: createQaReference("TRX"),
        scheduledLoanServicingAmount: "15000",
        totalAmount: "50000",
      }
    case "repayment_post":
      return {
        amount: "25000",
        reference: createQaReference("PMT"),
      }
    case "member_commitment":
      return {
        amount: createQaAmount(10_000, 50_000, 5_000),
        startsAt: today,
      }
    case "member_document":
      return {
        documentType: "National ID",
        documentUrl: `https://example.test/kyc/${createQaReference("DOC").toLowerCase()}.pdf`,
        reviewStatus: "pending",
      }
    case "signup_link":
      return {
        expiresAt: qaDateOffset(30),
        maxSignups: "50",
        name: `${qaMonthLabel()} member outreach ${createQaCode("").slice(1)}`,
        notes: "Shared with the cooperative WhatsApp group after Jumu'ah.",
      }
    case "trust_profile": {
      const person = createQaPerson({ emailDomain })
      return {
        backupRetentionNote:
          "Nightly encrypted backups kept for 35 days; restore tested each quarter.",
        dataProcessingUrl: "https://example.test/legal/data-processing",
        incidentContactEmail: person.email,
        incidentContactName: person.fullName,
        legalTermsUrl: "https://example.test/legal/terms",
        privacyPolicyUrl: "https://example.test/legal/privacy",
        recoveryPointObjective: "24 hours",
        recoveryTimeObjective: "8 hours",
      }
    }
    case "loan_product": {
      const code = createQaCode("LN")
      return {
        code,
        isActive: true,
        maxSavingsMultiple: "2",
        name: `Murabaha Facility ${code.split("-")[1]}`,
        termMonths: "12",
      }
    }
    case "member_baseline": {
      const person = createQaPerson({ emailDomain })
      return {
        address: createQaAddress(),
        email: person.email,
        fullName: person.fullName,
        occupation: createQaOccupation(),
        phoneNumber: person.phoneNumber,
      }
    }
  }
}

export type DashboardDevFormKind =
  | "charge_application"
  | "charge_definition"
  | "contribution_plan"
  | "cooperative_profile"
  | "custom_domain"
  | "loan_product"
  | "loan_request"
  | "member_baseline"
  | "member_commitment"
  | "member_create"
  | "member_document"
  | "member_payment"
  | "member_signup"
  | "repayment_post"
  | "role_assignment"
  | "signup_link"
  | "trust_profile"

export function getDashboardRandomDevFormFill<TFieldValues extends FieldValues>(
  kind: DashboardDevFormKind,
  options?: FillOptions
) {
  return createDashboardDevFormFill(kind, options) as unknown as TFieldValues
}

/**
 * Fills the form, keeping every field the recipe does not set (selected
 * sources, purposes, passwords) instead of wiping it.
 */
export function applyDashboardDevFormFill<TFieldValues extends FieldValues>(
  form: DashboardFormReset<TFieldValues>,
  kind: DashboardDevFormKind,
  overrides?: Partial<TFieldValues>,
  options?: FillOptions
) {
  form.reset({
    ...(form.getValues?.() ?? {}),
    ...getDashboardRandomDevFormFill(kind, options),
    ...overrides,
  } as unknown as TFieldValues)
}

export const applyDashboardRandomDevFormFill = applyDashboardDevFormFill

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * A Quick Fill CSV for an import kind. The member, collection-source and
 * loan-product imports get brand-new unique rows; the dependent imports keep
 * the template's member numbers (they need those members to exist) but get
 * unique references and codes so a rerun never collides.
 */
export function createQaImportCsv(
  kind: string,
  sampleCsv: string,
  options?: FillOptions
) {
  const [header = "", ...templateRows] = sampleCsv.split("\n")

  if (kind === "members") {
    const rows = templateRows.map((templateRow) => {
      const template = templateRow.split(",")
      const person = createQaPerson({ emailDomain: options?.emailDomain })
      const columns: Record<string, string> = {
        address: createQaAddress(),
        email: person.email,
        fullName: person.fullName,
        governmentIdNumber: `NIN-${createQaDigits(7)}`,
        memberNumber: createQaDigits(6),
        monthlyCommitment: createQaAmount(10_000, 50_000, 5_000),
        occupation: createQaOccupation(),
        openingSavingsBalance: createQaAmount(20_000, 250_000, 5_000),
        phoneNumber: person.phoneNumber,
      }
      return header
        .split(",")
        .map((name, index) => csvCell(columns[name] ?? template[index] ?? ""))
        .join(",")
    })
    return [header, ...rows].join("\n")
  }

  if (kind === "deduction_sources") {
    return [
      header,
      ...templateRows.map((row) => {
        const [, type = "bank_transfer"] = row.split(",")
        const code = createQaCode("SRC")
        return [
          `${createQaCooperative().city} Payroll Desk ${code.split("-")[1]}`,
          type,
          code,
        ].join(",")
      }),
    ].join("\n")
  }

  if (kind === "loan_products") {
    return [
      header,
      ...templateRows.map((row) => {
        const [, , loanType = "normal", termMonths = "12", multiple = "2"] =
          row.split(",")
        const code = createQaCode("LN")
        return [
          code,
          `Murabaha Facility ${code.split("-")[1]}`,
          loanType,
          termMonths,
          multiple,
        ].join(",")
      }),
    ].join("\n")
  }

  // Dependent imports: fresh references and charge codes on every fill.
  return [
    header,
    ...templateRows.map((row) =>
      row
        .replace(
          /\b(TRX|PAY|LEGACY-RPY)-[A-Z0-9-]+/g,
          (_match, prefix: string) => createQaReference(prefix)
        )
        .replace(/\b(LEVY|REG)-[A-Z]+\b/g, (_match, prefix: string) =>
          createQaCode(prefix)
        )
    ),
  ].join("\n")
}

const procurementItems = [
  {
    description: "Chest freezer for the family provisions shop.",
    name: "Deep freezer (300 litres)",
  },
  {
    description: "Industrial sewing machine for a tailoring workshop.",
    name: "Industrial sewing machine",
  },
  {
    description: "Grinding machine for a neighbourhood pepper mill.",
    name: "Grinding machine",
  },
  {
    description: "Solar inverter and batteries for the home office.",
    name: "Solar inverter set",
  },
  {
    description: "Tricycle for commercial passenger transport.",
    name: "Tricycle (Keke)",
  },
] as const

const procurementVendors = [
  "Barakah Electronics Ltd",
  "Al-Amin Motors",
  "Nur Home Appliances",
  "Albarka Solar Ventures",
  "Sabon Gari Traders",
] as const

/** A procurement request draft (the member is picked by the tester). */
export function createQaProcurementRequest() {
  const item = pickQaValue(procurementItems)
  return {
    itemDescription: item.description,
    itemName: item.name,
    requestedCost: createQaAmount(150_000, 600_000, 10_000),
    requestedRepaymentMonths: pickQaValue(["6", "10", "12"] as const),
    vendorName: pickQaValue(procurementVendors),
  }
}

/** A Foodstuff Purchase application draft. */
export function createQaFoodPurchaseRequest() {
  return {
    itemDescription: "Rice, beans, garri, palm oil and household staples.",
    notes: "Please include delivery with the cooperative bulk order.",
    requestedAmount: createQaAmount(60_000, 200_000, 5_000),
    requestedPaybackMonths: pickQaValue(["3", "4"] as const),
  }
}

const projectBusinesses = [
  {
    businessName: "Barakah Cold Room",
    description: "A cold-room service supporting fish and meat sellers.",
    purpose: "Buy solar storage and expand cold-room capacity.",
  },
  {
    businessName: "Albarka Poultry Farm",
    description: "A 2,000-bird layer farm supplying nearby markets.",
    purpose: "Add a second pen and a month of feed.",
  },
  {
    businessName: "Nur Halal Bakery",
    description: "A neighbourhood bakery supplying schools and shops.",
    purpose: "Replace the oven and add a delivery tricycle.",
  },
] as const

/** A project financing request draft. */
export function createQaProjectFinancingRequest() {
  const business = pickQaValue(projectBusinesses)
  return {
    ...business,
    requestedAmount: createQaAmount(500_000, 2_000_000, 50_000),
    requestedPaybackMonths: pickQaValue(["12", "18", "24"] as const),
  }
}

const supportCases = [
  {
    description:
      "My transfer went through but this month's contribution is not on my statement yet.",
    subject: "Contribution not on statement",
  },
  {
    description:
      "My share certificate shows fewer units than I paid for at the last meeting.",
    subject: "Share units look wrong",
  },
  {
    description:
      "I changed my phone number and need my contact details updated.",
    subject: "Update my phone number",
  },
] as const

/** A support case draft. */
export function createQaSupportCase() {
  return pickQaValue(supportCases)
}

export const qaSupportReply =
  "Thank you. We have checked the record and assigned it for completion; you will be notified once it is posted."
