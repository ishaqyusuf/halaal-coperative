import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  normalizeQuickPaths,
  parseQuickArgs,
  quickEnvironment,
  selectQuickPlan,
  suites,
  type Suite,
} from "./test-quick"

const root = resolve(import.meta.dir, "..")

describe("test:quick selection", () => {
  test("every configured test exists and none is a connected suite", () => {
    for (const file of Object.values(suites).flat()) {
      expect(existsSync(resolve(root, file)), file).toBe(true)
      expect(file).not.toMatch(/integration|\.e2e\.|\.live\./)
    }
  })

  test("configured tests never read real credentials or opt-in live flags", () => {
    for (const file of Object.values(suites).flat()) {
      if (file === "scripts/test-quick.test.ts") continue
      const source = readFileSync(resolve(root, file), "utf8")
      expect(source, file).not.toMatch(/RUN_[A-Z_]*(LIVE|INTEGRATION)/)
      expect(source, file).not.toContain("new PrismaClient(")
    }
  })

  test("docs and Brain-only changes run the core suite", () => {
    const plan = selectQuickPlan(["docs/testing.md", ".brain/features/x.md"])
    expect(plan.groups).toEqual(["core"])
    expect(plan.unknown).toEqual([])
  })

  test("maps each app to its own suite", () => {
    expect(selectQuickPlan(["apps/dashboard/src/app/page.tsx"]).groups).toEqual(
      ["core", "dashboard"]
    )
    expect(selectQuickPlan(["apps/mobile/src/app/_layout.tsx"]).groups).toEqual(
      ["core", "mobile"]
    )
    expect(selectQuickPlan(["apps/marketing/app/page.tsx"]).groups).toEqual([
      "core",
      "marketing",
    ])
  })

  test("API changes also cover its in-process and mobile consumers", () => {
    expect(selectQuickPlan(["apps/api/src/index.ts"]).groups).toEqual([
      "core",
      "dashboard",
      "mobile",
      "api",
    ])
  })

  test("shared packages and root manifests broaden to every suite", () => {
    const all = Object.keys(suites) as Suite[]
    expect(selectQuickPlan(["packages/db/src/index.ts"]).groups).toEqual(all)
    expect(selectQuickPlan(["package.json"]).groups).toEqual(all)
    expect(selectQuickPlan(["apps/api/package.json"]).groups).toEqual(all)
    expect(selectQuickPlan(["packages/ui/src/button.tsx"]).groups).toEqual([
      "core",
      "dashboard",
      "marketing",
    ])
  })

  test("unmapped paths are reported, never silently passed", () => {
    expect(selectQuickPlan(["tickets.txt", "vendor/x.ts"]).unknown).toEqual([
      "tickets.txt",
      "vendor/x.ts",
    ])
  })

  test("rejects traversal, absolute and option-looking paths", () => {
    expect(() => normalizeQuickPaths(["../secret"])).toThrow()
    expect(() => normalizeQuickPaths(["/etc/passwd"])).toThrow()
    expect(() => normalizeQuickPaths(["--all"])).toThrow()
    expect(normalizeQuickPaths(["./b.ts", "a.ts", "b.ts"])).toEqual([
      "a.ts",
      "b.ts",
    ])
  })
})

describe("test:quick arguments and environment", () => {
  test("parses --files, --base and --plan", () => {
    expect(parseQuickArgs(["--files", "a.ts", "b.ts", "--plan"])).toEqual({
      files: ["a.ts", "b.ts"],
      plan: true,
      help: false,
    })
    expect(parseQuickArgs(["--base", "main"]).base).toBe("main")
    expect(() => parseQuickArgs(["--base", "main", "--files", "a"])).toThrow()
    expect(() => parseQuickArgs(["--files"])).toThrow()
    expect(() => parseQuickArgs(["--watch"])).toThrow("Unknown argument")
  })

  test("strips credentials and points the database at an unusable sentinel", () => {
    const env = quickEnvironment({
      PATH: "/bin",
      HOME: "/home/qa",
      HALAALVEST_DATABASE_URL: "postgresql://real:secret@db.example/prod",
      RESEND_API_KEY: "re_live",
      QA_ACCELERATOR_SECRET: "secret",
      RUN_LIVE_PROVIDER_TESTS: "true",
    })
    expect(env).toEqual({
      NODE_ENV: "test",
      TZ: "UTC",
      HALAALVEST_DATABASE_URL: "postgresql://unit-only@127.0.0.1:1/unused",
      PATH: "/bin",
      HOME: "/home/qa",
    })
  })
})
