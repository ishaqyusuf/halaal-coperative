#!/usr/bin/env bun

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

// Explicit, reviewed source-only tests. Never discover or glob tests: this
// repository also has connected database and provider tests
// (`*.integration.test.ts`, packages/db fixtures, mobile route integrations).
// Every entry below passed under quickEnvironment() with an unusable DB URL.
export const suites = {
  core: [
    "scripts/qa-doctor.test.ts",
    "scripts/test-quick.test.ts",
    "scripts/qa-smoke.test.ts",
    "scripts/qa-write-smoke.test.ts",
    "scripts/agent-chat.test.ts",
    "scripts/local-infra-command.test.ts",
    "scripts/db-command-contract.test.ts",
  ],
  dashboard: [
    "apps/dashboard/src/proxy.test.ts",
    "apps/dashboard/src/proxy-role-guard.test.ts",
    "apps/dashboard/src/lib/navigation/route-role.test.ts",
    "apps/dashboard/src/lib/request-host.test.ts",
    "apps/dashboard/src/lib/setup-gate.test.ts",
    "apps/dashboard/src/lib/live-polling-policy.test.ts",
    "apps/dashboard/src/lib/form-quick-fill-coverage.test.ts",
    "apps/dashboard/src/lib/dev-form-fill.test.ts",
    "apps/dashboard/src/lib/universal-form-quick-fill.test.ts",
    "apps/dashboard/src/lib/navigation/lib.test.ts",
    "apps/dashboard/src/lib/members/member-list-input.test.ts",
    "apps/dashboard/src/lib/members/member-statement-lines.test.ts",
    "apps/dashboard/src/lib/members/member-status-words.test.ts",
    "apps/dashboard/src/lib/charges/charge-library-list-input.test.ts",
    "apps/dashboard/src/lib/charges/charges-page-conformance.test.ts",
    "apps/dashboard/src/lib/contributions/contribution-list-input.test.ts",
    "apps/dashboard/src/lib/contributions/contributions-page-conformance.test.ts",
  ],
  marketing: [
    "apps/marketing/src/lib/marketing-experience-policy.test.ts",
    "apps/marketing/src/lib/signup-flow.test.ts",
    "apps/marketing/src/lib/form-quick-fill-coverage.test.ts",
    "apps/marketing/src/lib/dev-form-fill.test.ts",
    "apps/marketing/src/lib/early-access.test.ts",
    "apps/marketing/src/lib/pricing-comparison.test.ts",
  ],
  mobile: [
    "apps/mobile/scripts/android-dev.test.ts",
    "apps/mobile/src/lib/mobile-service-url.test.ts",
    "apps/mobile/src/lib/mobile-session-invalidation.test.ts",
    "apps/mobile/src/lib/mobile-trpc-transport.test.ts",
    "apps/mobile/src/lib/date-only.test.ts",
    "apps/mobile/src/runtime/mobile-runtime-state.test.ts",
  ],
  api: [
    "apps/api/src/health.test.ts",
    "apps/api/src/qa-accelerator-config.test.ts",
    "apps/api/src/transformer.test.ts",
    "apps/api/src/trpc/error-contract.test.ts",
    "apps/api/src/rest/error-response.test.ts",
  ],
  domain: [
    "packages/domain/src/modules/finance.test.ts",
    "packages/domain/src/modules/qa-accelerator.test.ts",
    "packages/domain/src/modules/subscriptions.test.ts",
    "packages/utils/src/qa-testing.test.ts",
    "packages/utils/src/qa-fixtures.test.ts",
    "packages/utils/src/runtime-url.test.ts",
    "packages/utils/src/tenant-domains.test.ts",
    "packages/tenant-url/src/index.test.ts",
    "packages/auth/src/roles.test.ts",
    "packages/events/src/policy.test.ts",
    "packages/events/src/browser-context.test.ts",
    "packages/notifications/src/index.test.ts",
    "packages/notifications/src/email-routing.test.ts",
    "packages/db/src/queries/monthly-records.test.ts",
    "packages/db/src/query-error.test.ts",
    "packages/db/src/postgres-connection.test.ts",
  ],
}
export type Suite = keyof typeof suites
const allSuites = Object.keys(suites) as Suite[]

export type QuickOptions = {
  base?: string
  files?: string[]
  plan: boolean
  help: boolean
}
export const usage = `Usage: bun run test:quick [--base GIT_REF | --files PATH ...] [--plan]
Default: staged + unstaged + untracked files against HEAD.
--base adds merge-base..HEAD for committed branch work; no fetch is run.
--files selects explicit repository-relative paths (busy shared checkout).
--plan prints the selected tests without running anything.
Unmapped paths exit 2: review the area's offline tests, then extend the mapping.
Source smoke only. It never runs connected database or provider tests and does
not replace scoped typechecks or feature-specific integration proof.`

export function parseQuickArgs(args: string[]): QuickOptions {
  const options: QuickOptions = { plan: false, help: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--plan") options.plan = true
    else if (arg === "--help" || arg === "-h") options.help = true
    else if (arg === "--base") {
      options.base = args[++index]
      if (!options.base || options.base.startsWith("-"))
        throw new Error("--base needs a Git ref")
    } else if (arg === "--files") {
      options.files = []
      while (args[index + 1] && !args[index + 1]!.startsWith("--"))
        options.files.push(args[++index]!)
      if (!options.files.length)
        throw new Error("--files needs at least one repository-relative path")
    } else throw new Error(`Unknown argument: ${arg}`)
  }
  if (options.base && options.files)
    throw new Error("Use --base or --files, not both")
  return options
}

export function normalizeQuickPaths(files: string[]) {
  return [
    ...new Set(
      files.map((file) => {
        if (
          !file ||
          file.startsWith("/") ||
          file.startsWith("-") ||
          file.includes("\\") ||
          file.split("/").includes("..") ||
          /[\0\r\n]/.test(file)
        )
          throw new Error(
            "Expected repository-relative paths without traversal or control characters"
          )
        return file.replace(/^\.\//, "")
      })
    ),
  ].sort()
}

const rootManifests = new Set([
  "package.json",
  "bun.lock",
  "bunfig.toml",
  "turbo.json",
  "tsconfig.json",
  ".npmrc",
  ".prettierrc",
  ".prettierignore",
  ".eslintrc.js",
  "nativewind-env.d.ts",
  "docker-compose.yml",
  "release.config.ts",
  "app-update.config.ts",
  ".vercelignore",
  ".env.preview.example",
  ".env.production.example",
])
const sharedContracts =
  /^packages\/(auth|backfill|db|domain|email|errors|events|jobs|notifications|observability|tenant-url|utils)\//
const sharedWebUi = /^packages\/(ui|notifications-react|site-nav)\//

export function selectQuickPlan(files: string[]) {
  const paths = normalizeQuickPaths(files)
  const groups = new Set<Suite>(["core"])
  const unknown: string[] = []
  const add = (...names: Suite[]) => names.forEach((name) => groups.add(name))
  for (const file of paths) {
    if (
      /\.md$/.test(file) ||
      /^(\.brain|docs|artifacts|outputs|\.gstack)\//.test(file)
    )
      continue
    if (
      rootManifests.has(file) ||
      /^(apps|packages)\/[^/]+\/package\.json$/.test(file) ||
      /^packages\/(tsconfig|eslint-config)\//.test(file)
    )
      add(...allSuites)
    else if (/^scripts\//.test(file) || file === ".gitignore") add("core")
    else if (/^apps\/dashboard\//.test(file)) add("dashboard")
    else if (/^apps\/marketing\//.test(file)) add("marketing")
    else if (/^apps\/mobile\//.test(file) || file === ".easignore")
      add("mobile")
    // The dashboard calls the API router in-process; mobile consumes its contracts.
    else if (/^apps\/api\//.test(file)) add("api", "dashboard", "mobile")
    else if (sharedWebUi.test(file)) add("dashboard", "marketing")
    else if (sharedContracts.test(file)) add(...allSuites)
    else unknown.push(file)
  }
  const selected = allSuites.filter((name) => groups.has(name))
  return {
    paths,
    groups: selected,
    tests: [...new Set(selected.flatMap((name) => suites[name]))],
    unknown,
  }
}

export function readQuickChanges(root: string, base?: string) {
  function git(args: string[]) {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    })
    if (result.status !== 0)
      throw new Error(
        "Cannot determine changed files. Check that the base ref exists locally; nothing was skipped."
      )
    return result.stdout
  }
  const list = (args: string[]) => git(args).split("\0").filter(Boolean)
  const changed = list([
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    "HEAD",
    "--",
  ])
  changed.push(...list(["ls-files", "--others", "--exclude-standard", "-z"]))
  if (base) {
    const commit = git(["rev-parse", "--verify", `${base}^{commit}`]).trim()
    const ancestor = git(["merge-base", commit, "HEAD"]).trim()
    changed.push(
      ...list([
        "diff",
        "--name-only",
        "--no-renames",
        "-z",
        ancestor,
        "HEAD",
        "--",
      ])
    )
  }
  return normalizeQuickPaths(changed)
}

// Forward no developer credentials, profile files or opt-in flags. The DB URL
// is an unusable loopback sentinel so an accidental connection fails fast.
export function quickEnvironment(seed: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    TZ: "UTC",
    HALAALVEST_DATABASE_URL: "postgresql://unit-only@127.0.0.1:1/unused",
  }
  for (const key of ["PATH", "HOME", "USER", "TMPDIR", "TERM", "CI"])
    if (seed[key]) env[key] = seed[key]
  return env
}

export function prettierTargets(root: string, paths: string[]) {
  return paths.filter(
    (file) =>
      /\.(ts|tsx|js|mjs|cjs|json)$/.test(file) &&
      file !== "bun.lock" &&
      existsSync(resolve(root, file))
  )
}

export function runQuick(
  options: QuickOptions,
  root = resolve(import.meta.dir, "..")
) {
  if (options.help) {
    console.log(usage)
    return 0
  }
  const plan = selectQuickPlan(
    options.files ?? readQuickChanges(root, options.base)
  )
  console.log(
    JSON.stringify(
      {
        groups: plan.groups,
        tests: plan.tests.length,
        changed: plan.paths.length,
        unknown: plan.unknown,
        scope:
          "source smoke only; feature-specific verification remains required",
      },
      null,
      2
    )
  )
  if (plan.unknown.length) {
    console.error(
      "Unmapped changes need a reviewed test mapping; not reporting green."
    )
    return 2
  }
  for (const test of plan.tests)
    if (!existsSync(resolve(root, test)))
      throw new Error(`Configured test is missing: ${test}`)
  if (options.plan) {
    for (const test of plan.tests) console.log(`  ${test}`)
    return 0
  }
  const env = quickEnvironment(process.env)
  function run(label: string, command: string, args: string[]) {
    const started = Date.now()
    console.log(`\n${label}`)
    const result = spawnSync(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      timeout: 180000,
    })
    console.log(`${label}: ${((Date.now() - started) / 1000).toFixed(1)}s`)
    if (result.error || result.status !== 0)
      throw new Error(`${label} failed or timed out; see the output above.`)
  }
  run("QA tooling types", process.execPath, [
    "--env-file=/dev/null",
    "node_modules/typescript/bin/tsc",
    "--project",
    "scripts/tsconfig.qa.json",
  ])
  const formatted = prettierTargets(root, plan.paths)
  if (formatted.length)
    run("Changed-file Prettier", process.execPath, [
      "--env-file=/dev/null",
      "node_modules/prettier/bin/prettier.cjs",
      "--check",
      "--ignore-unknown",
      "--",
      ...formatted,
    ])
  // Explicit ./ paths stop Bun treating entries as recursive name filters.
  run("Focused source tests", process.execPath, [
    "--env-file=/dev/null",
    "test",
    ...plan.tests.map((file) => `./${file}`),
  ])
  console.log(
    "Fast checks passed. Scoped types and feature acceptance remain separate."
  )
  return 0
}

if (import.meta.main) {
  try {
    process.exitCode = runQuick(parseQuickArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Quick checks failed."
    )
    process.exitCode = 1
  }
}
