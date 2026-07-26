import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const columnsSource = readFileSync(
  new URL("../components/tables/members/columns.tsx", import.meta.url),
  "utf8"
)

describe("member table identity density", () => {
  test("combines member number and joined date in one column", () => {
    expect(columnsSource).toContain('header: "# / Joined"')
    expect(columnsSource).toContain("joinedAt={row.original.joinedAt}")
    expect(columnsSource).not.toContain('header: "Joined"')
  })

  test("shows member type in the member cell instead of a separate column", () => {
    expect(columnsSource).toContain("memberType={row.original.memberType}")
    expect(columnsSource).toContain("{displayEnum(memberType)}")
    expect(columnsSource).not.toContain('header: "Type"')
  })
})
