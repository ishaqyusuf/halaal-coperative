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
