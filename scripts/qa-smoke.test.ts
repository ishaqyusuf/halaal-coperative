import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseSmokeArgs, summarizeSmoke, validateSmokeConfig } from "./qa-smoke"
import {
  classifyGettingStarted,
  forms,
  isDashboardHost,
  memberRequests,
  pages,
  readyCharges,
  readyCooperativeJourney,
  requestPolicy,
  swapIfFrozen,
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
      policy(
        "POST",
        "https://halaalvest-dash.localhost/__nextjs_original-stack-frames"
      )
    ).toBe("allow")
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

describe("qa:smoke member-ready cooperative", () => {
  test("ready profile fields pass validation through", () => {
    expect(
      validateSmokeConfig({
        qaDomain: "ishaq.qa.test",
        profileLabel: "Admin",
        readyMemberProfileLabel: " Standard Member Ready Member ",
        readyStaffProfileLabel: "Standard Member Ready Finance Officer",
      })
    ).toMatchObject({
      readyMemberProfileLabel: "Standard Member Ready Member",
      readyStaffProfileLabel: "Standard Member Ready Finance Officer",
    })
    expect(() =>
      validateSmokeConfig({
        qaDomain: "ishaq.qa.test",
        profileLabel: "Admin",
        readyStaffProfileLabel: 7,
      })
    ).toThrow("readyStaffProfileLabel")
  })

  test("covers the three member request workflows and the harness charges", () => {
    expect(memberRequests.map(({ path }) => path)).toEqual([
      "/procurement",
      "/project-financing",
      "/food-purchase",
    ])
    // Names the harness provisions (production-qa-harness-member-ready-fixture).
    expect(readyCharges).toEqual({
      separate: "Passbook fee",
      submission: "Request form fee",
    })
  })

  function fakeSession(signedIn: boolean, steps: string[]) {
    return {
      signIn: async (name: string) => {
        steps.push(name)
        return signedIn
      },
      step: async (name: string) => {
        steps.push(name)
        return true
      },
      open: async () => new URL("https://x.halaalvest-dash.localhost/"),
      gettingStarted: async () => true,
      page: () => {
        throw new Error("steps are not run in this test")
      },
    }
  }
  const config = {
    qaDomain: "ishaq.qa.test",
    profileLabel: "Admin",
    origin: "https://halaalvest-dash.localhost",
    readyMemberProfileLabel: "Standard Member Ready Member",
    readyStaffProfileLabel: "Standard Member Ready Finance Officer",
  }

  test("runs member journeys then the staff Record payment dialog", async () => {
    const steps: string[] = []
    await readyCooperativeJourney(
      fakeSession(true, steps) as never,
      fakeSession(true, steps) as never,
      config,
      "/tmp"
    )
    expect(steps).toEqual([
      "ready member sign-in",
      "member procurement request",
      "member project financing request",
      "member foodstuff request",
      "member receipt form",
      "ready staff sign-in",
      "charge record payment dialog",
    ])
  })

  test("skips a session's journeys when its sign-in fails", async () => {
    const steps: string[] = []
    await readyCooperativeJourney(
      fakeSession(false, steps) as never,
      null,
      config,
      "/tmp"
    )
    expect(steps).toEqual(["ready member sign-in"])
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

describe("qa:smoke frozen tab recovery", () => {
  // Just enough of a Playwright page for swapIfFrozen.
  function fakePage(responsive: boolean, opened: string[]) {
    const page = {
      closed: false,
      evaluate: () =>
        responsive ? Promise.resolve(true) : new Promise<never>(() => {}),
      close: async () => {
        page.closed = true
      },
      context: () => ({
        newPage: async () => {
          opened.push("fresh")
          return fakePage(true, opened)
        },
      }),
    }
    return page
  }

  test("keeps a responsive tab", async () => {
    const opened: string[] = []
    const page = fakePage(true, opened)
    expect(await swapIfFrozen(page as never, async () => {}, 20)).toBeNull()
    expect(opened).toEqual([])
    expect(page.closed).toBe(false)
  })

  test("replaces a frozen tab with an attached fresh one in the same context", async () => {
    const opened: string[] = []
    const attached: unknown[] = []
    const frozen = fakePage(false, opened)
    const fresh = await swapIfFrozen(
      frozen as never,
      async (next) => {
        attached.push(next)
      },
      20
    )
    expect(fresh).not.toBeNull()
    expect(attached).toEqual([fresh])
    expect(opened).toEqual(["fresh"])
    expect(frozen.closed).toBe(true)
  })
})
