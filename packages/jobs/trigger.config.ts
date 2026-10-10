import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin"
import { esbuildPlugin } from "@trigger.dev/build/extensions"
import { syncEnvVars } from "@trigger.dev/build/extensions/core"
import { defineConfig } from "@trigger.dev/sdk/v3"
import {
  syncedTriggerJobEnvironment,
  triggerProjectForConfigEnv,
} from "../../scripts/trigger-deploy-profile"

function getSentryBuildExtensions() {
  const authToken = process.env.SENTRY_AUTH_TOKEN?.trim()
  const org = process.env.SENTRY_ORG?.trim()
  const project = process.env.SENTRY_PROJECT_JOBS?.trim()
  const release = process.env.SENTRY_RELEASE_JOBS?.trim()

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.SENTRY_ENVIRONMENT_JOBS !== "production" ||
    !authToken ||
    !org ||
    !project ||
    !release
  ) {
    return []
  }

  return [
    esbuildPlugin(
      sentryEsbuildPlugin({
        authToken,
        org,
        project,
        release: { name: release },
        sourcemaps: { filesToDeleteAfterUpload: ["./**/*.map"] },
        telemetry: false,
      }),
      { placement: "last" }
    ),
  ]
}

export default defineConfig({
  project: triggerProjectForConfigEnv(process.env),
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
      syncEnvVars(() => syncedTriggerJobEnvironment(process.env), {
        override: true,
      }),
      ...getSentryBuildExtensions(),
    ],
  },
  dirs: ["./src/tasks"],
})
