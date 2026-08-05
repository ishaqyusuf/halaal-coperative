import { describe, expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
)

function read(relativePath: string) {
  return readFileSync(resolve(workspaceRoot, relativePath), "utf8")
}

function sourceFiles(relativeDirectory: string): string[] {
  const directory = resolve(workspaceRoot, relativeDirectory)
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry.name}`
    return entry.isDirectory() ? sourceFiles(relativePath) : [relativePath]
  })
}

describe("Halaalvest error-system adoption", () => {
  test("normalizes API procedures and REST fallbacks", () => {
    const trpc = read("apps/api/src/lib.trpc.ts")
    const api = read("apps/api/src/index.ts")

    expect(trpc).toContain("withErrorContract")
    expect(trpc).toContain("errorFormatter")
    expect(trpc).toContain("appError")
    expect(api).toContain("getRestErrorResponse")
    expect(api).toContain("x-request-id")
  })

  test("installs the shared contract in every user-facing runtime", () => {
    for (const app of ["api", "dashboard", "marketing", "mobile"]) {
      const manifest = JSON.parse(read(`apps/${app}/package.json`)) as {
        dependencies?: Record<string, string>
      }
      expect(manifest.dependencies?.["@halaalvest/errors"]).toBe("workspace:*")
    }

    const jobs = JSON.parse(read("packages/jobs/package.json")) as {
      dependencies?: Record<string, string>
    }
    expect(jobs.dependencies?.["@halaalvest/errors"]).toBe("workspace:*")
  })

  test("never posts raw dashboard exception content to tenant audit logs", () => {
    const reportingSources = [
      ...sourceFiles("apps/dashboard/src/app").filter((path) =>
        path.endsWith("error.tsx")
      ),
      "apps/dashboard/src/lib/error-reporting.ts",
      "apps/dashboard/src/lib/use-error-receipt.ts",
    ]
      .map(read)
      .join("\n")

    expect(reportingSources).not.toContain("message: error.message")
    expect(reportingSources).not.toContain("stack: error.stack")
    expect(reportingSources).not.toContain("window.location.pathname")

    const route = read("apps/dashboard/src/app/api/error-report/route.ts")
    expect(route).toContain("referenceId: report.referenceId")
    expect(route).not.toContain("componentStack")
    expect(route).not.toContain("userAgent")
  })

  test("does not serialize thrown marketing messages", () => {
    const routes = sourceFiles("apps/marketing/app/api")
      .filter((path) => path.endsWith(".ts"))
      .map(read)
      .join("\n")

    expect(routes).not.toContain("error.message")
    expect(routes).not.toContain("delivery.errorMessage ??")
    expect(routes).toContain("getMarketingErrorResponse")
  })

  test("returns safe terminal job receipts", () => {
    const queue = read("packages/jobs/src/queue.ts")
    expect(queue).toContain("toPublicError")
    expect(queue).not.toContain("lastError?.message")
  })
})
