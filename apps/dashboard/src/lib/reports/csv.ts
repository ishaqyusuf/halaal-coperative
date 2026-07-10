export type CsvCell =
  | boolean
  | null
  | number
  | string
  | undefined
  | { toString(): string }

function escapeCsvCell(value: CsvCell) {
  const stringValue = value == null ? "" : String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`
  }

  return stringValue
}

export function toCsv(headers: string[], rows: CsvCell[][]) {
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n")
}

export type ReportDateFilters = {
  from?: string
  fromDate?: Date
  to?: string
  toDate?: Date
}
