#!/usr/bin/env bun

import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { localOrigins } from "./lib/local-dev-targets"
import { envForMode, localDatabasePort } from "./local-infra-command"
import { browserEnvironment } from "./qa-smoke"

// Opt-in One Path write smoke: sign up a throwaway QA cooperative, finish
// setup and go live, then delete it. Never part of `qa:smoke`. It fails closed
// unless every target is local: the named local hosts, a loopback database,
// a reserved `.qa.test` domain and an explicit --confirm-local-write flag.
// The browser stages live in scripts/qa-write-smoke-driver.mjs.

export type WriteSmokeOptions = {
  command: "plan" | "run" | "cleanup"
  confirmLocalWrite: boolean
  qaDomain: string
  runId?: string
  keep: boolean
  help: boolean
}

export const usage = `Usage: bun run qa:smoke:write plan [--qa-domain onepath.qa.test]
       bun run qa:smoke:write run --confirm-local-write [--qa-domain D] [--keep]
       bun run qa:smoke:write cleanup --confirm-local-write --run RUN_ID [--qa-domain D]
Creates and then deletes a throwaway One Path cooperative on the LOCAL stack
only (${localOrigins.marketing}, *.halaalvest-dash.localhost, loopback Postgres).
Refuses hosted databases, other hosts and non-.qa.test domains. Not run by
qa:smoke or test:quick.`

export function parseWriteArgs(args: string[]): WriteSmokeOptions {
  const [command, ...rest] = args
  const options: WriteSmokeOptions = {
    command: "plan",
    confirmLocalWrite: false,
    qaDomain: "onepath.qa.test",
    keep: false,
    help: false,
  }
  if (
    !command ||
    command === "--help" ||
    command === "-h" ||
    command === "help"
  )
    return { ...options, help: true }
  if (command !== "plan" && command !== "run" && command !== "cleanup")
    throw new Error(`Unknown command: ${command}. Use plan, run or cleanup.`)
  options.command = command
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    const value = () => {
      const next = rest[++index]
      if (!next || next.startsWith("-"))
        throw new Error(`Missing value for ${arg}`)
      return next
    }
    if (arg === "--confirm-local-write") options.confirmLocalWrite = true
    else if (arg === "--qa-domain") options.qaDomain = value().toLowerCase()
    else if (arg === "--run") options.runId = value()
    else if (arg === "--keep") options.keep = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (options.command === "cleanup" && !options.runId)
    throw new Error("cleanup needs --run RUN_ID (from the run receipt).")
  return options
}

const runIdPattern = /^[a-z0-9]{8}$/

export function newRunId(bytes: Buffer = randomBytes(5)) {
  return bytes.toString("hex").slice(0, 8)
}

// Every identity is derived from the run ID, so cleanup can find exactly what
// one run created and nothing else.
export function planWriteSmoke(runId: string, qaDomain: string) {
  if (!runIdPattern.test(runId))
    throw new Error("Run IDs are 8 lower-case hex characters.")
  const letters = runId
    .slice(0, 3)
    .split("")
    .map((char) => String.fromCharCode(65 + (parseInt(char, 16) % 26)))
    .join("")
  return {
    runId,
    qaDomain,
    slug: `qa-smoke-${runId}`,
    cooperativeName: `QA Smoke ${runId}`,
    ownerName: `QA Smoke Admin ${runId}`,
    ownerEmail: `smoke-${runId}@${qaDomain}`,
    // Five letters keeps clear of real prefixes, which are 3-4 letters in practice.
    cooperativeCodePrefix: `QS${letters}`,
    stages: writeStages,
  }
}

export const writeStages = [
  { key: "signup", label: "Marketing sign-up (step 1)", implemented: true },
  {
    key: "verify-email",
    label: "Open the console/QA verification link (step 2)",
    implemented: true,
  },
  {
    key: "onboarding",
    label: "Onboarding details, password, legal (steps 3-4)",
    implemented: true,
  },
  {
    key: "handoff",
    label: "Automatic sign-in via /auth/handoff",
    implemented: true,
  },
  {
    key: "setup",
    label: "Dashboard setup steps 5-9 with Quick Fill",
    implemented: true,
  },
  {
    key: "members",
    label: "Members checklist to Ready (step 10)",
    implemented: true,
  },
  {
    key: "go-live",
    label: "Tick the confirmation and go live (step 11)",
    implemented: true,
  },
  {
    key: "verify-live",
    label: "Tenant is live; /getting-started redirects home",
    implemented: true,
  },
] as const

export type LocalWriteTarget = { databasePort: number }

// Fails closed: any doubt about the target is a refusal, before any write.
export function assertLocalWriteTarget(
  options: Pick<WriteSmokeOptions, "confirmLocalWrite" | "qaDomain">,
  env: NodeJS.ProcessEnv
): LocalWriteTarget {
  if (!options.confirmLocalWrite)
    throw new Error("Refusing to write without --confirm-local-write.")
  if (!/^[a-z0-9-]+\.qa\.test$/.test(options.qaDomain))
    throw new Error(
      "The QA domain must end in .qa.test (reserved, never deliverable)."
    )
  const mode = env.HALAALVEST_ENV_MODE ?? "local"
  if (mode !== "local")
    throw new Error(`Refusing ${mode} mode; the write smoke is local only.`)
  if (/^prod/i.test(env.APP_ENV ?? "") || /^prod/i.test(env.NODE_ENV ?? ""))
    throw new Error("Refusing a production APP_ENV/NODE_ENV.")
  let databasePort: number | undefined
  try {
    databasePort = localDatabasePort(env)
  } catch {
    throw new Error(
      "HALAALVEST_DATABASE_URL is missing or invalid; no values were printed."
    )
  }
  if (databasePort === undefined)
    throw new Error(
      "Refusing a non-loopback database; the write smoke only touches local Postgres."
    )
  return { databasePort }
}

export function assertCleanupTarget(
  tenant: {
    slug: string
    dataClassification: string
    qaSourceDomain: string | null
  },
  plan: ReturnType<typeof planWriteSmoke>
) {
  if (
    tenant.slug !== plan.slug ||
    tenant.dataClassification !== "qa" ||
    tenant.qaSourceDomain !== plan.qaDomain
  )
    throw new Error(
      `Refusing to delete ${tenant.slug}: it is not this run's QA tenant.`
    )
}

// The slice of @halaalvest/db cleanup uses. Typed locally so the QA tooling
// typecheck in test:quick does not pull in the whole database package graph.
type CleanupTenant = {
  id: string
  slug: string
  cooperativeCodePrefix: string | null
  dataClassification: string
  qaSourceDomain: string | null
  updatedAt: Date
}
type CleanupDb = {
  createPrismaClient: () => {
    tenant: {
      findUnique: (args: {
        where: { slug: string }
      }) => Promise<CleanupTenant | null>
    }
  } | null
  markQaTenantForPurge: (input: {
    cooperativeCodePrefix: string
    id: string
    qaSourceDomain: string
    slug: string
    startedAt: Date
    updatedAt: Date
  }) => Promise<unknown>
  deleteQaTenant: (
    tenantId: string,
    prismaOverride: undefined,
    expectedStartedAt: Date
  ) => Promise<unknown>
}
const databaseModule = "@halaalvest/db"

async function cleanup(plan: ReturnType<typeof planWriteSmoke>) {
  // Imported late so `plan` and the guards never load Prisma.
  const { createPrismaClient, deleteQaTenant, markQaTenantForPurge } =
    (await import(databaseModule)) as CleanupDb
  const prisma = createPrismaClient()
  if (!prisma)
    throw new Error("Prisma is not configured for the local database.")
  const tenant = await prisma.tenant.findUnique({ where: { slug: plan.slug } })
  if (!tenant) return { tenantDeleted: false }
  assertCleanupTarget(tenant, plan)
  if (!tenant.cooperativeCodePrefix)
    throw new Error(
      `${tenant.slug} has no access-code prefix; delete it by hand.`
    )
  // The existing QA purge path: mark, then delete. Users, memberships and
  // tenant data cascade with the tenant row.
  const startedAt = new Date()
  await markQaTenantForPurge({
    cooperativeCodePrefix: tenant.cooperativeCodePrefix,
    id: tenant.id,
    qaSourceDomain: plan.qaDomain,
    slug: tenant.slug,
    startedAt,
    updatedAt: tenant.updatedAt,
  })
  await deleteQaTenant(tenant.id, undefined, startedAt)
  return { tenantDeleted: true }
}

export async function runWriteSmoke(
  options: WriteSmokeOptions,
  root = resolve(import.meta.dir, "..")
) {
  if (options.help) {
    console.log(usage)
    return 0
  }
  const runId = options.runId ?? newRunId()
  const plan = planWriteSmoke(runId, options.qaDomain)
  if (options.command === "plan") {
    console.log(
      JSON.stringify(
        { ...plan, stages: plan.stages.map((s) => s.label) },
        null,
        2
      )
    )
    return 0
  }
  const env: NodeJS.ProcessEnv = envForMode("local", root, process.env)
  const target = assertLocalWriteTarget(options, env)
  console.log(
    `Local write target verified: loopback Postgres :${target.databasePort}, ${options.qaDomain}.`
  )
  // Prisma reads the profile URL from process.env; keep it to the verified local value.
  process.env.HALAALVEST_DATABASE_URL = env.HALAALVEST_DATABASE_URL
  const directory = resolve(root, ".scratch/qa-smoke/write")
  mkdirSync(directory, { recursive: true })
  if (options.command === "cleanup") {
    const result = await cleanup(plan)
    console.log(
      `Cleanup for run ${runId}: ${plan.slug} ${result.tenantDeleted ? "deleted" : "not found"}.`
    )
    return 0
  }
  // Cleanup runs even when the driver crashes part-way through a sign-up.
  const result = await runBrowserStages(plan, root, env, directory).catch(
    (error) => ({
      stages: [
        {
          key: "driver",
          status: "fail" as const,
          ms: 0,
          detail: error instanceof Error ? error.message : "driver failed",
        },
      ],
      blocked: [] as string[],
      artifacts: resolve(directory, "artifacts", runId),
    })
  )
  const pending = plan.stages.filter((stage) => !stage.implemented)
  let cleanupResult: { tenantDeleted: boolean } | { error: string } = {
    tenantDeleted: false,
  }
  if (!options.keep)
    cleanupResult = await cleanup(plan).catch((error) => ({
      error: error instanceof Error ? error.message : "cleanup failed",
    }))
  const passed =
    result.stages.length > 0 &&
    result.stages.every((stage) => stage.status === "pass") &&
    pending.length === 0
  const receipt = {
    runId,
    plan: {
      ...plan,
      stages: undefined,
    },
    status: passed
      ? "passed"
      : result.stages.some((s) => s.status === "fail")
        ? "failed"
        : "partial",
    stages: result.stages,
    pending: pending.map((stage) => stage.key),
    blocked: result.blocked,
    kept: options.keep,
    cleanup: cleanupResult,
    artifacts: result.artifacts,
  }
  const receiptFile = resolve(directory, `receipt-${runId}.json`)
  writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, {
    mode: 0o600,
  })
  for (const stage of result.stages)
    console.log(
      `${stage.status.toUpperCase()} ${stage.key} (${(stage.ms / 1000).toFixed(1)}s)${stage.detail ? `: ${stage.detail}` : ""}`
    )
  if (pending.length)
    console.log(
      `Not written yet: ${pending.map((stage) => stage.key).join(", ")}`
    )
  if (result.blocked.length)
    console.log(`Blocked non-local requests: ${result.blocked.join(", ")}`)
  console.log(
    options.keep
      ? `Kept ${plan.slug}; delete it with: bun run qa:smoke:write cleanup --confirm-local-write --run ${runId}`
      : "error" in cleanupResult
        ? `Cleanup failed: ${cleanupResult.error}. Retry: bun run qa:smoke:write cleanup --confirm-local-write --run ${runId}`
        : `Cleanup: ${plan.slug} ${cleanupResult.tenantDeleted ? "deleted" : "not created"}.`
  )
  console.log(`Receipt: ${receiptFile}`)
  if (passed && !("error" in cleanupResult)) return 0
  return pending.length && !result.stages.some((s) => s.status === "fail")
    ? 3
    : 1
}

// Local stand-in for the owner's early-access approval: the same signed token
// the approval email carries, minted with the marketing app's own code and
// the local profile's secret. Never printed or stored in the receipt.
export function mintApprovalToken(
  plan: ReturnType<typeof planWriteSmoke>,
  root: string,
  env: NodeJS.ProcessEnv
) {
  const result = spawnSync(
    "bun",
    [
      "-e",
      `import { createSignedSignupApprovalToken, createSignupApprovalPayload } from "./src/lib/early-access"
process.stdout.write(createSignedSignupApprovalToken(createSignupApprovalPayload(JSON.parse(process.env.QA_WRITE_SMOKE_APPROVAL ?? "{}"))))`,
    ],
    {
      cwd: resolve(root, "apps/marketing"),
      encoding: "utf8",
      env: {
        ...env,
        NODE_ENV: "development",
        QA_WRITE_SMOKE_APPROVAL: JSON.stringify({
          cooperativeName: plan.cooperativeName,
          primaryContactEmail: plan.ownerEmail,
          primaryContactFullName: plan.ownerName,
        }),
      },
      timeout: 60_000,
    }
  )
  const token = result.stdout.trim()
  if (result.status !== 0 || !/^[\w-]+\.[\w-]+$/.test(token))
    throw new Error("Could not mint the local early-access approval.")
  return token
}

type StageResult = {
  key: string
  status: "pass" | "fail" | "skipped"
  ms: number
  detail: string
}

async function runBrowserStages(
  plan: ReturnType<typeof planWriteSmoke>,
  root: string,
  env: NodeJS.ProcessEnv,
  directory: string
) {
  const artifacts = resolve(directory, "artifacts", plan.runId)
  mkdirSync(artifacts, { recursive: true })
  const planFile = resolve(directory, `plan-${plan.runId}.json`)
  writeFileSync(
    planFile,
    JSON.stringify({
      ...plan,
      stages: undefined,
      approvalToken: mintApprovalToken(plan, root, env),
      ownerPassword: `Qa-${randomBytes(9).toString("base64url")}9`,
      marketingOrigin: localOrigins.marketing,
      dashboardHost: new URL(localOrigins.dashboard).hostname,
    }),
    { mode: 0o600 }
  )
  try {
    const driver = Bun.spawn(
      [
        "node",
        resolve(root, "scripts/qa-write-smoke-driver.mjs"),
        planFile,
        artifacts,
      ],
      {
        cwd: root,
        env: browserEnvironment(),
        stdin: "ignore",
        stdout: "pipe",
        stderr: "inherit",
      }
    )
    const timeout = setTimeout(() => driver.kill(), 15 * 60_000)
    const stdout = await new Response(driver.stdout).text()
    await driver.exited
    clearTimeout(timeout)
    const line = stdout
      .split("\n")
      .reverse()
      .find((entry) => entry.startsWith("{"))
    if (!line)
      throw new Error(
        "The write smoke driver failed before reporting; see the output above (bun run qa:smoke:install-browser if Chromium is missing)."
      )
    const parsed = JSON.parse(line) as {
      stages: StageResult[]
      blocked: string[]
    }
    return { ...parsed, artifacts }
  } finally {
    // The plan holds the run's password and approval token.
    rmSync(planFile, { force: true })
  }
}

if (import.meta.main) {
  let code = 1
  try {
    code = await runWriteSmoke(parseWriteArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "qa:smoke:write failed."
    )
  }
  // Exit explicitly: an open Prisma pool would otherwise keep the process alive.
  process.exit(code)
}
