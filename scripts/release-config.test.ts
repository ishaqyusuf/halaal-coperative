import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"
import {
  loadReleaseConfig,
  componentReleasesTo,
} from "../../local-infra-kit/src/release-flow/config"
import {
  componentPathspecs,
  componentSourceDirs,
  releaseTag,
} from "../../local-infra-kit/src/release-flow/state"

const root = resolve(import.meta.dir, "..")
const config = await loadReleaseConfig(root)

describe("shared GND/EwaTrade release integration", () => {
  test("validates the real repository config and release tag targets", () => {
    expect(config.productionBranch).toBe("main")
    expect(config.previewBranch).toBe("preview")
    expect(
      config.components
        .filter((c) => componentReleasesTo(c, "preview"))
        .map((c) => c.name)
    ).toEqual(["database", "dashboard", "marketing", "jobs", "mobile-android"])
    expect(
      config.components.filter((c) => componentReleasesTo(c, "production"))
        .length
    ).toBe(6)
    expect(releaseTag("preview", "jobs")).toBe("release/preview/jobs")
  })
  test("detects hosted API dependencies through dashboard workspace closure", () => {
    const dashboard = config.components.find((c) => c.name === "dashboard")!
    const sources = componentSourceDirs(root, dashboard)
    expect(sources).toContain("apps/api")
    expect(sources).toContain("packages/db")
    expect(componentPathspecs(config, dashboard, sources)).toContain(
      ":(glob)bun.lock"
    )
  })
  test("pushes only schema changes before Git and selects each jobs environment", () => {
    const database = config.components.find((c) => c.name === "database")!
    expect(database.beforePush).toBe(true)
    expect(database.deploy).toEqual({
      preview: "bun run db:push --preview",
      production: "bun run db:push --prod",
    })
    expect(componentPathspecs(config, database, [])).not.toContain(
      ":(glob)bun.lock"
    )
    const jobs = config.components.find((c) => c.name === "jobs")!
    expect(jobs.deploy).toEqual({
      preview: "bun run jobs:preview:deploy",
      production: "bun run jobs:deploy",
    })
  })
  test("uses clean pinned mobile commands and suppresses Expo dotenv during planning", () => {
    for (const component of config.components.filter((c) => c.expo)) {
      expect(component.expo!.login).toBe("bun run eas:auth")
      expect(component.expo!.easEnv).toEqual({ EXPO_NO_DOTENV: "1" })
      for (const command of [
        ...Object.values(component.expo!.update),
        ...Object.values(component.expo!.build),
      ]) {
        expect(command).toContain("--expected-commit {sha}")
      }
    }
  })
})
