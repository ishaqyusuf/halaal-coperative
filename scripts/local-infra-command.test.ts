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
    expect(modeForCommand("dev", ["--dev"])).toBe("dev")
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

  test("allows local or hosted database URLs in every profile", () => {
    for (const mode of ["local", "dev", "preview", "prod"] as const) {
      expect(() =>
        validateDatabaseForMode(mode, {
          HALAALVEST_DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:55432/halaalvest",
        })
      ).not.toThrow()
      expect(() =>
        validateDatabaseForMode(mode, {
          HALAALVEST_DATABASE_URL:
            "postgresql://hosted.example.com/halaalvest",
        })
      ).not.toThrow()
    }
  })

  test("derives the local PostgreSQL port from HALAALVEST_DATABASE_URL", () => {
    expect(
      localDatabasePort({
        HALAALVEST_DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:55434/halaalvest",
      })
    ).toBe(55434)
    expect(
      localDatabasePort({
        HALAALVEST_DATABASE_URL:
          "postgresql://hosted.example.com/halaalvest",
      })
    ).toBeUndefined()
  })

  test("standard mode files override Bun-preloaded local values", () => {
    const root = mkdtempSync(join(tmpdir(), "halaalvest-local-infra-"))

    try {
      writeFileSync(
        join(root, ".env.local"),
        "HALAALVEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/halaalvest\nAPP_ENV=development\n"
      )
      writeFileSync(
        join(root, ".env.preview"),
        "HALAALVEST_DATABASE_URL=postgresql://preview.example.com/halaalvest\nAPP_ENV=preview\n"
      )

      const env = envForMode("preview", root, {
        HALAALVEST_DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:55434/halaalvest",
        APP_ENV: "development",
      })

      expect(env.HALAALVEST_DATABASE_URL).toBe(
        "postgresql://preview.example.com/halaalvest"
      )
      expect(env.DATABASE_URL).toBeUndefined()
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
