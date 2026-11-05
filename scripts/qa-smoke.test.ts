import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseSmokeArgs, summarizeSmoke, validateSmokeConfig } from "./qa-smoke"
import {
  classifyGettingStarted,
  forms,
  isDashboardHost,
  pages,
  requestPolicy,
} from "./qa-web-smoke.mjs"

const dashboardHost = "halaalvest-dash.localhost"

describe("qa:smoke config", () => {
  test("the committed example is a valid local config", () => {
    const example = JSON.parse(
      readFileSync(
        resolve(import.meta.dir, "fixtures/qa-smoke.example.json"),
        "utf8"
      )
    )
    expect(validateSmokeConfig(example)).toEqual({
      qaDomain: "safa.qa.test",
      profileLabel: "Safa Cooperative Admin",
      origin: "https://halaalvest-dash.localhost",
    })
  })

  test("targets the local dashboard only", () => {
    const base = { qaDomain: "safa.qa.test", profileLabel: "Admin" }
    expect(validateSmokeConfig(base).origin).toBe(
      "https://halaalvest-dash.localhost"
    )
    for (const origin of [
      "https://dashboard.halaalvest.com",
      "https://preview-dashboard.halaalvest.com",
      "http://localhost:1441",
    ])
      expect(() => validateSmokeConfig({ ...base, origin })).toThrow(
        "local dashboard only"
      )
    expect(() => validateSmokeConfig({ profileLabel: "Admin" })).toThrow(
      "qaDomain"
    )
    expect(() =>
      validateSmokeConfig({ qaDomain: "safa.qa.test", profileLabel: " " })
    ).toThrow("profileLabel")
  })

  test("parses arguments", () => {
    expect(parseSmokeArgs([])).toEqual({
      configFile: ".scratch/qa-smoke/config.json",
      headed: false,
      help: false,
    })
    expect(parseSmokeArgs(["--config", "x.json", "--headed"]).configFile).toBe(
      "x.json"
    )
    expect(() => parseSmokeArgs(["--target", "preview"])).toThrow(
      "Unknown argument"
    )
  })
})

describe("qa:smoke request policy", () => {
  test("allows reads and the QA entry route; blocks every other write", () => {
    const policy = (method: string, url: string) =>
      requestPolicy({ method, url, dashboardHost })
    expect(
      policy("GET", "https://safa-qa.halaalvest-dash.localhost/members")
    ).toBe("allow")
    expect(policy("POST", "https://halaalvest-dash.localhost/auth/qa")).toBe(
      "allow"
    )
    expect(
      policy(
        "POST",
        "https://halaalvest-dash.localhost/api/trpc/members.create"
      )
    ).toBe("block")
    expect(policy("POST", "https://halaalvest-dash.localhost/members")).toBe(
      "block"
    )
    expect(policy("POST", "https://evil.example/auth/qa")).toBe("block")
    expect(
      policy("DELETE", "https://halaalvest-dash.localhost/auth/qa/extra")
    ).toBe("block")
  })

  test("accepts tenant subdomains of the dashboard host only", () => {
    expect(isDashboardHost("halaalvest-dash.localhost", dashboardHost)).toBe(
      true
    )
    expect(
      isDashboardHost("safa-qa.halaalvest-dash.localhost", dashboardHost)
    ).toBe(true)
    expect(isDashboardHost("halaalvest.localhost", dashboardHost)).toBe(false)
    expect(
      isDashboardHost("evilhalaalvest-dash.localhost", dashboardHost)
    ).toBe(false)
  })

  test("covers the main dashboard journeys", () => {
    expect(pages.map((page) => page.path)).toEqual([
      "/members",
      "/contributions",
      "/charges",
    ])
    expect(forms.map((form) => form.name)).toEqual([
      "member create",
      "contribution plan",
      "charge definition",
    ])
  })
})

describe("qa:smoke summary", () => {
  const pass = {
    name: "qa sign-in",
    status: "pass" as const,
    ms: 1,
    detail: "",
  }
  test("passes only when every check passes and no tRPC write was attempted", () => {
    expect(
      summarizeSmoke({
        checks: [pass],
        blocked: ["POST /api/analytics"],
        consoleErrors: 0,
      })
    ).toMatchObject({ passed: true })
    expect(
      summarizeSmoke({
        checks: [pass],
        blocked: ["POST /api/trpc/members.create"],
        consoleErrors: 0,
      })
    ).toMatchObject({
      passed: false,
      blockedWrites: ["POST /api/trpc/members.create"],
    })
    expect(
      summarizeSmoke({
        checks: [{ ...pass, status: "fail" }],
        blocked: [],
        consoleErrors: 0,
      })
    ).toMatchObject({ passed: false, failed: ["qa sign-in"] })
    expect(
      summarizeSmoke({ checks: [], blocked: [], consoleErrors: 0 }).passed
    ).toBe(false)
  })
})

describe("qa:smoke getting-started gate", () => {
  test("a live admin is redirected home; setup and migration states also pass", () => {
    expect(
      classifyGettingStarted({
        pathname: "/",
        hasRail: false,
        expectSetup: false,
      })
    ).toEqual({
      ok: true,
      detail: "Live workspace: /getting-started redirects home",
    })
    expect(
      classifyGettingStarted({
        pathname: "/getting-started",
        hasRail: true,
        expectSetup: false,
      }).ok
    ).toBe(true)
    expect(
      classifyGettingStarted({
        pathname: "/onboarding-success",
        hasRail: false,
        expectSetup: true,
      }).ok
    ).toBe(true)
  })

  test("a setup admin must see the One Path rail", () => {
    expect(
      classifyGettingStarted({
        pathname: "/",
        hasRail: false,
        expectSetup: true,
      })
    ).toMatchObject({ ok: false })
    expect(
      classifyGettingStarted({
        pathname: "/getting-started",
        hasRail: false,
        expectSetup: true,
      }).detail
    ).toContain("without it")
    expect(
      classifyGettingStarted({
        pathname: "/members",
        hasRail: false,
        expectSetup: false,
      }).ok
    ).toBe(false)
  })

  test("setup profile fields pass validation through", () => {
    expect(
      validateSmokeConfig({
        qaDomain: "ishaq.qa.test",
        profileLabel: "Admin",
        setupProfileLabel: " Setup Admin ",
        setupCooperative: "Amana Kaduna",
      })
    ).toMatchObject({
      setupProfileLabel: "Setup Admin",
      setupCooperative: "Amana Kaduna",
    })
    expect(() =>
      validateSmokeConfig({
        qaDomain: "ishaq.qa.test",
        profileLabel: "A",
        setupProfileLabel: 3,
      })
    ).toThrow("setupProfileLabel")
  })
})
