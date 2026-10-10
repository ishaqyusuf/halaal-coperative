import { readFileSync } from "node:fs"

type Environment = Record<string, string | undefined>
export const PRODUCTION_TRIGGER_PROJECT = "proj_ajaddxidcuphhhckxwja"

export const TRIGGER_JOB_ENV_KEYS = [
  "HALAALVEST_DATABASE_URL",
  "HALAALVEST_TRIGGER_PROJECT_ID",
  "APP_ENV",
  "EMAIL_DELIVERY_MODE",
  "EMAIL_FROM_ADDRESS",
  "EMAIL_QA_DOMAIN_ROUTES",
  "EMAIL_REPLY_TO",
  "EMAIL_TEST_RECIPIENT",
  "EMAIL_TEST_MODE",
  "RESEND_API_KEY",
  "SENTRY_DSN_JOBS",
  "SENTRY_ENVIRONMENT_JOBS",
  "SENTRY_RELEASE_JOBS",
  "TEST_EMAIL",
  "TRIGGER_SECRET_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "VERCEL_TEAM_ID",
  "VERCEL_TEAM_SLUG",
  "VERCEL_PROJECT_ID",
  "VERCEL_API_TOKEN",
  "UPLOAD_DIR",
] as const

export function readTriggerEnvironment(path: string): Environment {
  let contents: string
  try {
    contents = readFileSync(path, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}
    throw error
  }
  return Object.fromEntries(
    contents.split(/\r?\n/).flatMap((line) => {
      const match = line
        .trim()
        .match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) return []
      const value = match[2]!.trim()
      return [
        [match[1]!, /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value],
      ]
    })
  )
}

export function triggerProjectForConfigEnv(env: Environment) {
  const project =
    env.TRIGGER_PROJECT_ID?.trim() || env.HALAALVEST_TRIGGER_PROJECT_ID?.trim()
  if (!project || !/^proj_[A-Za-z0-9]+$/.test(project))
    throw new Error(
      "TRIGGER_PROJECT_ID must identify the selected HalaalVest project."
    )
  if (env.APP_ENV === "production" && project !== PRODUCTION_TRIGGER_PROJECT)
    throw new Error(
      "Production jobs must use the owned HalaalVest Trigger project."
    )
  if (env.APP_ENV === "preview" && project === PRODUCTION_TRIGGER_PROJECT)
    throw new Error("Preview jobs requires its separate Trigger project.")
  if (
    env.TRIGGER_PROJECT_ID &&
    env.HALAALVEST_TRIGGER_PROJECT_ID &&
    env.TRIGGER_PROJECT_ID !== env.HALAALVEST_TRIGGER_PROJECT_ID
  )
    throw new Error("Conflicting Trigger project identities.")
  return project
}

function databaseIdentity(value: string | undefined) {
  if (!value)
    throw new Error("The selected jobs file must own HALAALVEST_DATABASE_URL.")
  const url = new URL(value)
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname ||
    url.pathname === "/"
  )
    throw new Error("Invalid jobs database target.")
  return `${url.hostname.toLowerCase().replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`
}

export function selectedTriggerDeployEnvironment(
  env: Environment,
  selected: Environment,
  production: Environment
) {
  if (!["preview", "production"].includes(env.APP_ENV ?? ""))
    throw new Error("Jobs deployment requires Preview or Production.")
  if (selected.APP_ENV && selected.APP_ENV !== env.APP_ENV)
    throw new Error("Selected jobs file has a conflicting APP_ENV.")
  const mode = env.APP_ENV === "production" ? "prod" : "preview"
  if (
    env.HALAALVEST_ENV_MODE !== mode ||
    selected.HALAALVEST_DATABASE_URL?.trim() !==
      env.HALAALVEST_DATABASE_URL?.trim()
  )
    throw new Error(
      "Jobs deployment requires the selected workspace database profile."
    )
  const result = { ...env }
  for (const key of [
    ...TRIGGER_JOB_ENV_KEYS,
    "TRIGGER_PROJECT_ID",
    "TRIGGER_ACCESS_TOKEN",
    "TRIGGER_PROFILE",
    "TRIGGER_API_URL",
    "TRIGGER_PROJECT_REF",
    "TRIGGER_PREVIEW_BRANCH",
    "TRIGGER_EXISTING_DEPLOYMENT_ID",
  ]) {
    if (key === "APP_ENV") continue
    delete result[key]
    const value = selected[key]?.trim()
    if (value) result[key] = value
  }
  result.HALAALVEST_TRIGGER_PROJECT_ID = result.TRIGGER_PROJECT_ID
  triggerProjectForConfigEnv(result)
  if (!/^tr_prod_[A-Za-z0-9_-]{1,512}$/.test(result.TRIGGER_SECRET_KEY ?? ""))
    throw new Error(
      "The selected jobs file requires its own hosted prod TRIGGER_SECRET_KEY."
    )
  if (!result.TRIGGER_ACCESS_TOKEN)
    throw new Error(
      "The selected jobs file requires TRIGGER_ACCESS_TOKEN for CLI deployment."
    )
  const selectedDatabase = databaseIdentity(result.HALAALVEST_DATABASE_URL)
  if (env.APP_ENV === "preview") {
    if (
      selectedDatabase === databaseIdentity(production.HALAALVEST_DATABASE_URL)
    )
      throw new Error("Preview jobs refuses the Production database target.")
    for (const key of [
      "TRIGGER_SECRET_KEY",
      "RESEND_API_KEY",
      "BLOB_READ_WRITE_TOKEN",
      "VERCEL_API_TOKEN",
    ]) {
      if (result[key] && result[key] === production[key]?.trim())
        throw new Error(`Preview jobs refuses the Production value for ${key}.`)
    }
  }
  if (
    result.TRIGGER_API_URL &&
    result.TRIGGER_API_URL !== "https://api.trigger.dev"
  )
    throw new Error("Jobs deployment refuses an alternate Trigger API URL.")
  if (
    result.TRIGGER_PREVIEW_BRANCH ||
    result.TRIGGER_EXISTING_DEPLOYMENT_ID ||
    (result.TRIGGER_PROJECT_REF &&
      result.TRIGGER_PROJECT_REF !== result.TRIGGER_PROJECT_ID)
  )
    throw new Error("Jobs deployment refuses target overrides.")
  return result
}

export function triggerDeployCommand(command: string[], env: Environment) {
  const flags = new Set([
    "--dry-run",
    "--skip-update-check",
    "--skip-telemetry",
    "--skip-promotion",
    "--plain",
    "--no-cache",
  ])
  if (
    command[0] !== "trigger" ||
    command[1] !== "deploy" ||
    command.slice(2).some((flag) => !flags.has(flag))
  )
    throw new Error(
      "Jobs deployment refuses CLI overrides; use the selected workspace profile."
    )
  return [
    "trigger",
    "deploy",
    ...command.slice(2),
    "--env",
    "prod",
    "--project-ref",
    triggerProjectForConfigEnv(env),
    "--config",
    "trigger.config.ts",
    "--env-file",
    "/dev/null",
    "--skip-update-check",
  ]
}

export function syncedTriggerJobEnvironment(env: Environment) {
  return Object.fromEntries(
    // Import is an upsert, so omitted keys would retain hosted credentials.
    // Explicit empty values disable optional managed settings removed locally.
    TRIGGER_JOB_ENV_KEYS.map((key) => [key, env[key]?.trim() || ""])
  )
}
