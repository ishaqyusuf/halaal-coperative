import { describe, expect, test } from "bun:test"
import {
  PRODUCTION_TRIGGER_PROJECT,
  selectedTriggerDeployEnvironment,
  syncedTriggerJobEnvironment,
  triggerDeployCommand,
  triggerProjectForConfigEnv,
} from "./trigger-deploy-profile"

const production = {
  APP_ENV: "production",
  HALAALVEST_DATABASE_URL: "postgres://owner:secret@live.neon.tech/main",
  TRIGGER_PROJECT_ID: PRODUCTION_TRIGGER_PROJECT,
  TRIGGER_SECRET_KEY: "tr_prod_sk_production",
  TRIGGER_ACCESS_TOKEN: "local-personal-token",
  RESEND_API_KEY: "production-email-key",
  BLOB_READ_WRITE_TOKEN: "production-blob-key",
}
const preview = {
  ...production,
  APP_ENV: "preview",
  HALAALVEST_DATABASE_URL: "postgres://owner:secret@preview.neon.tech/main",
  TRIGGER_PROJECT_ID: "proj_preview123",
  TRIGGER_SECRET_KEY: "tr_prod_sk_preview",
  RESEND_API_KEY: "preview-email-key",
  BLOB_READ_WRITE_TOKEN: "preview-blob-key",
}
const outer = { ...production, ...preview, HALAALVEST_ENV_MODE: "preview" }

describe("separate Trigger deployment profiles", () => {
  test("accepts provider-issued legacy production keys and rejects other environments", () => {
    for (const key of [
      "tr_prod_legacyCredential",
      "tr_prod_sk_scopedCredential",
    ]) {
      const selected = { ...preview, TRIGGER_SECRET_KEY: key }
      expect(
        selectedTriggerDeployEnvironment(outer, selected, production)
          .TRIGGER_SECRET_KEY
      ).toBe(key)
    }
    for (const key of [
      "tr_dev_local",
      "tr_stg_staging",
      "tr_preview_branch",
      "tr_pat_personal",
      "tr_prod_",
    ]) {
      expect(() =>
        selectedTriggerDeployEnvironment(
          outer,
          { ...preview, TRIGGER_SECRET_KEY: key },
          production
        )
      ).toThrow("hosted prod")
    }
  })

  test("deploys each application environment to its own project's prod environment", () => {
    const env = selectedTriggerDeployEnvironment(outer, preview, production)
    expect(triggerDeployCommand(["trigger", "deploy"], env)).toEqual([
      "trigger",
      "deploy",
      "--env",
      "prod",
      "--project-ref",
      preview.TRIGGER_PROJECT_ID,
      "--config",
      "trigger.config.ts",
      "--env-file",
      "/dev/null",
      "--skip-update-check",
    ])
    const prod = selectedTriggerDeployEnvironment(
      { ...production, HALAALVEST_ENV_MODE: "prod" },
      production,
      production
    )
    expect(triggerProjectForConfigEnv(prod)).toBe(PRODUCTION_TRIGGER_PROJECT)
  })

  test("never supplies missing runtime credentials from ambient/base environment", () => {
    for (const key of [
      "TRIGGER_PROJECT_ID",
      "TRIGGER_SECRET_KEY",
      "TRIGGER_ACCESS_TOKEN",
    ] as const) {
      const selected = { ...preview, [key]: undefined }
      expect(() =>
        selectedTriggerDeployEnvironment(outer, selected, production)
      ).toThrow()
    }
  })

  test("refuses production project, database aliases, and runtime secrets in Preview", () => {
    for (const key of [
      "TRIGGER_PROJECT_ID",
      "TRIGGER_SECRET_KEY",
      "RESEND_API_KEY",
      "BLOB_READ_WRITE_TOKEN",
    ] as const) {
      expect(() =>
        selectedTriggerDeployEnvironment(
          outer,
          { ...preview, [key]: production[key] },
          production
        )
      ).toThrow()
    }
    const selected = {
      ...preview,
      HALAALVEST_DATABASE_URL:
        "postgres://other:other@live-pooler.neon.tech/main",
    }
    expect(() =>
      selectedTriggerDeployEnvironment(
        { ...outer, HALAALVEST_DATABASE_URL: selected.HALAALVEST_DATABASE_URL },
        selected,
        production
      )
    ).toThrow("Production database")
    expect(() =>
      selectedTriggerDeployEnvironment(
        outer,
        { ...preview, APP_ENV: "production" },
        production
      )
    ).toThrow("conflicting APP_ENV")
  })

  test("rejects command and selected-file target overrides", () => {
    const env = selectedTriggerDeployEnvironment(outer, preview, production)
    for (const option of [
      "--env",
      "--project-ref",
      "--config",
      "--env-file",
      "--profile",
    ]) {
      expect(() =>
        triggerDeployCommand(["trigger", "deploy", option, "other"], env)
      ).toThrow("CLI overrides")
    }
    expect(() =>
      selectedTriggerDeployEnvironment(
        outer,
        { ...preview, TRIGGER_API_URL: "https://other.example" },
        production
      )
    ).toThrow("alternate")
  })

  test("syncs worker runtime values and identity but never the CLI access token", () => {
    const env = selectedTriggerDeployEnvironment(outer, preview, production)
    const synced = syncedTriggerJobEnvironment(env)
    expect(synced.BLOB_READ_WRITE_TOKEN).toBe(preview.BLOB_READ_WRITE_TOKEN)
    expect(synced.TRIGGER_ACCESS_TOKEN).toBeUndefined()
    expect(synced.TRIGGER_PROJECT_ID).toBeUndefined()
    expect(
      triggerProjectForConfigEnv({ ...synced, TRIGGER_SECRET_KEY: undefined })
    ).toBe(preview.TRIGGER_PROJECT_ID)
  })
})

test("clears absent managed worker credentials instead of retaining hosted values", () => {
  const synced = syncedTriggerJobEnvironment({ APP_ENV: "preview" })
  expect(synced.BLOB_READ_WRITE_TOKEN).toBe("")
  expect(synced.VERCEL_API_TOKEN).toBe("")
  expect(synced.RESEND_API_KEY).toBe("")
  expect(synced.EMAIL_FROM_ADDRESS).toBe("")
  expect(synced.APP_ENV).toBe("preview")
  expect(synced.TRIGGER_ACCESS_TOKEN).toBeUndefined()
})
