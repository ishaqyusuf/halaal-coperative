#!/usr/bin/env bun

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { connect } from "node:net"
import { resolve } from "node:path"
import { envFileForMode } from "../../local-infra-kit/src/env"
import {
  localOrigins,
  localPorts,
  portlessCertificateAuthority,
  portlessPortFor,
  readPortlessRoutes,
  staticProbePath,
  type PortlessRoute,
} from "./lib/local-dev-targets"
import {
  envForMode,
  localDatabasePort,
  validateDatabaseForMode,
} from "./local-infra-command"

export type DoctorProfile = "local" | "dev" | "preview"
export type DoctorService = "api" | "dashboard" | "marketing" | "mobile"
export type DoctorOptions = {
  profile: DoctorProfile
  services: DoctorService[]
  offline: boolean
  database: boolean
  requireQa: boolean
  help: boolean
}
export type Check = {
  name: string
  status: "pass" | "fail" | "skip"
  detail: string
}
export type DoctorProbes = {
  request: (url: string) => Promise<Response>
  tcp: (port: number) => Promise<boolean>
  docker: () => { ok: boolean; status?: string; ports?: string }
  routes: () => PortlessRoute[]
}

const POSTGRES_CONTAINER = "halaalvest-postgres"
const services: DoctorService[] = ["api", "dashboard", "marketing", "mobile"]

export const usage = `Usage: bun run qa:doctor [--profile local|dev|preview] [--services api,dashboard,marketing,mobile]
  --offline       Configuration checks only; no Docker, port or HTTP probes
  --database      Probe API /ready (one SELECT 1) instead of SQL-free /live
  --require-qa    Also require the QA accelerator capability (implies --database)
Default services: api,dashboard,marketing. Default profile: local.
Default mode is SQL-free: API /live plus static assets on the named hosts.
Nothing is started, migrated, seeded or reconfigured. No env values are printed.`

export function parseDoctorArgs(args: string[]): DoctorOptions {
  const options: DoctorOptions = {
    profile: "local",
    services: ["api", "dashboard", "marketing"],
    offline: false,
    database: false,
    requireQa: false,
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const value = () => {
      const next = args[++index]
      if (!next || next.startsWith("-"))
        throw new Error(`Missing value for ${arg}`)
      return next
    }
    if (arg === "--profile") {
      const profile = value()
      if (profile !== "local" && profile !== "dev" && profile !== "preview")
        throw new Error("qa:doctor supports local, dev and preview only.")
      options.profile = profile
    } else if (arg === "--services") {
      const requested = [...new Set(value().split(","))]
      if (requested.some((name) => !services.includes(name as DoctorService)))
        throw new Error("Unknown service. Use api,dashboard,marketing,mobile.")
      options.services = requested as DoctorService[]
    } else if (arg === "--offline") options.offline = true
    else if (arg === "--database") options.database = true
    else if (arg === "--require-qa") options.requireQa = true
    else if (arg === "--help" || arg === "-h") options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (options.requireQa) options.database = true
  if (
    (options.database || options.services.includes("mobile")) &&
    !options.services.includes("api")
  )
    options.services.unshift("api")
  return options
}

export type ProfileState = {
  checks: Check[]
  databasePort?: number
}

export function inspectDoctorConfig(
  root: string,
  profile: DoctorProfile,
  processEnv: NodeJS.ProcessEnv = process.env
): ProfileState {
  const checks: Check[] = []
  const profileFile = envFileForMode(profile)
  let databasePort: number | undefined
  if (
    !existsSync(resolve(root, ".env")) ||
    !existsSync(resolve(root, profileFile))
  ) {
    checks.push({
      name: "env profile",
      status: "fail",
      detail: `Missing .env or ${profileFile}; copy the matching .example file.`,
    })
  } else {
    try {
      const env = envForMode(profile, root, processEnv)
      validateDatabaseForMode(profile, env)
      databasePort = profile === "local" ? localDatabasePort(env) : undefined
      checks.push({
        name: "env profile",
        status: "pass",
        detail:
          profile !== "local"
            ? `.env + ${profileFile}: hosted ${profile} database configured; never probed by default.`
            : databasePort === undefined
              ? `.env + ${profileFile}: HALAALVEST_DATABASE_URL is not loopback; local DB checks skipped.`
              : `.env + ${profileFile}: local PostgreSQL on 127.0.0.1:${databasePort}.`,
      })
    } catch {
      checks.push({
        name: "env profile",
        status: "fail",
        detail: `HALAALVEST_DATABASE_URL is missing or invalid in ${profileFile}; no values were printed.`,
      })
    }
  }
  for (const [name, file, repair] of [
    ["dependencies", "node_modules/.bin/turbo", "Run bun install."],
    [
      "local-infra-kit",
      "../local-infra-kit/bin/dev.ts",
      "Check out local-infra-kit beside this repository.",
    ],
    [
      "prisma client",
      "packages/db/generated/prisma",
      "Run bun run db:generate (schema-only generation).",
    ],
  ] as const) {
    const present = existsSync(resolve(root, file))
    checks.push({
      name,
      status: present ? "pass" : "fail",
      detail: present ? "Present; freshness is not certified." : repair,
    })
  }
  return { checks, databasePort }
}

export function qaEnvironmentsFor(profile: DoctorProfile) {
  if (profile === "preview") return ["preview"]
  if (profile === "dev") return ["development"]
  return ["local", "development"]
}

export async function inspectDoctorRuntime(
  options: DoctorOptions,
  state: ProfileState,
  probes: DoctorProbes
): Promise<Check[]> {
  const checks: Check[] = []
  const routes = probes.routes()

  if (options.profile === "local" && state.databasePort !== undefined) {
    const container = probes.docker()
    const listening = await probes.tcp(state.databasePort)
    const up = container.ok && /^Up\b/.test(container.status ?? "")
    checks.push({
      name: "docker postgres",
      status: up && listening ? "pass" : "fail",
      detail:
        up && listening
          ? `${POSTGRES_CONTAINER} is up and 127.0.0.1:${state.databasePort} accepts connections (no SQL sent).`
          : !container.ok
            ? "Docker is unavailable; start Docker Desktop, then bun run db:start."
            : !up
              ? `${POSTGRES_CONTAINER} is not running; run bun run db:start.`
              : `127.0.0.1:${state.databasePort} is not accepting connections.`,
    })
  }

  async function probe(
    name: string,
    url: string,
    validate: (response: Response) => Promise<boolean>,
    repair: string,
    into: Check[] = checks
  ) {
    try {
      const response = await probes.request(url)
      if (!(await validate(response))) throw new Error("unexpected")
      into.push({ name, status: "pass", detail: `${url} responded.` })
    } catch {
      into.push({ name, status: "fail", detail: repair })
    }
  }

  const web = options.services.filter(
    (name): name is Exclude<DoctorService, "mobile"> => name !== "mobile"
  )
  // Probe in parallel but report in the requested service order.
  const perService = await Promise.all(
    web.map(async (name) => {
      const serviceChecks: Check[] = []
      const origin = localOrigins[name]
      const port = portlessPortFor(routes, origin)
      const listening = port !== undefined && (await probes.tcp(port))
      serviceChecks.push({
        name: `${name} port`,
        status: listening ? "pass" : "fail",
        detail: listening
          ? `Portless routes ${new URL(origin).hostname} to 127.0.0.1:${port}.`
          : port === undefined
            ? `No Portless route for ${new URL(origin).hostname}; start it with bun run dev:${name}.`
            : `Portless routes to 127.0.0.1:${port}, but nothing is listening.`,
      })
      if (name === "api") {
        await probe(
          options.database ? "api /ready" : "api /live",
          `${origin}/${options.database ? "ready" : "live"}`,
          async (response) => {
            const body = (await response.json()) as {
              api?: string
              database?: string
            }
            return options.database
              ? response.status === 200 && body.database === "ready"
              : response.status === 200 && body.api === "ok"
          },
          options.database
            ? "API readiness failed; check the database for this profile. No body was printed."
            : `API liveness failed; restart it with bun run dev:api (${options.profile}).`,
          serviceChecks
        )
      } else {
        await probe(
          name,
          `${origin}${staticProbePath}`,
          async (response) => response.status === 200,
          `The ${name} host did not serve its static asset; restart it with bun run dev:${name}.`,
          serviceChecks
        )
      }
      return serviceChecks
    })
  )
  checks.push(...perService.flat())

  if (options.services.includes("mobile")) {
    await probe(
      "metro",
      `http://127.0.0.1:${localPorts.metro}/status`,
      async (response) =>
        response.status === 200 &&
        (await response.text()).includes("packager-status:running"),
      `Metro is not running on ${localPorts.metro}; start it with bun run dev:mobile.`
    )
  }

  if (!options.requireQa) {
    checks.push({
      name: "qa capability",
      status: "skip",
      detail: "Not requested; add --require-qa to check QA sign-in readiness.",
    })
    return checks
  }
  const input = encodeURIComponent(
    JSON.stringify({ json: { clientKind: "web", contractVersion: 1 } })
  )
  await probe(
    "qa capability",
    `${localOrigins.api}/api/trpc/qaAccelerator.capability?input=${input}`,
    async (response) => {
      if (response.status !== 200) return false
      const capability = (
        (await response.json()) as {
          result?: {
            data?: { json?: { available?: boolean; environment?: string } }
          }
        }
      ).result?.data?.json
      return (
        capability?.available === true &&
        qaEnvironmentsFor(options.profile).includes(
          capability.environment ?? ""
        )
      )
    },
    "QA access is unavailable on this API. Check QA_ACCELERATOR_SECRET, EMAIL_QA_DOMAIN_ROUTES and APP_ENV for the profile."
  )
  return checks
}

export function formatChecks(checks: Check[]) {
  return checks.map(
    (check) =>
      `${check.status.toUpperCase().padEnd(4)} ${check.name}: ${check.detail}`
  )
}

function tcpProbe(port: number) {
  return new Promise<boolean>((done) => {
    const socket = connect({ host: "127.0.0.1", port, timeout: 1500 })
    const finish = (value: boolean) => {
      socket.destroy()
      done(value)
    }
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
  })
}

function dockerProbe() {
  const result = spawnSync(
    "docker",
    [
      "ps",
      "--filter",
      `name=^${POSTGRES_CONTAINER}$`,
      "--format",
      "{{.Status}}\t{{.Ports}}",
    ],
    { encoding: "utf8", timeout: 10000 }
  )
  if (result.status !== 0) return { ok: false }
  const [status, ports] = result.stdout.trim().split("\t")
  return { ok: true, status, ports }
}

export function defaultProbes(): DoctorProbes {
  const ca = portlessCertificateAuthority()
  return {
    request: (url) =>
      fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        ...(ca && url.startsWith("https:") ? { tls: { ca } } : {}),
      } as RequestInit),
    tcp: tcpProbe,
    docker: dockerProbe,
    routes: () => readPortlessRoutes(),
  }
}

export async function runDoctor(
  options: DoctorOptions,
  root = resolve(import.meta.dir, ".."),
  probes: DoctorProbes = defaultProbes()
) {
  if (options.help) {
    console.log(usage)
    return 0
  }
  const state = inspectDoctorConfig(root, options.profile)
  const checks = [...state.checks]
  if (options.offline)
    checks.push({
      name: "runtime",
      status: "skip",
      detail: "--offline: no Docker, port or HTTP probes; runtime unverified.",
    })
  else if (checks.some((check) => check.status === "fail"))
    checks.push({
      name: "runtime",
      status: "skip",
      detail: "Fix the configuration failures above first.",
    })
  else checks.push(...(await inspectDoctorRuntime(options, state, probes)))

  for (const line of formatChecks(checks)) console.log(line)
  console.log(
    options.database
      ? "Database readiness was probed once. Doctor does not certify schema parity, seeded QA data or running source revision."
      : "SQL-free mode: no database query was sent. Doctor does not certify schema parity, seeded QA data or running source revision."
  )
  return checks.some((check) => check.status === "fail") ? 1 : 0
}

if (import.meta.main) {
  try {
    process.exitCode = await runDoctor(parseDoctorArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : "qa:doctor failed.")
    process.exitCode = 1
  }
}
