import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

// /business is a plain list since thread 12 (no table, no selection).
const selectableTables: [string][] = [["members"]]

const individualActionTables: [string][] = [["payment-receipts"]]

// Request tables and support (since 9e8b3543): a row opens its sheet, where
// every action lives.
const rowOpensSheetTables: [string][] = [
  ["support"],
  ["food-purchase"],
  ["procurement"],
  ["project-financing"],
]

const virtualRowSource = readFileSync(
  new URL("../components/tables/core/virtual-row.tsx", import.meta.url),
  "utf8"
)

describe("shared table selection alignment", () => {
  test.each(individualActionTables)(
    "%s exposes individual actions without unused bulk selection",
    (table) => {
      const source = readFileSync(
        new URL(`../components/tables/${table}/columns.tsx`, import.meta.url),
        "utf8"
      )
      expect(source).not.toContain('id: "select"')
      expect(source).toContain('id: "actions"')
    }
  )
  test.each(rowOpensSheetTables)(
    "%s has no bulk selection and no row menu",
    (table) => {
      const source = readFileSync(
        new URL(`../components/tables/${table}/columns.tsx`, import.meta.url),
        "utf8"
      )
      expect(source).not.toContain('id: "select"')
      expect(source).not.toContain('id: "actions"')
    }
  )

  test("centers select cells and their checkbox wrappers", () => {
    expect(virtualRowSource).toContain('const isSelect = columnId === "select"')
    expect(virtualRowSource).toContain('isSelect && "justify-center px-0"')
    expect(virtualRowSource).toContain(
      'isSelect && "flex items-center justify-center"'
    )
  })

  test.each(selectableTables)(
    "%s uses the shared virtual row selection layout",
    (table) => {
      const columnsSource = readFileSync(
        new URL(`../components/tables/${table}/columns.tsx`, import.meta.url),
        "utf8"
      )
      const dataTableSource = readFileSync(
        new URL(
          `../components/tables/${table}/data-table.tsx`,
          import.meta.url
        ),
        "utf8"
      )

      expect(columnsSource).toContain('id: "select"')
      expect(dataTableSource).toContain("<VirtualRow")
    }
  )
})
