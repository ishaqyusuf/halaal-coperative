import { describe, expect, spyOn, test } from "bun:test"
import {
  assertCleanupTarget,
  assertLocalWriteTarget,
  newRunId,
  parseWriteArgs,
  planWriteSmoke,
  runWriteSmoke,
  writeStages,
} from "./qa-write-smoke"

const local = {
  HALAALVEST_DATABASE_URL:
    "postgresql://postgres:pw@127.0.0.1:55434/halaalvest",
  HALAALVEST_ENV_MODE: "local",
  APP_ENV: "local",
}
const confirmed = { confirmLocalWrite: true, qaDomain: "onepath.qa.test" }

describe("qa:smoke:write guards fail closed", () => {
  test("accepts only a confirmed local loopback target", () => {
    expect(assertLocalWriteTarget(confirmed, local)).toEqual({
      databasePort: 55434,
    })
  })

  test("refuses without the confirmation flag", () => {
    expect(() =>
      assertLocalWriteTarget({ ...confirmed, confirmLocalWrite: false }, local)
    ).toThrow("--confirm-local-write")
  })

  test("refuses hosted, missing or invalid databases", () => {
    expect(() =>
      assertLocalWriteTarget(confirmed, {
        ...local,
        HALAALVEST_DATABASE_URL: "postgresql://u:p@ep-cold-sun.neon.tech/db",
      })
    ).toThrow("non-loopback")
    expect(() =>
      assertLocalWriteTarget(confirmed, {
        ...local,
        HALAALVEST_DATABASE_URL: undefined,
      })
    ).toThrow("missing or invalid")
    expect(() =>
      assertLocalWriteTarget(confirmed, {
        ...local,
        HALAALVEST_DATABASE_URL: "nope",
      })
    ).toThrow("missing or invalid")
  })

  test("refuses non-local modes, production envs and deliverable domains", () => {
    expect(() =>
      assertLocalWriteTarget(confirmed, {
        ...local,
        HALAALVEST_ENV_MODE: "preview",
      })
    ).toThrow("local only")
    expect(() =>
      assertLocalWriteTarget(confirmed, { ...local, APP_ENV: "production" })
    ).toThrow("production")
    for (const qaDomain of [
      "halaalvest.com",
      "qa.test",
      "onepath.qa.test.evil.com",
    ])
      expect(() =>
        assertLocalWriteTarget({ ...confirmed, qaDomain }, local)
      ).toThrow(".qa.test")
  })

  test("error messages never echo the database URL", () => {
    try {
      assertLocalWriteTarget(confirmed, {
        ...local,
        HALAALVEST_DATABASE_URL: "postgresql://u:hunter2@db.example/x",
      })
    } catch (error) {
      expect(String(error)).not.toContain("hunter2")
    }
  })
})

describe("qa:smoke:write naming and cleanup scope", () => {
  test("derives every identity from the run ID", () => {
    const plan = planWriteSmoke("0a1b2c3d", "onepath.qa.test")
    expect(plan).toMatchObject({
      slug: "qa-smoke-0a1b2c3d",
      ownerEmail: "smoke-0a1b2c3d@onepath.qa.test",
    })
    expect(plan.cooperativeCodePrefix).toMatch(/^QS[A-Z]{3}$/)
    expect(newRunId()).toMatch(/^[a-z0-9]{8}$/)
    expect(() => planWriteSmoke("../etc", "onepath.qa.test")).toThrow("Run IDs")
  })

  test("cleanup deletes only this run's QA tenant", () => {
    const plan = planWriteSmoke("0a1b2c3d", "onepath.qa.test")
    const own = {
      slug: plan.slug,
      dataClassification: "qa",
      qaSourceDomain: "onepath.qa.test",
    }
    expect(() => assertCleanupTarget(own, plan)).not.toThrow()
    for (const other of [
      { ...own, slug: "amana-savings" },
      { ...own, dataClassification: "live" },
      { ...own, qaSourceDomain: "ishaq.qa.test" },
    ])
      expect(() => assertCleanupTarget(other, plan)).toThrow(
        "Refusing to delete"
      )
  })

  test("parses commands and requires a run ID for cleanup", () => {
    expect(parseWriteArgs([]).help).toBe(true)
    expect(
      parseWriteArgs(["run", "--confirm-local-write", "--keep"])
    ).toMatchObject({
      command: "run",
      confirmLocalWrite: true,
      keep: true,
    })
    expect(() => parseWriteArgs(["cleanup", "--confirm-local-write"])).toThrow(
      "--run"
    )
    expect(() => parseWriteArgs(["deploy"])).toThrow("Unknown command")
  })

  test("plan writes nothing and lists the One Path stages", async () => {
    const log = spyOn(console, "log").mockImplementation(() => {})
    try {
      expect(await runWriteSmoke(parseWriteArgs(["plan"]))).toBe(0)
      expect(log.mock.calls.flat().join("\n")).toContain("go live")
    } finally {
      log.mockRestore()
    }
    expect(writeStages.map((stage) => stage.key)).toContain("go-live")
  })
})

describe("qa:smoke:write browser driver", () => {
  test("every stage is written, in the One Path order", () => {
    expect(writeStages.every((stage) => stage.implemented)).toBe(true)
    expect(writeStages.map((stage) => stage.key)).toEqual([
      "signup",
      "verify-email",
      "onboarding",
      "handoff",
      "setup",
      "members",
      "go-live",
      "verify-live",
    ])
  })

  test("only the named local hosts are reachable, reads included", async () => {
    const { writeRequestPolicy } = await import("./qa-write-smoke-driver.mjs")
    for (const url of [
      "https://halaalvest.localhost/api/signup",
      "https://qa-smoke-0a1b2c3d.halaalvest-dash.localhost/auth/handoff",
      "https://api.halaalvest.localhost/trpc/x",
    ])
      expect(writeRequestPolicy({ url })).toBe("allow")
    for (const url of [
      "https://dashboard.halaalvest.com/",
      "https://halaalvest.localhost.evil.com/",
      "https://fonts.googleapis.com/css",
    ])
      expect(writeRequestPolicy({ url })).toBe("block")
  })

  test("stops at the first failed stage and never retries a write", async () => {
    const { runStages } = await import("./qa-write-smoke-driver.mjs")
    const ran: string[] = []
    const failures: string[] = []
    const stderr = spyOn(process.stderr, "write").mockImplementation(() => true)
    try {
      const results = await runStages(
        [
          { key: "a", run: async () => (ran.push("a"), "ok") },
          {
            key: "b",
            run: async () => {
              ran.push("b")
              throw new Error("refused")
            },
          },
          { key: "c", run: async () => (ran.push("c"), "ok") },
        ],
        async (key: string) => {
          failures.push(key)
        }
      )
      expect(ran).toEqual(["a", "b"])
      expect(failures).toEqual(["b"])
      expect(
        results.map(({ key, status }: { key: string; status: string }) => [
          key,
          status,
        ])
      ).toEqual([
        ["a", "pass"],
        ["b", "fail"],
        ["c", "skipped"],
      ])
    } finally {
      stderr.mockRestore()
    }
  })

  test("picks the calendar's 1st of this month in en-US form", async () => {
    const { firstOfMonthDataDay } = await import("./qa-write-smoke-driver.mjs")
    expect(firstOfMonthDataDay(new Date(2026, 10, 15))).toBe("11/1/2026")
    expect(firstOfMonthDataDay(new Date(2027, 0, 31))).toBe("1/1/2027")
  })
})
