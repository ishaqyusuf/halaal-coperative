#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { createServer } from "node:net"
import { resolve } from "node:path"
import { loadModeEnv } from "../../local-infra-kit/src/env"

export type LocalInfraEntrypoint = "dev" | "dev-services" | "with-env"
export type LocalInfraMode = "local" | "preview" | "prod"

type CommandEnv = Record<string, string | undefined>

const PROFILE = "halaalvest"
const PROFILE_ENV_MODE = "HALAALVEST_ENV_MODE"
const POSTGRES_CONTAINER = "halaalvest-postgres"
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

    if (arg === "--") break

    if (entrypoint === "dev") {
      if (arg === "--remote" || arg === "--remote-dev") {
        throw new Error(`Unknown local-infra mode flag: ${arg}. Use --preview.`)
      }
      if (arg === "--local") modes.add("local")
      if (arg === "--preview") modes.add("preview")
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
  if (value === "preview") return "preview"
  if (value === "prod" || value === "production") return "prod"

  throw new Error(
    `Unknown local-infra mode "${value ?? ""}". Use local, preview, or prod.`
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
    HALAALVEST_DB_MODE: mode === "preview" ? "preview" : mode,
    HALAALVEST_ENV_MODE: mode,
  }
}

export function validateDatabaseForMode(mode: LocalInfraMode, env: CommandEnv) {
  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      `Missing DATABASE_URL for ${mode} mode. Check the standard mode env file.`
    )
  }

  try {
    const isLocal = LOCAL_DATABASE_HOSTS.has(new URL(databaseUrl).hostname)

    if (mode === "local" && !isLocal) {
      throw new Error(
        "Refusing local mode with a non-local DATABASE_URL. Check .env.local."
      )
    }

    if (mode !== "local" && isLocal) {
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

export function localDatabasePort(env: CommandEnv) {
  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL for local mode. Check .env.local.")
  }

  try {
    const url = new URL(databaseUrl)

    if (!LOCAL_DATABASE_HOSTS.has(url.hostname)) {
      throw new Error(
        "Refusing local mode with a non-local DATABASE_URL. Check .env.local."
      )
    }

    const port = Number(url.port || "5432")

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("Invalid local PostgreSQL port in DATABASE_URL.")
    }

    return port
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Refusing ")) {
      throw error
    }

    if (
      error instanceof Error &&
      error.message === "Invalid local PostgreSQL port in DATABASE_URL."
    ) {
      throw error
    }

    throw new Error("Invalid DATABASE_URL for local mode.")
  }
}

export function validatePortOwner(
  postgresPort: number,
  occupied: boolean,
  owner: string | undefined
) {
  if (!occupied || owner === POSTGRES_CONTAINER) return

  throw new Error(
    [
      `Cannot start Halaalvest PostgreSQL: 127.0.0.1:${postgresPort} is owned by ${owner ?? "another process"}.`,
      "Choose a free port in .env.local or stop the owning service before retrying.",
    ].join("\n")
  )
}

async function dockerContainerOwningPort(postgresPort: number) {
  const result = Bun.spawnSync(
    ["docker", "ps", "--format", "{{.Names}}\t{{.Ports}}"],
    { stderr: "ignore", stdout: "pipe" }
  )

  if (result.exitCode !== 0) return undefined

  for (const line of result.stdout.toString().split(/\r?\n/)) {
    const [name, ports = ""] = line.split("\t")

    if (name && ports.includes(`:${postgresPort}->`)) return name
  }

  return undefined
}

async function portIsOccupied(postgresPort: number) {
  return await new Promise<boolean>((resolvePromise, reject) => {
    const server = createServer()

    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resolvePromise(true)
        return
      }

      reject(error)
    })
    server.listen(postgresPort, "127.0.0.1", () => {
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
    const postgresPort = localDatabasePort(effectiveEnv)
    validatePortOwner(
      postgresPort,
      await portIsOccupied(postgresPort),
      await dockerContainerOwningPort(postgresPort)
    )
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
