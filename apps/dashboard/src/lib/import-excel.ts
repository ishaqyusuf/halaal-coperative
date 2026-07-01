import * as XLSX from "xlsx"
import { dashboardImportConfigs, type DashboardImportKind } from "@/lib/import-csv"

function parseCsvRows(csvText: string) {
  const rows: string[][] = []
  let currentCell = ""
  let currentRow: string[] = []
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        currentCell += "\""
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

function getTemplateFilename(kind: DashboardImportKind) {
  return `${kind.replace(/_/g, "-")}-import-template.xlsx`
}

function projectTemplateRows(rows: string[][], columns?: string[]) {
  const headerRow = rows[0]

  if (!columns?.length || !headerRow) {
    return rows
  }

  const columnIndexes = columns.map((column) => headerRow.indexOf(column))

  return [
    columns,
    ...rows
      .slice(1)
      .map((row) =>
        columnIndexes.map((index) => (index >= 0 ? (row[index] ?? "") : ""))
      ),
  ]
}

export function downloadDashboardImportTemplate(
  kind: DashboardImportKind,
  columns?: string[]
) {
  const config = dashboardImportConfigs[kind]
  const rows = projectTemplateRows(parseCsvRows(config.sampleCsv), columns)
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  worksheet["!cols"] = rows[0]?.map((header) => ({
    wch: Math.max(header.length + 4, 18),
  }))

  XLSX.utils.book_append_sheet(workbook, worksheet, config.title.slice(0, 31))
  XLSX.writeFile(workbook, getTemplateFilename(kind), { bookType: "xlsx" })
}

export async function readDashboardImportFileAsCsv(file: File) {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return file.text()
  }

  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    throw new Error("Upload a CSV, XLS, or XLSX file.")
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    cellDates: false,
    type: "array",
  })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error("The workbook does not contain any sheets.")
  }

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error("The first sheet could not be read.")
  }

  return XLSX.utils.sheet_to_csv(worksheet, {
    FS: ",",
    RS: "\n",
    blankrows: false,
  })
}
