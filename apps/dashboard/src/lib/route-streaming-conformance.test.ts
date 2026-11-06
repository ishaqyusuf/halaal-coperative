import { describe, expect, test } from "bun:test"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const appDir = fileURLToPath(new URL("../app", import.meta.url))
const sidebarDir = join(appDir, "(app)", "(sidebar)")

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

describe("route streaming contract (WP3)", () => {
  test("pages never await prefetches", () => {
    const blocking = listFiles(appDir).filter((path) =>
      /await (batchPrefetch|prefetch)\(/.test(readFileSync(path, "utf8"))
    )

    expect(blocking).toEqual([])
  })

  test("prefetch helpers are fire-and-forget", () => {
    const server = readFileSync(
      fileURLToPath(new URL("../trpc/server.tsx", import.meta.url)),
      "utf8"
    )

    expect(server).not.toContain("export async function batchPrefetch")
    expect(server).toContain("void queryClient")
  })

  test("every sidebar route sits under a loading boundary", () => {
    expect(existsSync(join(sidebarDir, "loading.tsx"))).toBe(true)
  })

  test("sidebar pages declare metadata", () => {
    const pages = [
      "analytics",
      "domains",
      "guarantor-approvals",
      "membership-approvals/[requestId]",
      "monthly-records",
      "notifications",
      "payment-receipts",
      "platform/qa-maintenance",
      "reports/audit",
      "settings/finance/loan",
      "settings/finance/migration",
      "settings/finance/migration/[memberId]",
    ]
    const missing = pages.filter(
      (page) =>
        !readFileSync(join(sidebarDir, page, "page.tsx"), "utf8").includes(
          "export const metadata"
        )
    )

    expect(missing).toEqual([])
  })
})
