import { afterEach, describe, expect, test } from "bun:test"
import { getDbRuntimeStatus } from "./runtime"

const originalProfileDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
const originalLegacyDatabaseUrl = process.env.DATABASE_URL

afterEach(() => {
  if (originalProfileDatabaseUrl === undefined) {
    delete process.env.HALAALVEST_DATABASE_URL
  } else {
    process.env.HALAALVEST_DATABASE_URL = originalProfileDatabaseUrl
  }

  if (originalLegacyDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalLegacyDatabaseUrl
  }
})

describe("database runtime environment", () => {
  test("uses HALAALVEST_DATABASE_URL", () => {
    process.env.HALAALVEST_DATABASE_URL =
      "postgresql://postgres:postgres@127.0.0.1:55434/halaalvest"
    delete process.env.DATABASE_URL

    expect(getDbRuntimeStatus()).toBe("database-configured")
  })

  test("does not accept the legacy DATABASE_URL", () => {
    delete process.env.HALAALVEST_DATABASE_URL
    process.env.DATABASE_URL =
      "postgresql://postgres:postgres@127.0.0.1:55434/halaalvest"

    expect(getDbRuntimeStatus()).toBe("seed-only")
  })
})
