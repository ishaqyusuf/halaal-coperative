import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const columnsSource = readFileSync(
  new URL("../components/tables/members/columns.tsx", import.meta.url),
  "utf8"
)
const tableHeaderSource = readFileSync(
  new URL("../components/tables/members/table-header.tsx", import.meta.url),
  "utf8"
)
const tableConfigsSource = readFileSync(
  new URL("../utils/table-configs.ts", import.meta.url),
  "utf8"
)

describe("member table identity density", () => {
  test("keeps member number as the sticky first column, with joined on its own", () => {
    expect(columnsSource).toContain('header: "Member no."')
    expect(columnsSource).toContain('header: "Joined"')
    expect(tableHeaderSource).toContain('number: "Member no."')
    expect(columnsSource.indexOf('id: "number"')).toBeLessThan(
      columnsSource.indexOf('id: "member"')
    )
    expect(tableConfigsSource).toContain(
      'members: [\n    { id: "select", width: 50 },\n    { id: "number", width: 140 },'
    )
    expect(tableConfigsSource).toContain(
      'members: new Set(["select", "number", "actions"])'
    )
    expect(tableConfigsSource).toContain('joined: "joinedAt"')
  })

  test("leaves member type off the registry row", () => {
    expect(columnsSource).not.toContain("memberType")
    expect(columnsSource).not.toContain('header: "Type"')
  })
})
