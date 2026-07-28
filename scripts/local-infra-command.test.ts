import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  envForMode,
  modeForCommand,
  validateDatabaseForMode,
  validatePortOwner,
} from "./local-infra-command"

describe("Halaalvest local-infra safety launcher", () => {
  test("resolves public dev and service mode flags", () => {
    expect(modeForCommand("dev", [])).toBe("local")
    expect(modeForCommand("dev", ["--remote-dev"])).toBe("remote")
    expect(modeForCommand("dev", ["--prod"])).toBe("prod")
    expect(
      modeForCommand("dev-services", [], {
        HALAALVEST_ENV_MODE: "remote",
      })
    ).toBe("remote")
    expect(modeForCommand("dev-services", ["--mode", "local"])).toBe("local")
    expect(
      modeForCommand("with-env", [], {
        HALAALVEST_ENV_MODE: "prod",
      })
    ).toBe("prod")
  })

  test("rejects conflicting dev modes before dispatch", () => {
    expect(() => modeForCommand("dev", ["--remote", "--prod"])).toThrow(
      "Conflicting local-infra modes"
    )
  })

  test("rejects local database URLs in remote and production modes", () => {
    for (const mode of ["remote", "prod"] as const) {
      expect(() =>
        validateDatabaseForMode(mode, {
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:55432/halaalvest",
        })
      ).toThrow(`Refusing ${mode} mode with a local DATABASE_URL`)
    }
  })

  test("accepts non-local database URLs in remote and production modes", () => {
    expect(() =>
      validateDatabaseForMode("remote", {
        DATABASE_URL: "postgresql://remote.example.com/halaalvest",
      })
    ).not.toThrow()
    expect(() =>
      validateDatabaseForMode("prod", {
        DATABASE_URL: "postgresql://prod.example.com/halaalvest",
      })
    ).not.toThrow()
  })

  test("standard mode files override Bun-preloaded local values", () => {
    const root = mkdtempSync(join(tmpdir(), "halaalvest-local-infra-"))

    try {
      writeFileSync(
        join(root, ".env.local"),
        "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/halaalvest\nAPP_ENV=development\n"
      )
      writeFileSync(
        join(root, ".env.remote.local"),
        "DATABASE_URL=postgresql://remote.example.com/halaalvest\nAPP_ENV=remote-dev\n"
      )

      const env = envForMode("remote", root, {
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:55432/halaalvest",
        APP_ENV: "development",
      })

      expect(env.DATABASE_URL).toBe(
        "postgresql://remote.example.com/halaalvest"
      )
      expect(env.APP_ENV).toBe("remote-dev")
      expect(env.HALAALVEST_ENV_MODE).toBe("remote")
      expect(env.HALAALVEST_DB_MODE).toBe("remote-dev")
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })

  test("fails closed when another service owns port 55432", () => {
    expect(() => validatePortOwner(true, "school-clerk-postgres")).toThrow(
      "school-clerk-postgres"
    )
    expect(() => validatePortOwner(true, undefined)).toThrow("another process")
  })

  test("allows a free port or the idempotent Halaalvest owner", () => {
    expect(() =>
      validatePortOwner(false, "school-clerk-postgres")
    ).not.toThrow()
    expect(() => validatePortOwner(true, "halaalvest-postgres")).not.toThrow()
  })
})
