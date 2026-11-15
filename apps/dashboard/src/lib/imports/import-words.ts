import type { DashboardImportKind } from "@/lib/import-csv"

/** Plain words for each kind of import, used across the imports pages. */
export type ImportKindWords = {
  /** Short menu label. */
  menu: string
  /** Page and dialog title. */
  title: string
  one: string
  many: string
  /** The one line under the page title. */
  line: string
  /** True when adding the file posts money (savings, charges, loans). */
  postsMoney: boolean
  /** What the money confirm says will happen, given the total. */
  moneyEffect?: (total: string) => string
}

export const importKindOrder: DashboardImportKind[] = [
  "members",
  "deduction_sources",
  "loan_products",
  "contributions",
  "charges",
  "loan_migrations",
  "repayment_migrations",
]

export const importKindWords: Record<DashboardImportKind, ImportKindWords> = {
  members: {
    menu: "Members",
    line: "Add your members. Members already in Halaalvest are updated.",
    many: "members",
    one: "member",
    postsMoney: false,
    title: "Members",
  },
  deduction_sources: {
    menu: "Workplaces",
    line: "Add the employers or offices that pay members' monthly savings.",
    many: "workplaces",
    one: "workplace",
    postsMoney: false,
    title: "Workplaces",
  },
  loan_products: {
    menu: "Loan types",
    line: "Add the kinds of interest-free loans your cooperative gives.",
    many: "loan types",
    one: "loan type",
    postsMoney: false,
    title: "Loan types",
  },
  contributions: {
    menu: "Savings",
    line: "Add past savings payments. Each one goes into the member's savings.",
    many: "savings payments",
    moneyEffect: (total) => `${total} will be added to members' savings.`,
    one: "savings payment",
    postsMoney: true,
    title: "Savings payments",
  },
  charges: {
    menu: "Charges",
    line: "Add past charges and levies. Each one is taken from the member's savings.",
    many: "charges",
    moneyEffect: (total) => `${total} will be taken from members' savings.`,
    one: "charge",
    postsMoney: true,
    title: "Charges",
  },
  loan_migrations: {
    menu: "Loans",
    line: "Add loans members still owe from before Halaalvest.",
    many: "loans",
    moneyEffect: (total) =>
      `Members will owe ${total} in total on these loans.`,
    one: "loan",
    postsMoney: true,
    title: "Loans",
  },
  repayment_migrations: {
    menu: "Repayments",
    line: "Add past repayments on the loans you have added.",
    many: "repayments",
    moneyEffect: (total) => `${total} will be paid off members' loans.`,
    one: "repayment",
    postsMoney: true,
    title: "Loan repayments",
  },
}

export function importCount(kind: DashboardImportKind, count: number) {
  const words = importKindWords[kind]
  return `${count.toLocaleString("en-NG")} ${count === 1 ? words.one : words.many}`
}

/** Spreadsheet column names in plain words. */
export const importColumnLabels: Record<string, string> = {
  address: "Address",
  amount: "Amount",
  assessedAt: "Date charged",
  channel: "Paid by",
  code: "Code",
  committedAmount: "Monthly savings due",
  deductionSourceName: "Workplace",
  disbursedAt: "Date paid out",
  email: "Email",
  externalReference: "Reference",
  extraMonthlySavingsAmount: "Savings during loan",
  extraSavingsAmount: "Extra savings",
  firstRepaymentDueAt: "First repayment due",
  fullName: "Name",
  governmentIdNumber: "ID number",
  joinedAt: "Date joined",
  kind: "Charge kind",
  kycDocumentType: "ID type",
  kycReviewNotes: "ID notes",
  kycStatus: "ID check",
  loanProductName: "Loan type",
  loanType: "Loan kind",
  maxSavingsMultiple: "Times savings",
  memberNumber: "Member number",
  memberType: "Member type",
  monthlyCommitment: "Monthly savings",
  monthlyRepaymentAmount: "Monthly repayment",
  name: "Name",
  notes: "Notes",
  occupation: "Job",
  openingSavingsBalance: "Savings so far",
  outstandingPrincipal: "Still owed",
  periodLabel: "Month",
  phoneNumber: "Phone number",
  postedAt: "Date paid",
  principalAmount: "Loan amount",
  reference: "Reference",
  requestedAt: "Date asked for",
  status: "Status",
  termMonths: "Months to repay",
  type: "Type",
}

export function importColumnLabel(column: string) {
  return importColumnLabels[column] ?? column
}

export type ImportBatchState =
  | "draft"
  | "applying"
  | "applied"
  | "failed"
  | "partial"
  | "undone"

/** One plain status word per batch, with the tone of its badge. */
export function importStatusWord(status: string): {
  label: string
  tone: "good" | "waiting" | "problem"
} {
  switch (status) {
    case "applied":
      return { label: "Added", tone: "good" }
    case "applying":
      return { label: "Adding now", tone: "waiting" }
    case "failed":
      return { label: "Not added", tone: "problem" }
    case "partial":
      return { label: "Partly added", tone: "problem" }
    case "undone":
      return { label: "Undone", tone: "waiting" }
    default:
      return { label: "Not added yet", tone: "waiting" }
  }
}

const naira = new Intl.NumberFormat("en-NG", {
  currency: "NGN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  style: "currency",
})

export function formatImportNaira(amount: number) {
  return naira.format(amount)
}
