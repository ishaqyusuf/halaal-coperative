import { syncEnvVars } from "@trigger.dev/build/extensions/core"
import { defineConfig } from "@trigger.dev/sdk/v3"

const syncedProductionEnvVars = [
  "DATABASE_URL",
  "EMAIL_FROM_ADDRESS",
  "EMAIL_REPLY_TO",
  "EMAIL_TEST_RECIPIENT",
  "EMAIL_TEST_MODE",
  "APP_ENV",
  "RESEND_API_KEY",
  "TEST_EMAIL",
] as const

function getTriggerProjectId() {
  return process.env.TRIGGER_PROJECT_ID?.trim() || "halaalvest-jobs"
}

function getSyncedProductionEnv() {
  return Object.fromEntries(
    syncedProductionEnvVars.flatMap((key) => {
      const value = process.env[key]?.trim()
      return value ? [[key, value]] : []
    }),
  )
}

export default defineConfig({
  project: getTriggerProjectId(),
  runtime: "node-22",
  logLevel: "log",
  maxDuration: 120,
  retries: {
    enabledInDev: false,
    default: {
      factor: 2,
      maxAttempts: 3,
      maxTimeoutInMs: 10000,
      minTimeoutInMs: 1000,
      randomize: true,
    },
  },
  build: {
    extensions: [
      syncEnvVars(() => getSyncedProductionEnv(), { override: true }),
    ],
  },
  dirs: ["./src/tasks"],
})
