import { describe, expect, test } from "bun:test"
import { finalizeMobileReportExport } from "./mobile-report-exports"

describe("mobile report export", () => {
  test("enforces the server-owned row limit before returning content", () => {
    expect(() =>
      finalizeMobileReportExport({
        columns: [{ header: "Name", path: "name" }],
        filename: "members.csv",
        rowLimit: 1,
        rows: [{ name: "Amina" }, { name: "Fatima" }],
      })
    ).toThrow("exceeds the 1 row limit")
  })

  test("escapes CSV syntax and neutralizes spreadsheet formulas", () => {
    const result = finalizeMobileReportExport({
      columns: [
        { header: "Name", path: "name" },
        { header: "Note", path: "note" },
      ],
      filename: "members.csv",
      rowLimit: 10,
      rows: [
        {
          name: '=HYPERLINK("https://malicious.test")',
          note: 'Contains, comma and "quote"',
        },
      ],
    })

    expect(result.content).toContain("'=HYPERLINK")
    expect(result.content).toContain('"Contains, comma and ""quote"""')
    expect(result.rowCount).toBe(1)
  })
})
