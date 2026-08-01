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
  test("combines member number and joined date in one column", () => {
    expect(columnsSource).toContain('header: "# / Joined"')
    expect(columnsSource).toContain("joinedAt={row.original.joinedAt}")
    expect(columnsSource).not.toContain('header: "Joined"')
    expect(tableHeaderSource).toContain('number: "# / Joined"')
    expect(tableHeaderSource).not.toContain('number: "Number"')
    expect(columnsSource.indexOf('id: "number"')).toBeLessThan(
      columnsSource.indexOf('id: "member"')
    )
    expect(tableConfigsSource).toContain(
      'members: [\n    { id: "select", width: 50 },\n    { id: "number", width: 160 },'
    )
    expect(tableConfigsSource).toContain(
      'members: new Set(["select", "number", "actions"])'
    )
    expect(tableConfigsSource).toContain('number: "joinedAt"')
  })

  test("shows member type in the member cell instead of a separate column", () => {
    expect(columnsSource).toContain("memberType={row.original.memberType}")
    expect(columnsSource).toContain("{displayEnum(memberType)}")
    expect(columnsSource).not.toContain('header: "Type"')
  })
})
