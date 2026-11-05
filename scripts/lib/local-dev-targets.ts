import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// Named local hosts served by Portless (see .brain/system/architecture.md).
// Direct ports are the workspace defaults; Portless may assign the API its own.
export const localOrigins = {
  api: "https://api.halaalvest.localhost",
  dashboard: "https://halaalvest-dash.localhost",
  marketing: "https://halaalvest.localhost",
} as const

export const localPorts = {
  marketing: 1440,
  dashboard: 1441,
  api: 1442,
  metro: 1443,
} as const

export type LocalWebService = keyof typeof localOrigins

// A static public asset outside the dashboard proxy matcher. It proves the
// named host and Next server answer without rendering a SQL-backed page.
export const staticProbePath = "/brand/halaalvest-icon-dark.svg"

export type PortlessRoute = { hostname: string; port: number; pid: number }

export function portlessStateDirectory(env = process.env) {
  return env.PORTLESS_STATE_DIR?.trim() || join(homedir(), ".portless")
}

export function parsePortlessRoutes(contents: string): PortlessRoute[] {
  const parsed = JSON.parse(contents) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (route): route is PortlessRoute =>
      typeof route?.hostname === "string" &&
      Number.isInteger(route?.port) &&
      route.port > 0 &&
      route.port <= 65535
  )
}

export function readPortlessRoutes(directory = portlessStateDirectory()) {
  const file = join(directory, "routes.json")
  if (!existsSync(file)) return []
  try {
    return parsePortlessRoutes(readFileSync(file, "utf8"))
  } catch {
    return []
  }
}

export function portlessPortFor(
  routes: PortlessRoute[],
  origin: string
): number | undefined {
  const hostname = new URL(origin).hostname
  return routes.find((route) => route.hostname === hostname)?.port
}

// The Portless CA lets Bun verify the local HTTPS hosts without disabling TLS.
export function portlessCertificateAuthority(
  directory = portlessStateDirectory()
) {
  const file = join(directory, "ca.pem")
  return existsSync(file) ? readFileSync(file, "utf8") : undefined
}
