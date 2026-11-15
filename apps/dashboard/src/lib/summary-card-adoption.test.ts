import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const componentsDir = fileURLToPath(new URL("../components", import.meta.url))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe("summary numbers use the shared SummaryCard (WP11)", () => {
  test("no local tile clones are left", () => {
    const clones = sourceFiles(componentsDir).filter((path) =>
      /function (SummaryMetric|SummaryTile|MiniMetric|SmallStat)\b/.test(
        readFileSync(path, "utf8")
      )
    )

    expect(clones).toEqual([])
  })

  test("member registry and payment receipt counts render SummaryCard", () => {
    const members = readFileSync(
      join(componentsDir, "members/members-summary-card.tsx"),
      "utf8"
    )
    const receipts = readFileSync(
      join(componentsDir, "payment-receipts-view.tsx"),
      "utf8"
    )

    expect(members).toContain("<SummaryCard")
    expect(members).not.toContain('from "next/link"')
    expect(receipts).toContain("<SummaryCard")
    // A single-status card filters the table in place.
    expect(receipts).toContain("selected={filter.status === status}")
  })
})
