import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const srcDir = fileURLToPath(new URL("..", import.meta.url))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe("shared primitives (WP18)", () => {
  test("44px buttons use the touch sizes, not h-11 overrides", () => {
    const overrides = sourceFiles(srcDir).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => /(Button|buttonVariants).*\b(h|size)-11\b/.test(line))
        .map((line) => `${path}: ${line.trim()}`)
    )

    expect(overrides).toEqual([])
  })

  test("the Button primitive offers the touch sizes", () => {
    const button = readFileSync(
      fileURLToPath(
        new URL(
          "../../../../packages/ui/src/components/button.tsx",
          import.meta.url
        )
      ),
      "utf8"
    )

    expect(button).toMatch(/touch:\s*\n?\s*"h-11 /)
    expect(button).toContain('"icon-touch": "size-11"')
  })
})
