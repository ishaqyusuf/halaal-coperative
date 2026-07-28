#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { createServer } from "node:net"
import { resolve } from "node:path"
import { loadModeEnv } from "../../local-infra-kit/src/env"

export type LocalInfraEntrypoint = "dev" | "dev-services" | "with-env"
export type LocalInfraMode = "local" | "remote" | "prod"

type CommandEnv = Record<string, string | undefined>

const PROFILE = "halaalvest"
const PROFILE_ENV_MODE = "HALAALVEST_ENV_MODE"
const POSTGRES_CONTAINER = "halaalvest-postgres"
const POSTGRES_PORT = 55432
const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "postgres",
])

export function modeForCommand(
  entrypoint: LocalInfraEntrypoint,
  args: string[],
  env: CommandEnv = process.env
): LocalInfraMode {
  const modes = new Set<LocalInfraMode>()

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (entrypoint === "dev") {
      if (arg === "--local") modes.add("local")
      if (arg === "--remote" || arg === "--remote-dev") modes.add("remote")
      if (arg === "--prod") modes.add("prod")
      continue
    }

    if (arg === "--mode") {
      modes.add(normalizeMode(args[index + 1]))
      index += 1
      continue
    }

    if (arg?.startsWith("--mode=")) {
      modes.add(normalizeMode(arg.slice("--mode=".length)))
    }
  }

  if (modes.size > 1) {
    throw new Error("Conflicting local-infra modes. Choose one mode.")
  }

  return [...modes][0] ?? normalizeMode(env[PROFILE_ENV_MODE] ?? "local")
}

function normalizeMode(value: string | undefined): LocalInfraMode {
  if (value === "local" || value === "development") return "local"
  if (value === "remote" || value === "remote-dev") return "remote"
  if (value === "prod" || value === "production") return "prod"

  throw new Error(
    `Unknown local-infra mode "${value ?? ""}". Use local, remote, or prod.`
  )
}

export function envForMode(
  mode: LocalInfraMode,
  workspaceRoot: string,
  processEnv: CommandEnv
) {
  const prodFile = resolve(workspaceRoot, ".env.prod")

  if (mode === "prod" && !existsSync(prodFile)) {
    throw new Error(
      "Missing .env.prod. Production local-infra commands do not load legacy env files."
    )
  }

  const fileEnv = loadModeEnv(workspaceRoot, mode)

  return {
    ...processEnv,
    ...fileEnv,
    HALAALVEST_DB_MODE: mode === "remote" ? "remote-dev" : mode,
    HALAALVEST_ENV_MODE: mode,
  }
}

export function validateDatabaseForMode(mode: LocalInfraMode, env: CommandEnv) {
  if (mode === "local") return

  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      `Missing DATABASE_URL for ${mode} mode. Check the standard mode env file.`
    )
  }

  try {
    if (LOCAL_DATABASE_HOSTS.has(new URL(databaseUrl).hostname)) {
      throw new Error(
        `Refusing ${mode} mode with a local DATABASE_URL. Check the standard mode env file.`
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Refusing ")) {
      throw error
    }

    throw new Error(`Invalid DATABASE_URL for ${mode} mode.`)
  }
}

export function validatePortOwner(
  occupied: boolean,
  owner: string | undefined
) {
  if (!occupied || owner === POSTGRES_CONTAINER) return

  throw new Error(
    [
      `Cannot start Halaalvest PostgreSQL: 127.0.0.1:${POSTGRES_PORT} is owned by ${owner ?? "another process"}.`,
      "Stop the owning service before retrying. School Clerk and Halaalvest cannot run PostgreSQL simultaneously on this port.",
    ].join("\n")
  )
}

async function dockerContainerOwningPort() {
  const result = Bun.spawnSync(
    ["docker", "ps", "--format", "{{.Names}}\t{{.Ports}}"],
    { stderr: "ignore", stdout: "pipe" }
  )

  if (result.exitCode !== 0) return undefined

  for (const line of result.stdout.toString().split(/\r?\n/)) {
    const [name, ports = ""] = line.split("\t")

    if (name && ports.includes(`:${POSTGRES_PORT}->`)) return name
  }

  return undefined
}

async function portIsOccupied() {
  return await new Promise<boolean>((resolvePromise, reject) => {
    const server = createServer()

    server.once("error", () => {
      resolvePromise(true)
    })
    server.listen(POSTGRES_PORT, "127.0.0.1", () => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolvePromise(false)
      })
    })
  })
}

async function run(command: string[], cwd: string, env: CommandEnv) {
  const child = Bun.spawn(command, {
    cwd,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })

  process.exit(await child.exited)
}

async function main() {
  const [entrypointValue, ...args] = Bun.argv.slice(2)

  if (
    entrypointValue !== "dev" &&
    entrypointValue !== "dev-services" &&
    entrypointValue !== "with-env"
  ) {
    throw new Error(
      "Use local-infra-command.ts dev, dev-services, or with-env."
    )
  }

  const workspaceRoot = resolve(import.meta.dir, "..")
  const mode = modeForCommand(entrypointValue, args)
  const effectiveEnv = envForMode(mode, workspaceRoot, process.env)

  validateDatabaseForMode(mode, effectiveEnv)

  if (mode === "local" && entrypointValue !== "with-env") {
    validatePortOwner(await portIsOccupied(), await dockerContainerOwningPort())
  }

  const toolkitBin = resolve(
    workspaceRoot,
    `../local-infra-kit/bin/${entrypointValue}.ts`
  )

  if (!existsSync(toolkitBin)) {
    throw new Error(
      `Could not find local-infra-kit entrypoint at ${toolkitBin}.`
    )
  }

  await run(
    ["bun", "--env-file=/dev/null", toolkitBin, "--profile", PROFILE, ...args],
    workspaceRoot,
    effectiveEnv
  )
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
