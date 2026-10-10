import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const selectableTables: [string][] = [
  ["business"],
  ["members"],
]

const individualActionTables: [string][] = [
  ["food-purchase"],
  ["payment-receipts"],
  ["procurement"],
  ["project-financing"],
  ["share-applications"],
  ["support"],
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
