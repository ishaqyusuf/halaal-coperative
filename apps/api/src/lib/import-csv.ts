import { z } from "zod"

export type DashboardImportKind =
  | "members"
  | "deduction_sources"
  | "loan_products"
  | "contributions"
  | "charges"
  | "loan_migrations"
  | "repayment_migrations"

export type DashboardImportReferenceData = {
  chargeDefinitionCodes: string[]
  deductionSourceNames: string[]
  loanProductNames: string[]
  memberNumbers: string[]
}

type CsvRecord = Record<string, string>

type ImportConfig<T> = {
  description: string
  sampleCsv: string
  schema: z.ZodType<T>
  title: string
}

type ImportParseResult<T> =
  | {
      errors: string[]
      headers: string[]
      ok: false
      previewRows: CsvRecord[]
      rows: []
    }
  | {
      errors: []
      headers: string[]
      ok: true
      previewRows: CsvRecord[]
      rows: T[]
    }

const canonicalHeaderNames: Record<string, string> = {
  allocatableprofitamount: "allocatableProfitAmount",
  address: "address",
  assessedat: "assessedAt",
  chargesvalue: "chargesValue",
  committedamount: "committedAmount",
  deductionsourcename: "deductionSourceName",
  disbursedat: "disbursedAt",
  documenttype: "kycDocumentType",
  extramonthlysavingsamount: "extraMonthlySavingsAmount",
  extrasavingsamount: "extraSavingsAmount",
  firstrepaymentdueat: "firstRepaymentDueAt",
  fullname: "fullName",
  governmentidnumber: "governmentIdNumber",
  grossprofit: "profitAmount",
  joinedat: "joinedAt",
  kycdocumenttype: "kycDocumentType",
  kycnotes: "kycReviewNotes",
  kycreviewnotes: "kycReviewNotes",
  kycstatus: "kycStatus",
  loanproductname: "loanProductName",
  loantype: "loanType",
  maxsavingsmultiple: "maxSavingsMultiple",
  membernumber: "memberNumber",
  membertype: "memberType",
  monthlycommitment: "monthlyCommitment",
  monthlysavings: "monthlyCommitment",
  monthlyrepaymentamount: "monthlyRepaymentAmount",
  monthlyrepaymentpay: "monthlyRepaymentAmount",
  occupation: "occupation",
  openingbalance: "openingSavingsBalance",
  openingsavings: "openingSavingsBalance",
  openingsavingsbalance: "openingSavingsBalance",
  outstandingprincipal: "outstandingPrincipal",
  periodlabel: "periodLabel",
  principalamount: "principalAmount",
  profitdate: "profitDate",
  requestedat: "requestedAt",
  savingsduringloan: "extraMonthlySavingsAmount",
  sourcetype: "sourceType",
  termmonths: "termMonths",
  phonenumber: "phoneNumber",
  totalsavingssnapshot: "openingSavingsBalance",
}

function normalizeHeader(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  const compact = normalized.replace(/_/g, "")

  return canonicalHeaderNames[compact] ?? normalized
}

function parseDateString(
  value: string,
  ctx: z.RefinementCtx,
  fieldName: string
) {
  const trimmed = value.trim()

  if (!trimmed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} is required.`,
    })
    return z.NEVER
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a valid ISO date (YYYY-MM-DD).`,
    })
    return z.NEVER
  }

  return date
}

function parseOptionalDateString(
  value: string | undefined,
  ctx: z.RefinementCtx,
  fieldName: string
) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a valid ISO date (YYYY-MM-DD).`,
    })
    return z.NEVER
  }

  return date
}

function parseOptionalNumber(
  value: string | undefined,
  ctx: z.RefinementCtx,
  fieldName: string
) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  const numericValue = Number(trimmed)

  if (!Number.isFinite(numericValue)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a valid number.`,
    })
    return z.NEVER
  }

  return numericValue
}

function parseRequiredNumber(
  value: string,
  ctx: z.RefinementCtx,
  fieldName: string
) {
  const numericValue = Number(value.trim())

  if (!Number.isFinite(numericValue)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be a valid number.`,
    })
    return z.NEVER
  }

  return numericValue
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = []
  let currentCell = ""
  let currentRow: string[] = []
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ""
      continue
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      currentRow.push(currentCell.trim())
      currentCell = ""

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow)
      }

      currentRow = []
      continue
    }

    currentCell += character
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

function csvToRecords(csvText: string) {
  const rows = parseCsvRows(csvText.trim())

  if (rows.length === 0) {
    return {
      headers: [] as string[],
      records: [] as CsvRecord[],
    }
  }

  const headerRow = rows[0]

  if (!headerRow) {
    return {
      headers: [] as string[],
      records: [] as CsvRecord[],
    }
  }

  const headers = headerRow.map(normalizeHeader)
  const records = rows.slice(1).map((row) => {
    const record: CsvRecord = {}

    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim()
    })

    return record
  })

  return { headers, records }
}

const membersRowSchema = z.object({
  deductionSourceName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("email must be valid.")
    .optional()
    .or(z.literal("")),
  fullName: z.string().trim().min(1, "fullName is required."),
  governmentIdNumber: z.string().trim().optional(),
  joinedAt: z
    .string()
    .transform((value, ctx) => parseDateString(value, ctx, "joinedAt")),
  kycDocumentType: z.string().trim().optional(),
  kycReviewNotes: z.string().trim().optional(),
  kycStatus: z
    .enum(["not_started", "pending", "verified", "rejected"])
    .optional(),
  memberNumber: z.string().trim().min(1, "memberNumber is required."),
  memberType: z.enum(["civil_servant", "individual", "business"]),
  monthlyCommitment: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalNumber(value, ctx, "monthlyCommitment")
    ),
  occupation: z.string().trim().optional(),
  openingSavingsBalance: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalNumber(value, ctx, "openingSavingsBalance")
    ),
  phoneNumber: z.string().trim().optional(),
  status: z
    .enum(["pending", "active", "inactive", "suspended", "exited"])
    .optional(),
})

const deductionSourcesRowSchema = z.object({
  externalReference: z.string().trim().optional(),
  name: z.string().trim().min(1, "name is required."),
  type: z.enum([
    "ministry_payroll",
    "employer_payroll",
    "bank_transfer",
    "card",
    "cash",
    "manual",
  ]),
})

const loanProductsRowSchema = z.object({
  loanType: z.enum(["normal", "quick"]),
  maxSavingsMultiple: z
    .string()
    .transform((value, ctx) =>
      parseRequiredNumber(value, ctx, "maxSavingsMultiple")
    ),
  name: z.string().trim().min(1, "name is required."),
  termMonths: z
    .string()
    .transform((value, ctx) => parseRequiredNumber(value, ctx, "termMonths")),
})

const contributionsRowSchema = z.object({
  amount: z
    .string()
    .transform((value, ctx) => parseRequiredNumber(value, ctx, "amount")),
  channel: z.enum(["payroll", "transfer", "cash", "manual"]),
  committedAmount: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalNumber(value, ctx, "committedAmount")
    ),
  extraSavingsAmount: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalNumber(value, ctx, "extraSavingsAmount")
    ),
  memberNumber: z.string().trim().min(1, "memberNumber is required."),
  periodLabel: z.string().trim().optional(),
  postedAt: z
    .string()
    .transform((value, ctx) => parseDateString(value, ctx, "postedAt")),
  reference: z.string().trim().optional(),
})

const chargesRowSchema = z.object({
  amount: z
    .string()
    .transform((value, ctx) => parseRequiredNumber(value, ctx, "amount")),
  assessedAt: z
    .string()
    .transform((value, ctx) => parseDateString(value, ctx, "assessedAt")),
  code: z.string().trim().min(1, "code is required."),
  kind: z.enum(["fixed", "percentage"]),
  memberNumber: z.string().trim().min(1, "memberNumber is required."),
  name: z.string().trim().min(1, "name is required."),
  notes: z.string().trim().optional(),
})

const loanMigrationsRowSchema = z.object({
  disbursedAt: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalDateString(value, ctx, "disbursedAt")
    ),
  extraMonthlySavingsAmount: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalNumber(value, ctx, "extraMonthlySavingsAmount")
    ),
  firstRepaymentDueAt: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalDateString(value, ctx, "firstRepaymentDueAt")
    ),
  loanProductName: z.string().trim().min(1, "loanProductName is required."),
  loanType: z.enum(["normal", "quick"]),
  memberNumber: z.string().trim().min(1, "memberNumber is required."),
  monthlyRepaymentAmount: z
    .string()
    .optional()
    .transform((value, ctx) =>
      parseOptionalNumber(value, ctx, "monthlyRepaymentAmount")
    ),
  outstandingPrincipal: z
    .string()
    .transform((value, ctx) =>
      parseRequiredNumber(value, ctx, "outstandingPrincipal")
    ),
  principalAmount: z
    .string()
    .transform((value, ctx) =>
      parseRequiredNumber(value, ctx, "principalAmount")
    ),
  requestedAt: z
    .string()
    .transform((value, ctx) => parseDateString(value, ctx, "requestedAt")),
  status: z.enum([
    "approved",
    "disbursed",
    "active",
    "completed",
    "defaulted",
    "written_off",
  ]),
  termMonths: z
    .string()
    .transform((value, ctx) => parseRequiredNumber(value, ctx, "termMonths")),
})

const repaymentMigrationsRowSchema = z.object({
  amount: z
    .string()
    .transform((value, ctx) => parseRequiredNumber(value, ctx, "amount")),
  loanProductName: z.string().trim().min(1, "loanProductName is required."),
  memberNumber: z.string().trim().min(1, "memberNumber is required."),
  reference: z.string().trim().optional(),
})

export const dashboardImportConfigs: Record<
  DashboardImportKind,
  ImportConfig<
    | z.infer<typeof membersRowSchema>
    | z.infer<typeof deductionSourcesRowSchema>
    | z.infer<typeof loanProductsRowSchema>
    | z.infer<typeof contributionsRowSchema>
    | z.infer<typeof chargesRowSchema>
    | z.infer<typeof loanMigrationsRowSchema>
    | z.infer<typeof repaymentMigrationsRowSchema>
  >
> = {
  members: {
    title: "Members",
    description:
      "Create or update member registry records, opening savings, KYC references, and optional deduction source mapping.",
    schema: membersRowSchema,
    sampleCsv: [
      "memberNumber,fullName,memberType,joinedAt,status,openingSavingsBalance,monthlyCommitment,email,phoneNumber,address,occupation,deductionSourceName,kycStatus,governmentIdNumber,kycDocumentType,kycReviewNotes",
      "MEM-1001,Amina Yusuf,individual,2024-01-15,active,125000,25000,amina@example.com,+2348010001001,Kaduna,Trader,Kaduna Payroll Desk,verified,NIN-1001,national_id,Imported legacy file",
      "MEM-1002,Usman Bello,civil_servant,2024-02-01,active,78000,20000,usman@example.com,+2348010001002,Zaria,Civil servant,Kaduna Payroll Desk,pending,NIN-1002,national_id,Awaiting document review",
    ].join("\n"),
  },
  deduction_sources: {
    title: "Deduction sources",
    description:
      "Quick setup for payroll desks and other deduction source records.",
    schema: deductionSourcesRowSchema,
    sampleCsv: [
      "name,type,externalReference",
      "Kaduna Payroll Desk,ministry_payroll,KD-PAY-01",
      "Main Office Transfer Desk,bank_transfer,DD-01",
    ].join("\n"),
  },
  loan_products: {
    title: "Loan products",
    description:
      "Import or refresh supported loan products before loan migration work.",
    schema: loanProductsRowSchema,
    sampleCsv: [
      "name,loanType,termMonths,maxSavingsMultiple",
      "Standard Loan,normal,12,2",
      "Emergency Support,quick,6,1",
    ].join("\n"),
  },
  contributions: {
    title: "Contributions",
    description:
      "Bring in historical savings postings and commitment records against existing members.",
    schema: contributionsRowSchema,
    sampleCsv: [
      "memberNumber,amount,channel,postedAt,periodLabel,reference,committedAmount,extraSavingsAmount",
      "MEM-1001,25000,transfer,2026-04-01,April 2026,TRX-APR-001,20000,5000",
      "MEM-1002,30000,payroll,2026-04-01,April 2026,PAY-APR-002,25000,5000",
    ].join("\n"),
  },
  charges: {
    title: "Charges",
    description:
      "Import charge definitions and historical member charge applications in one pass.",
    schema: chargesRowSchema,
    sampleCsv: [
      "memberNumber,code,name,kind,amount,assessedAt,notes",
      "MEM-1001,LEVY-APR,Monthly Levy,fixed,2500,2026-04-01,April levy backfill",
      "MEM-1002,REG-FEE,Registration Fee,fixed,5000,2026-04-01,Historical registration fee",
    ].join("\n"),
  },
  loan_migrations: {
    title: "Loans migration",
    description:
      "Migrate legacy loan books, including active balances and generated repayment schedules.",
    schema: loanMigrationsRowSchema,
    sampleCsv: [
      "memberNumber,loanProductName,loanType,principalAmount,outstandingPrincipal,termMonths,monthly_repayment_pay,requestedAt,status,disbursedAt,firstRepaymentDueAt,savings_during_loan",
      "MEM-1001,Standard Loan,normal,150000,90000,12,15000,2025-10-01,active,2025-10-03,2025-11-03,5000",
      "MEM-1002,Emergency Support,quick,60000,20000,6,10000,2026-01-05,active,2026-01-06,2026-02-06,0",
    ].join("\n"),
  },
  repayment_migrations: {
    title: "Repayment migrations",
    description:
      "Post historical repayments against imported loans using member number plus loan product matching.",
    schema: repaymentMigrationsRowSchema,
    sampleCsv: [
      "memberNumber,loanProductName,amount,reference",
      "MEM-1001,Standard Loan,15000,LEGACY-RPY-001",
      "MEM-1002,Emergency Support,10000,LEGACY-RPY-002",
    ].join("\n"),
  },
}

export function parseDashboardImportCsv<T = unknown>(
  kind: DashboardImportKind,
  csvText: string
): ImportParseResult<T> {
  const config = dashboardImportConfigs[kind]
  const trimmedText = csvText.trim()

  if (!trimmedText) {
    return {
      errors: ["Paste CSV content before importing."],
      headers: [],
      ok: false,
      previewRows: [],
      rows: [],
    }
  }

  const { headers, records } = csvToRecords(trimmedText)

  if (headers.length === 0) {
    return {
      errors: ["CSV content must include a header row."],
      headers,
      ok: false,
      previewRows: [],
      rows: [],
    }
  }

  const errors: string[] = []
  const parsedRows: T[] = []

  records.forEach((record, index) => {
    const result = config.schema.safeParse(record)

    if (!result.success) {
      const issueSummary = result.error.issues
        .map((issue) => issue.message)
        .join("; ")
      errors.push(`Row ${index + 2}: ${issueSummary}`)
      return
    }

    parsedRows.push(result.data as T)
  })

  if (errors.length > 0) {
    return {
      errors,
      headers,
      ok: false,
      previewRows: records.slice(0, 3),
      rows: [],
    }
  }

  return {
    errors: [],
    headers,
    ok: true,
    previewRows: records.slice(0, 3),
    rows: parsedRows,
  }
}

export function getDashboardImportPrimaryValue(
  kind: DashboardImportKind,
  row: Record<string, unknown>
) {
  switch (kind) {
    case "members":
    case "contributions":
    case "charges":
    case "loan_migrations":
    case "repayment_migrations":
      return typeof row.memberNumber === "string" ? row.memberNumber : null
    case "deduction_sources":
    case "loan_products":
      return typeof row.name === "string" ? row.name : null
    default:
      return null
  }
}

export function getDashboardImportExistingMatches(
  kind: DashboardImportKind,
  referenceData: DashboardImportReferenceData,
  row: Record<string, unknown>
) {
  switch (kind) {
    case "members":
    case "contributions":
    case "loan_migrations":
    case "repayment_migrations":
      return (
        typeof row.memberNumber === "string" &&
        referenceData.memberNumbers.includes(row.memberNumber)
      )
    case "deduction_sources":
      return (
        typeof row.name === "string" &&
        referenceData.deductionSourceNames.includes(row.name)
      )
    case "loan_products":
      return (
        typeof row.name === "string" &&
        referenceData.loanProductNames.includes(row.name)
      )
    case "charges":
      return (
        typeof row.code === "string" &&
        referenceData.chargeDefinitionCodes.includes(row.code)
      )
    default:
      return false
  }
}
