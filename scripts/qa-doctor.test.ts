import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  inspectDoctorConfig,
  inspectDoctorRuntime,
  parseDoctorArgs,
  runDoctor,
  type DoctorProbes,
} from "./qa-doctor"

const secretPassword = "doctor-fixture-password"
const roots: string[] = []

function fixtureRoot(databaseUrl?: string) {
  const parent = mkdtempSync(join(tmpdir(), "qa-doctor-test-"))
  roots.push(parent)
  const root = join(parent, "halaal-coperative")
  mkdirSync(join(parent, "local-infra-kit/bin"), { recursive: true })
  writeFileSync(join(parent, "local-infra-kit/bin/dev.ts"), "")
  mkdirSync(root)
  writeFileSync(join(root, ".env"), "LOCAL_HOSTNAME=localhost\n")
  writeFileSync(
    join(root, ".env.local"),
    databaseUrl ? `HALAALVEST_DATABASE_URL=${databaseUrl}\n` : ""
  )
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true })
  writeFileSync(join(root, "node_modules/.bin/turbo"), "")
  mkdirSync(join(root, "packages/db/generated/prisma"), { recursive: true })
  return root
}

const localUrl = `postgresql://postgres:${secretPassword}@127.0.0.1:55434/halaalvest`

function probes(overrides: Partial<DoctorProbes> = {}) {
  const requested: string[] = []
  const value: DoctorProbes = {
    request: async (url) => {
      requested.push(url)
      if (url.endsWith("/live"))
        return Response.json({ api: "ok", check: "liveness" })
      if (url.endsWith("/ready"))
        return Response.json({ api: "ok", database: "ready" })
      if (url.includes("qaAccelerator.capability"))
        return Response.json({
          result: { data: { json: { available: true, environment: "local" } } },
        })
      if (url.endsWith("/status"))
        return new Response("packager-status:running")
      return new Response("<svg/>", { status: 200 })
    },
    tcp: async () => true,
    docker: () => ({ ok: true, status: "Up 2 hours", ports: "55434->5432" }),
    routes: () => [
      { hostname: "api.halaalvest.localhost", port: 4101, pid: 1 },
      { hostname: "halaalvest-dash.localhost", port: 1441, pid: 2 },
      { hostname: "halaalvest.localhost", port: 1440, pid: 3 },
    ],
    ...overrides,
  }
  return { probes: value, requested }
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

describe("qa:doctor arguments", () => {
  test("defaults to SQL-free local web services", () => {
    expect(parseDoctorArgs([])).toEqual({
      profile: "local",
      services: ["api", "dashboard", "marketing"],
      offline: false,
      database: false,
      requireQa: false,
      help: false,
    })
  })

  test("--require-qa implies database readiness and adds the API", () => {
    const options = parseDoctorArgs(["--services", "dashboard", "--require-qa"])
    expect(options.database).toBe(true)
    expect(options.services).toEqual(["api", "dashboard"])
  })

  test("mobile needs the API; production and unknown services are refused", () => {
    expect(parseDoctorArgs(["--services", "mobile"]).services).toEqual([
      "api",
      "mobile",
    ])
    expect(() => parseDoctorArgs(["--profile", "prod"])).toThrow(
      "local, dev and preview only"
    )
    expect(() => parseDoctorArgs(["--services", "jobs"])).toThrow(
      "Unknown service"
    )
    expect(() => parseDoctorArgs(["--profile"])).toThrow("Missing value")
  })
})

describe("qa:doctor configuration", () => {
  test("verifies the local profile without printing the database URL", () => {
    const state = inspectDoctorConfig(fixtureRoot(localUrl), "local", {})
    expect(state.databasePort).toBe(55434)
    expect(state.checks.find((c) => c.name === "env profile")?.status).toBe(
      "pass"
    )
    expect(JSON.stringify(state.checks)).not.toContain(secretPassword)
  })

  test("fails a missing database URL without leaking values", () => {
    const state = inspectDoctorConfig(fixtureRoot(), "local", {})
    expect(state.checks.find((c) => c.name === "env profile")).toMatchObject({
      status: "fail",
    })
  })

  test("a hosted local URL skips the Docker check instead of probing it", async () => {
    const state = inspectDoctorConfig(
      fixtureRoot(`postgresql://u:${secretPassword}@ep-x.neon.tech/db`),
      "local",
      {}
    )
    expect(state.databasePort).toBeUndefined()
    const { probes: fake } = probes({
      docker: () => {
        throw new Error("docker must not be called")
      },
    })
    const checks = await inspectDoctorRuntime(parseDoctorArgs([]), state, fake)
    expect(checks.some((c) => c.name === "docker postgres")).toBe(false)
  })
})

describe("qa:doctor runtime", () => {
  test("default mode uses /live and static assets only", async () => {
    const state = inspectDoctorConfig(fixtureRoot(localUrl), "local", {})
    const { probes: fake, requested } = probes()
    const checks = await inspectDoctorRuntime(parseDoctorArgs([]), state, fake)
    expect(checks.every((c) => c.status !== "fail")).toBe(true)
    expect(requested).toContain("https://api.halaalvest.localhost/live")
    expect(requested.some((url) => url.endsWith("/ready"))).toBe(false)
    expect(requested.some((url) => url.includes("qaAccelerator"))).toBe(false)
    expect(
      requested.filter((url) => url.endsWith("/brand/halaalvest-icon-dark.svg"))
    ).toHaveLength(2)
    expect(checks.find((c) => c.name === "qa capability")?.status).toBe("skip")
  })

  test("--database probes /ready; --require-qa checks the QA environment", async () => {
    const state = inspectDoctorConfig(fixtureRoot(localUrl), "local", {})
    const { probes: fake, requested } = probes()
    const checks = await inspectDoctorRuntime(
      parseDoctorArgs(["--require-qa"]),
      state,
      fake
    )
    expect(requested).toContain("https://api.halaalvest.localhost/ready")
    expect(requested.some((url) => url.endsWith("/live"))).toBe(false)
    expect(checks.find((c) => c.name === "qa capability")?.status).toBe("pass")
  })

  test("a preview-environment API fails the local QA check", async () => {
    const state = inspectDoctorConfig(fixtureRoot(localUrl), "local", {})
    const { probes: fake } = probes({
      request: async (url) =>
        url.includes("qaAccelerator")
          ? Response.json({
              result: {
                data: { json: { available: true, environment: "preview" } },
              },
            })
          : Response.json({ api: "ok", database: "ready" }),
    })
    const checks = await inspectDoctorRuntime(
      parseDoctorArgs(["--require-qa", "--services", "api"]),
      state,
      fake
    )
    expect(checks.find((c) => c.name === "qa capability")?.status).toBe("fail")
  })

  test("reports stopped Postgres, missing routes and dead ports with repairs", async () => {
    const state = inspectDoctorConfig(fixtureRoot(localUrl), "local", {})
    const { probes: fake } = probes({
      docker: () => ({ ok: true, status: "Exited (0) 1 hour ago" }),
      routes: () => [
        { hostname: "api.halaalvest.localhost", port: 4101, pid: 1 },
      ],
      tcp: async (port) => port !== 4101,
      request: async () => {
        throw new Error("offline")
      },
    })
    const checks = await inspectDoctorRuntime(parseDoctorArgs([]), state, fake)
    const byName = Object.fromEntries(checks.map((c) => [c.name, c]))
    expect(byName["docker postgres"]?.detail).toContain("bun run db:start")
    expect(byName["api port"]?.detail).toContain("nothing is listening")
    expect(byName["dashboard port"]?.detail).toContain("bun run dev:dashboard")
    expect(byName["api /live"]?.status).toBe("fail")
  })

  test("--offline sends no probes and still exits on config only", async () => {
    const log = spyOn(console, "log").mockImplementation(() => {})
    try {
      const fail = () => {
        throw new Error("probe used in offline mode")
      }
      const code = await runDoctor(
        parseDoctorArgs(["--offline"]),
        fixtureRoot(localUrl),
        { request: fail, tcp: fail, docker: fail, routes: fail }
      )
      expect(code).toBe(0)
      const output = log.mock.calls.flat().join("\n")
      expect(output).toContain("SKIP runtime")
      expect(output).not.toContain(secretPassword)
    } finally {
      log.mockRestore()
    }
  })
})
