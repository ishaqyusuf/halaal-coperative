import {
  csvToRecords,
  dashboardImportConfigs,
  getDashboardImportExistingMatches,
  getDashboardImportIdentityKeys,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_TEXT_LENGTH,
  type DashboardImportKind,
  type DashboardImportReferenceData,
  withoutBlankCells,
} from "@/lib/import-csv"
import { importColumnLabel } from "@/lib/imports/import-words"

export type ImportRowProblem = {
  /** The spreadsheet row number (the header is row 1). */
  row: number
  messages: string[]
}

export type ImportReview = {
  /** A problem with the whole file (too big, wrong columns). */
  fileProblem: string | null
  problems: ImportRowProblem[]
  /** Rows that will be added when there are no problems. */
  readyCount: number
  /** Money in the file (amounts, or what is still owed on loans). */
  totalAmount: number | null
  totalRows: number
  /** Rows matching something already in Halaalvest, which will be updated. */
  updateCount: number
}

const amountFieldByKind: Partial<Record<DashboardImportKind, string>> = {
  charges: "amount",
  contributions: "amount",
  loan_migrations: "outstandingPrincipal",
  repayment_migrations: "amount",
}

/** Kinds whose rows belong to members who must already be in Halaalvest. */
const memberRecordKinds = new Set<DashboardImportKind>([
  "contributions",
  "charges",
  "loan_migrations",
  "repayment_migrations",
])

/** Kinds that update a matching record instead of adding a new one. */
const updatingKinds = new Set<DashboardImportKind>([
  "members",
  "deduction_sources",
  "loan_products",
])

const requiredColumnsByKind = new Map<DashboardImportKind, string[]>()

/** Columns the file must have: the ones an empty row is refused for. */
export function getRequiredImportColumns(kind: DashboardImportKind) {
  const cached = requiredColumnsByKind.get(kind)
  if (cached) return cached

  const result = dashboardImportConfigs[kind].schema.safeParse({})
  const required = result.success
    ? []
    : [
        ...new Set(
          result.error.issues
            .map((issue) => String(issue.path[0] ?? ""))
            .filter(Boolean)
        ),
      ]
  requiredColumnsByKind.set(kind, required)
  return required
}

type ParseIssue = {
  code?: string
  message: string
  path: PropertyKey[]
  values?: unknown[]
}

function describeIssue(issue: ParseIssue, record: Record<string, string>) {
  const field = String(issue.path[0] ?? "")
  const label = field ? importColumnLabel(field) : "This row"
  const raw = field ? (record[field] ?? "") : ""

  if (!raw.trim()) return `${label} is missing`
  if (/date/i.test(issue.message)) {
    return `${label} "${raw}" is not a date. Write it like 2025-01-31`
  }
  if (issue.code === "invalid_value" && Array.isArray(issue.values)) {
    return `${label} "${raw}" must be one of: ${issue.values.join(", ")}`
  }
  if (/valid number|expected number/i.test(issue.message)) {
    return `${label} "${raw}" is not a number`
  }
  if (/email/i.test(issue.message)) {
    return `${label} "${raw}" is not an email address`
  }

  return `${label} "${raw}": ${issue.message.replace(field, label)}`
}

/**
 * Reads a file the way the server will and says, in plain words, what will be
 * added and which rows need fixing. Nothing can be added while any row has a
 * problem, so a corrected file is always added whole.
 */
export function reviewImportFile(
  kind: DashboardImportKind,
  csvText: string,
  referenceData?: DashboardImportReferenceData
): ImportReview {
  const empty: ImportReview = {
    fileProblem: null,
    problems: [],
    readyCount: 0,
    totalAmount: null,
    totalRows: 0,
    updateCount: 0,
  }
  const text = csvText.trim()

  if (!text) return empty
  if (text.length > MAX_IMPORT_TEXT_LENGTH) {
    return {
      ...empty,
      fileProblem:
        "This file is too large to add in one go. Split it into smaller files.",
    }
  }

  const { headers, records } = csvToRecords(text)

  if (records.length === 0) {
    return {
      ...empty,
      fileProblem:
        "This file has no rows under the column names. Fill in the template and choose it again.",
    }
  }
  if (records.length > MAX_IMPORT_ROWS) {
    return {
      ...empty,
      fileProblem: `This file has ${records.length.toLocaleString("en-NG")} rows. Add at most ${MAX_IMPORT_ROWS.toLocaleString("en-NG")} at a time: split it into smaller files.`,
      totalRows: records.length,
    }
  }

  const missingColumns = getRequiredImportColumns(kind).filter(
    (column) => !headers.includes(column)
  )
  if (missingColumns.length > 0) {
    return {
      ...empty,
      fileProblem: `This file has no ${missingColumns.map(importColumnLabel).join(", ")} column. Download the template and keep its first row as it is.`,
      totalRows: records.length,
    }
  }

  const schema = dashboardImportConfigs[kind].schema
  const knownMembers = new Set(referenceData?.memberNumbers ?? [])
  const problemsByRow = new Map<number, string[]>()
  const addProblem = (row: number, message: string) => {
    problemsByRow.set(row, [...(problemsByRow.get(row) ?? []), message])
  }
  const parsedRows: Array<{ row: number; value: Record<string, unknown> }> = []

  records.forEach((record, index) => {
    const row = index + 2
    const result = schema.safeParse(withoutBlankCells(record))

    if (!result.success) {
      for (const issue of result.error.issues) {
        addProblem(row, describeIssue(issue as ParseIssue, record))
      }
      return
    }

    const value = result.data as Record<string, unknown>
    parsedRows.push({ row, value })

    if (
      referenceData &&
      memberRecordKinds.has(kind) &&
      typeof value.memberNumber === "string" &&
      !knownMembers.has(value.memberNumber)
    ) {
      addProblem(
        row,
        `Member number "${value.memberNumber}" is not in Halaalvest yet. Add the member first`
      )
    }
  })

  const rowsByKey = new Map<string, number[]>()
  for (const { row, value } of parsedRows) {
    for (const key of getDashboardImportIdentityKeys(kind, value)) {
      rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), row])
    }
  }
  for (const rows of rowsByKey.values()) {
    if (rows.length < 2) continue
    for (const row of rows) {
      addProblem(
        row,
        `This row is in the file more than once (rows ${rows.join(", ")})`
      )
    }
  }

  const amountField = amountFieldByKind[kind]
  const totalKobo = amountField
    ? parsedRows.reduce(
        (sum, { value }) =>
          sum + Math.round(Number(value[amountField] ?? 0) * 100),
        0
      )
    : null
  const updateCount =
    referenceData && updatingKinds.has(kind)
      ? parsedRows.filter(({ value }) =>
          getDashboardImportExistingMatches(kind, referenceData, value)
        ).length
      : 0

  return {
    fileProblem: null,
    problems: [...problemsByRow.entries()]
      .sort(([left], [right]) => left - right)
      .map(([row, messages]) => ({ messages: [...new Set(messages)], row })),
    readyCount: parsedRows.length,
    totalAmount: totalKobo === null ? null : totalKobo / 100,
    totalRows: records.length,
    updateCount,
  }
}

export function isImportReady(review: ImportReview) {
  return (
    !review.fileProblem && review.problems.length === 0 && review.readyCount > 0
  )
}
