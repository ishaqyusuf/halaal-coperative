import { describe, expect, test } from "bun:test"
import { normalizePostgresConnectionString } from "./postgres-connection"

describe("normalizePostgresConnectionString", () => {
  test.each(["prefer", "require", "verify-ca"])(
    "preserves the current strict TLS behavior for sslmode=%s",
    (sslMode) => {
      const normalized = normalizePostgresConnectionString(
        `postgresql://user:secret@db.example.com/halaalvest?sslmode=${sslMode}&application_name=web`,
      )
      const url = new URL(normalized)

      expect(url.searchParams.get("sslmode")).toBe("verify-full")
      expect(url.searchParams.get("application_name")).toBe("web")
    },
  )

  test("leaves explicit SSL modes unchanged", () => {
    const connectionString =
      "postgresql://user:secret@db.example.com/halaalvest?sslmode=disable"

    expect(normalizePostgresConnectionString(connectionString)).toBe(
      connectionString,
    )
  })
})
