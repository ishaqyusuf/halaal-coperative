import { describe, expect, test } from "bun:test"
import * as XLSX from "xlsx"
import {
  createDashboardImportTemplateWorkbook,
  readDashboardImportFileAsCsv,
} from "./import-excel"

describe("dashboard workbook import and template", () => {
  test("retains CSV, XLS, and XLSX member import after the SheetJS update", async () => {
    const workbook = createDashboardImportTemplateWorkbook("members", [
      "memberNumber",
      "fullName",
    ])
    const expected = "memberNumber,fullName\nMEM-1001,Amina Yusuf"

    for (const bookType of ["xls", "xlsx"] as const) {
      const bytes = XLSX.write(workbook, { bookType, type: "array" })
      const file = new File([bytes], `members.${bookType}`)
      const csv = await readDashboardImportFileAsCsv(file)
      expect(csv).toContain(expected)
    }

    const csv = await readDashboardImportFileAsCsv(
      new File([expected], "members.csv")
    )
    expect(csv).toBe(expected)
  })
})
