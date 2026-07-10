import { describe, expect, test } from "bun:test"
import {
  applyDatabaseProfile,
  databaseProfileForEnv,
} from "./database-profile.mjs"

describe("database profile resolver", () => {
  test("defaults to local and ignores a non-local DATABASE_URL", () => {
    const env = applyDatabaseProfile({
      DATABASE_URL: "postgresql://user:pass@remote.example.com/app",
      HALAALVEST_DB_HOST_PORT: "55434",
    })

    expect(databaseProfileForEnv(env)).toBe("local")
    expect(env.DATABASE_URL).toBe(
      "postgresql://postgres:postgres@localhost:55434/amanah_cooperative"
    )
    expect(env.LOCAL_DATABASE_URL).toBe(env.DATABASE_URL)
  })

  test("uses an explicit local database URL for local profile", () => {
    const env = applyDatabaseProfile({
      LOCAL_DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/local",
    })

    expect(env.DATABASE_URL).toBe(
      "postgresql://postgres:postgres@localhost:5432/local"
    )
  })

  test("uses remote-dev URL aliases for remote-dev profile", () => {
    const env = applyDatabaseProfile({
      HALAALVEST_ENV: "remote-dev",
      REMOTE_DEV_DATABASE_URL:
        "postgresql://remote:secret@db.example.com/remote_dev",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:55434/local",
    })

    expect(env.DATABASE_URL).toBe(
      "postgresql://remote:secret@db.example.com/remote_dev"
    )
    expect(env.REMOTE_DEV_DATABASE_URL).toBe(env.DATABASE_URL)
  })

  test("uses production database aliases for production profile", () => {
    const env = applyDatabaseProfile({
      HALAALVEST_ENV: "production",
      PROD_DATABASE_URL: "postgresql://prod:secret@db.example.com/prod",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:55434/local",
    })

    expect(env.DATABASE_URL).toBe(
      "postgresql://prod:secret@db.example.com/prod"
    )
    expect(env.PROD_DATABASE_URL).toBe(env.DATABASE_URL)
  })
})
