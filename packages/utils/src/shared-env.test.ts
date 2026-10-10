import { expect, test } from "bun:test"
import { applyHalaalvestSharedEnv } from "./shared-env.mjs"

test("shared values fill missing settings while explicit project overrides win", () => {
  const env: Record<string, string | undefined> = {
    HALAALVEST_AUTH_SECRET: "shared-secret",
    HALAALVEST_APP_ENV: "preview",
    APP_ENV: " ",
    EMAIL_DELIVERY_MODE: "console",
    HALAALVEST_EMAIL_DELIVERY_MODE: "qa_routed",
  }
  expect(applyHalaalvestSharedEnv(env)).toEqual(["APP_ENV", "AUTH_SECRET"])
  expect(env.AUTH_SECRET).toBe("shared-secret")
  expect(env.APP_ENV).toBe("preview")
  expect(env.EMAIL_DELIVERY_MODE).toBe("console")
  expect(applyHalaalvestSharedEnv(env)).toEqual([])
})

test("does not alias the database or unknown and public settings", () => {
  const env: Record<string, string | undefined> = {
    HALAALVEST_DATABASE_URL: "canonical-db",
    HALAALVEST_HALAALVEST_DATABASE_URL: "wrong-db",
    HALAALVEST_UNKNOWN_SECRET: "unknown",
    HALAALVEST_NEXT_PUBLIC_SECRET: "private",
  }
  expect(applyHalaalvestSharedEnv(env)).toEqual([])
  expect(env.HALAALVEST_DATABASE_URL).toBe("canonical-db")
  expect(env.DATABASE_URL).toBeUndefined()
  expect(env.UNKNOWN_SECRET).toBeUndefined()
  expect(env.NEXT_PUBLIC_SECRET).toBeUndefined()
})
