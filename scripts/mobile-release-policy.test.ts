import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  assertCommittedMobileSource,
  expectedMobileCommit,
  mobileUpdateCommand,
  selectedMobileServiceEnvironment,
} from "./mobile-release-policy"
import { executeMetadataCommand } from "../apps/mobile/scripts/eas-update.mjs"

describe("mobile release publication policy", () => {
  test("requires an exact full SHA and rejects duplicate pins", () => {
    const sha = "a".repeat(40)
    expect(expectedMobileCommit([`--expected-commit=${sha}`], true)).toBe(sha)
    expect(expectedMobileCommit([], false)).toBeUndefined()
    for (const args of [
      [],
      ["--expected-commit", "short"],
      ["--expected-commit", sha, `--expected-commit=${sha}`],
    ]) {
      expect(() => expectedMobileCommit(args, true)).toThrow("exactly one full")
    }
  })
  test("requires the pinned HEAD and rejects changed or untracked source", () => {
    const directory = mkdtempSync(join(tmpdir(), "halaalvest-release-git-"))
    const root = join(directory, "repo")
    const outputFile = join(directory, "git-output")
    Bun.spawnSync(["mkdir", root])
    const git = (...args: string[]) => {
      // Bun 1.3.9's test runner can return empty captured subprocess stdout.
      const result = Bun.spawnSync(
        ["sh", "-c", 'git "$@" > "$RELEASE_TEST_OUTPUT"', "sh", ...args],
        {
          cwd: root,
          env: { ...process.env, RELEASE_TEST_OUTPUT: outputFile },
          stderr: "pipe",
        }
      )
      const output = readFileSync(outputFile, "utf8").trim()
      expect(result.exitCode).toBe(0)
      return output
    }
    const verify = (sha: string) =>
      assertCommittedMobileSource(root, sha, (args) => git(...args))
    try {
      git("init", "--initial-branch=main")
      writeFileSync(join(root, "source.ts"), "export const value = 1\n")
      git("add", "source.ts")
      git(
        "-c",
        "user.name=Release test",
        "-c",
        "user.email=release@example.invalid",
        "commit",
        "-m",
        "fixture"
      )
      const sha = git("rev-parse", "HEAD")
      expect(() => verify(sha)).not.toThrow()
      expect(() => verify("a".repeat(40))).toThrow("HEAD")
      writeFileSync(join(root, "untracked.ts"), "untracked")
      expect(git("status", "--porcelain", "--untracked-files=all")).toContain(
        "untracked.ts"
      )
      expect(() => verify(sha)).toThrow("clean committed")
      rmSync(join(root, "untracked.ts"))
      writeFileSync(join(root, "source.ts"), "changed")
      expect(() => verify(sha)).toThrow("clean committed")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  test("publishes directly to selected channels without writing update metadata", () => {
    expect(mobileUpdateCommand("prod", "ios", "a".repeat(40))).toEqual([
      "eas",
      "update",
      "--channel",
      "production",
      "--platform",
      "ios",
      "--environment",
      "production",
      "--message",
      `Release ${"a".repeat(40)}`,
      "--non-interactive",
    ])
    const root = mkdtempSync(join(tmpdir(), "halaalvest-update-metadata-"))
    const file = join(root, "app.config.ts")
    const source = 'export const UPDATE_VERSION = "2026.07.02"\n'
    try {
      writeFileSync(file, source)
      expect(() =>
        executeMetadataCommand({ argv: [], targetConfigFile: file })
      ).toThrow("never publishes")
      expect(readFileSync(file, "utf8")).toBe(source)
      executeMetadataCommand({
        argv: ["--dry-run", "--date", "2026-10-06"],
        targetConfigFile: file,
      })
      expect(readFileSync(file, "utf8")).toBe(source)
      executeMetadataCommand({
        argv: ["--prepare-only", "--date", "2026-10-06"],
        targetConfigFile: file,
      })
      expect(readFileSync(file, "utf8")).toContain('"2026.10.06"')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
  test("Preview must explicitly own service origins distinct from Production", () => {
    const production = {
      EXPO_PUBLIC_API_URL: "https://app.halaalvest.com",
      EXPO_PUBLIC_DASHBOARD_URL: "https://app.halaalvest.com",
      EXPO_PUBLIC_LEGAL_ORIGIN: "https://halaalvest.com",
    }
    const preview = {
      ...production,
      EXPO_PUBLIC_API_URL: "https://qa.halaalvest.com",
      EXPO_PUBLIC_DASHBOARD_URL: "https://qa.halaalvest.com",
    }
    expect(
      selectedMobileServiceEnvironment(preview, production, "preview")
    ).toEqual(preview)
    expect(() =>
      selectedMobileServiceEnvironment(production, production, "preview")
    ).toThrow("Production")
    expect(() =>
      selectedMobileServiceEnvironment({}, production, "preview")
    ).toThrow("explicit")
    expect(() =>
      selectedMobileServiceEnvironment(
        {
          ...preview,
          EXPO_PUBLIC_API_URL: `${preview.EXPO_PUBLIC_API_URL}/api/trpc`,
        },
        production,
        "preview"
      )
    ).toThrow("without a path")
  })
})
