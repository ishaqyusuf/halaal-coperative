import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  envForMode,
  localDatabasePort,
  modeForCommand,
  validateDatabaseForMode,
  validatePortOwner,
} from "./local-infra-command"

describe("Halaalvest local-infra safety launcher", () => {
  test("resolves public dev and service mode flags", () => {
    expect(modeForCommand("dev", [])).toBe("local")
    expect(modeForCommand("dev", ["--preview"])).toBe("preview")
    expect(() => modeForCommand("dev", ["--remote"])).toThrow(
      "Unknown local-infra mode flag"
    )
    expect(() => modeForCommand("dev", ["--remote-dev"])).toThrow(
      "Unknown local-infra mode flag"
    )
    expect(modeForCommand("dev", ["--prod"])).toBe("prod")
    expect(
      modeForCommand("dev-services", [], {
        HALAALVEST_ENV_MODE: "preview",
      })
    ).toBe("preview")
    expect(modeForCommand("dev-services", ["--mode", "local"])).toBe("local")
    expect(
      modeForCommand("with-env", [], {
        HALAALVEST_ENV_MODE: "prod",
      })
    ).toBe("prod")
  })

  test("rejects conflicting dev modes before dispatch", () => {
    expect(() => modeForCommand("dev", ["--preview", "--prod"])).toThrow(
      "Conflicting local-infra modes"
    )
  })

  test("rejects local database URLs in preview and production modes", () => {
    for (const mode of ["preview", "prod"] as const) {
      expect(() =>
        validateDatabaseForMode(mode, {
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:55432/halaalvest",
        })
      ).toThrow(`Refusing ${mode} mode with a local DATABASE_URL`)
    }
  })

  test("derives the local PostgreSQL port from DATABASE_URL", () => {
    expect(
      localDatabasePort({
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:55434/halaalvest",
      })
    ).toBe(55434)
  })

  test("accepts non-local database URLs in preview and production modes", () => {
    expect(() =>
      validateDatabaseForMode("preview", {
        DATABASE_URL: "postgresql://preview.example.com/halaalvest",
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
        "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/halaalvest\nAPP_ENV=development\n"
      )
      writeFileSync(
        join(root, ".env.preview"),
        "DATABASE_URL=postgresql://preview.example.com/halaalvest\nAPP_ENV=preview\n"
      )

      const env = envForMode("preview", root, {
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:55434/halaalvest",
        APP_ENV: "development",
      })

      expect(env.DATABASE_URL).toBe(
        "postgresql://preview.example.com/halaalvest"
      )
      expect(env.APP_ENV).toBe("preview")
      expect(env.HALAALVEST_ENV_MODE).toBe("preview")
      expect(env.HALAALVEST_DB_MODE).toBe("preview")
    } finally {
      rmSync(root, { force: true, recursive: true })
    }
  })

  test("fails closed when another service owns the configured port", () => {
    expect(() =>
      validatePortOwner(55434, true, "unexpected-postgres")
    ).toThrow(
      "unexpected-postgres"
    )
    expect(() => validatePortOwner(55434, true, undefined)).toThrow(
      "another process"
    )
  })

  test("allows a free port or the idempotent Halaalvest owner", () => {
    expect(() =>
      validatePortOwner(55434, false, "unexpected-postgres")
    ).not.toThrow()
    expect(() =>
      validatePortOwner(55434, true, "halaalvest-postgres")
    ).not.toThrow()
  })
})
