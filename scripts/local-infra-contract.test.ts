import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const packageFiles = [
  "package.json",
  "apps/api/package.json",
  "apps/dashboard/package.json",
  "apps/marketing/package.json",
  "apps/mobile/package.json",
  "packages/auth/package.json",
  "packages/db/package.json",
  "packages/jobs/package.json",
]

function packageScripts(path: string): Record<string, string> {
  const contents = readFileSync(resolve(root, path), "utf8")
  return (
    (JSON.parse(contents) as { scripts?: Record<string, string> }).scripts ?? {}
  )
}

describe("School Clerk local-infra contract", () => {
  test("all shared-toolkit commands select Halaalvest without Bun env preloading", () => {
    for (const packageFile of packageFiles) {
      for (const [name, command] of Object.entries(
        packageScripts(packageFile)
      )) {
        if (
          !command.includes("local-infra-kit") &&
          !command.includes("local-infra-command")
        ) {
          continue
        }

        expect(
          command,
          `${packageFile} ${name} must suppress Bun's implicit env loading`
        ).toContain("bun --env-file=/dev/null")

        if (!command.includes("local-infra-kit")) continue

        expect(
          command,
          `${packageFile} ${name} must select the Halaalvest profile`
        ).toContain("--profile halaalvest")
      }
    }
  })

  test("publishes the standardized database without replacing its volume", () => {
    const compose = readFileSync(resolve(root, "docker-compose.yml"), "utf8")

    expect(compose).toContain("postgres:16-alpine")
    expect(compose).toContain(
      '"${DB_HOST_PORT:?DATABASE_URL must include a local PostgreSQL port}:5432"'
    )
    expect(compose).toContain(
      'POSTGRES_DB: "${DB_NAME:?DATABASE_URL must include a database name}"'
    )
    expect(compose).toContain(
      "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"
    )
    expect(compose).toContain(
      "halaalvest-postgres-data:/var/lib/postgresql/data"
    )
  })

  test("keeps migrations explicit in the development preparation command", () => {
    const scripts = packageScripts("package.json")
    const launcher = readFileSync(
      resolve(root, "scripts/local-infra-command.ts"),
      "utf8"
    )

    expect(scripts.dev).toContain("scripts/local-infra-command.ts dev")
    expect(scripts["dev:services"]).toContain(
      "scripts/local-infra-command.ts dev-services"
    )
    expect(launcher).toContain("../local-infra-kit/bin/${entrypointValue}.ts")
    expect(launcher).toContain('"--profile",')
    expect(launcher).toContain("PROFILE,")
    expect(scripts["dev:prepare"]).toBe(
      "bun run kill:ports && bun run dev:services"
    )
    expect(scripts["dev:prepare"]).not.toContain("db:migrate")
    expect(scripts["db:shell"]).toBe(
      "bun --env-file=/dev/null ../local-infra-kit/bin/db.ts shell --profile halaalvest"
    )
  })

  test("does not load legacy environment files or database aliases", () => {
    const activeEnvSources = [
      "package.json",
      "turbo.json",
      "scripts/eas-account-runner.ts",
      "scripts/local-infra-command.ts",
      "packages/db/prisma.config.ts",
    ]
      .map((path) => readFileSync(resolve(root, path), "utf8"))
      .join("\n")

    for (const legacyName of [
      ".env.production",
      ".env.remote.local",
      ".env.remote-dev",
      "LOCAL_DATABASE_URL",
      "REMOTE_DEV_DATABASE_URL",
      "PROD_DATABASE_URL",
      "POSTGRES_URL",
    ]) {
      expect(activeEnvSources).not.toContain(legacyName)
    }
  })
})
