import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  envForOptions,
  parseArgs,
  prismaArgsForAction,
  prismaCommandForOptions,
} from "./db-command"

describe("db command router", () => {
  test("defaults DB commands to local", () => {
    expect(parseArgs(["push"])).toEqual({
      action: "push",
      profile: "local",
      passthrough: [],
    })
  })

  test("supports remote aliases and Prisma passthrough arguments", () => {
    expect(
      parseArgs(["migrate", "--remote-dev", "--", "--name", "example"])
    ).toEqual({
      action: "migrate",
      profile: "remote",
      passthrough: ["--name", "example"],
    })
  })

  test("inherits a mode selected by the shared environment wrapper", () => {
    expect(
      parseArgs(["generate"], {
        HALAALVEST_DB_MODE: "prod",
      })
    ).toEqual({
      action: "generate",
      profile: "prod",
      passthrough: [],
    })
    expect(
      parseArgs(["generate"], {
        HALAALVEST_ENV_MODE: "remote",
      })
    ).toEqual({
      action: "generate",
      profile: "remote",
      passthrough: [],
    })
  })

  test("rejects conflicting profile flags", () => {
    expect(() => parseArgs(["push", "--local", "--prod"])).toThrow(
      "Conflicting db:push flags"
    )
  })

  test("maps deploy and production migrate to migrate deploy", () => {
    expect(prismaArgsForAction("deploy", "local")).toEqual([
      "prisma",
      "migrate",
      "deploy",
    ])
    expect(prismaArgsForAction("migrate", "prod")).toEqual([
      "prisma",
      "migrate",
      "deploy",
    ])
    expect(prismaArgsForAction("migrate", "local")).toEqual([
      "prisma",
      "migrate",
      "dev",
    ])
  })

  test("builds the direct Prisma command", () => {
    expect(
      prismaCommandForOptions({
        action: "push",
        profile: "prod",
        passthrough: ["--accept-data-loss"],
      })
    ).toEqual(["bunx", "--bun", "prisma", "db", "push", "--accept-data-loss"])
  })

  test("builds guarded shell commands through the same router", () => {
    expect(
      prismaCommandForOptions({
        action: "shell",
        profile: "prod",
        passthrough: [],
      })
    ).toEqual(["sh", "-c", 'exec psql "$DATABASE_URL"'])
  })

  test("uses the standardized local database by default", () => {
    const root = mkdtempSync(join(tmpdir(), "halaalvest-db-command-"))

    try {
      const env = envForOptions(
        { action: "push", profile: "local", passthrough: [] },
        root
      )

      expect(env.DATABASE_URL).toBe(
        "postgresql://postgres:postgres@127.0.0.1:55432/halaalvest"
      )
      expect(env.HALAALVEST_DB_MODE).toBe("local")
      expect(env.HALAALVEST_ENV_MODE).toBe("local")
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })

  test("loads remote and production mode files", () => {
    const root = mkdtempSync(join(tmpdir(), "halaalvest-db-command-"))

    try {
      writeFileSync(
        join(root, ".env.local"),
        "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/halaalvest\n"
      )
      writeFileSync(
        join(root, ".env.remote.local"),
        "DATABASE_URL=postgresql://remote.example.com/halaalvest_dev\n"
      )
      writeFileSync(
        join(root, ".env.prod"),
        "DATABASE_URL=postgresql://prod.example.com/halaalvest\n"
      )

      const remoteEnv = envForOptions(
        { action: "pull", profile: "remote", passthrough: [] },
        root
      )
      const prodEnv = envForOptions(
        { action: "migrate", profile: "prod", passthrough: [] },
        root
      )

      expect(remoteEnv.DATABASE_URL).toBe(
        "postgresql://remote.example.com/halaalvest_dev"
      )
      expect(remoteEnv.HALAALVEST_DB_MODE).toBe("remote-dev")
      expect(prodEnv.DATABASE_URL).toBe(
        "postgresql://prod.example.com/halaalvest"
      )
      expect(prodEnv.HALAALVEST_DB_MODE).toBe("prod")
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })

  test("refuses remote and production commands with local DATABASE_URL", () => {
    const root = mkdtempSync(join(tmpdir(), "halaalvest-db-command-"))

    try {
      writeFileSync(
        join(root, ".env.local"),
        "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/halaalvest\n"
      )
      writeFileSync(
        join(root, ".env.remote.local"),
        "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/halaalvest\n"
      )
      writeFileSync(
        join(root, ".env.prod"),
        "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/halaalvest\n"
      )

      expect(() =>
        envForOptions(
          { action: "push", profile: "remote", passthrough: [] },
          root
        )
      ).toThrow("Refusing to run db:push --remote with a local DATABASE_URL")
      expect(() =>
        envForOptions(
          { action: "push", profile: "prod", passthrough: [] },
          root
        )
      ).toThrow("Refusing to run db:push --prod with a local DATABASE_URL")
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })

  test("does not fall back to legacy production env files", () => {
    const root = mkdtempSync(join(tmpdir(), "halaalvest-db-command-"))

    try {
      writeFileSync(
        join(root, ".env.production"),
        "DATABASE_URL=postgresql://legacy.example.com/halaalvest\n"
      )

      expect(() =>
        envForOptions(
          { action: "shell", profile: "prod", passthrough: [] },
          root
        )
      ).toThrow("Missing .env.prod")
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })
})
