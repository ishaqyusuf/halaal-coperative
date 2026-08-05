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

  test("keeps production signup tokens and provider details out of responses", () => {
    const signup = read("apps/marketing/app/api/signup/route.ts")
    const onboarding = read("apps/marketing/app/api/onboarding/route.ts")
    const signupForm = read(
      "apps/marketing/src/components/signup/signup-form.tsx"
    )

    expect(signup).toContain(
      "onboardingUrl: exposeQaArtifacts ? onboardingUrl.toString() : undefined"
    )
    expect(signup).toContain(
      "verificationEmail: exposeQaArtifacts ? verificationEmail : undefined"
    )
    expect(signupForm).toContain('"verificationDelivery" in payload')
    expect(onboarding).toContain("vercelDomainProvisioning: {")
    expect(onboarding).toContain('? "Email delivery failed."')
  })

  test("returns safe terminal job receipts", () => {
    const queue = read("packages/jobs/src/queue.ts")
    expect(queue).toContain("toPublicError")
    expect(queue).not.toContain("lastError?.message")
  })

  test("types every member-onboarding failure at its source", () => {
    const onboarding = read("packages/db/src/queries/member-onboarding.ts")

    expect(onboarding).toContain("new AppError({")
    expect(onboarding).toContain('"PRECONDITION_FAILED"')
    expect(onboarding).not.toContain("throw new Error(")
  })

  test("forbids generic errors in API router and dashboard validation sources", () => {
    const routerSources = sourceFiles("apps/api/src/routers")
      .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
      .map(read)
      .join("\n")
    const dashboardActions = read(
      "apps/api/src/routers/dashboard-actions.route.ts"
    )

    expect(routerSources).not.toContain("throw new Error(")
    expect(dashboardActions).toContain(
      "class DashboardActionExpectedError extends AppError"
    )
    expect(dashboardActions).toContain('operation: "dashboardActions.validate"')
    expect(dashboardActions).toContain(
      'operation: "dashboardActions.passwordSetup"'
    )
  })
})
