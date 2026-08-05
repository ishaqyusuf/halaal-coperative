/* global process */

import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "*.halaalvest.localhost",
    "*.halaalvest-dash.localhost",
    // "ibadan-reliable-small-business-savings.halaalvest-dash.localhost",
  ],
  transpilePackages: [
    "@halaalvest/api",
    "@halaalvest/auth",
    "@halaalvest/db",
    "@halaalvest/domain",
    "@halaalvest/notifications",
    "@halaalvest/notifications-react",
    "@halaalvest/errors",
    "@halaalvest/observability",
    "@halaalvest/site-nav",
    "@halaalvest/ui",
    "@halaalvest/utils",
  ],
}

const sourceMapUploadEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.SENTRY_ENVIRONMENT_DASHBOARD === "production" &&
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT_DASHBOARD?.trim()) &&
  Boolean(process.env.SENTRY_RELEASE_DASHBOARD?.trim())

export default sourceMapUploadEnabled
  ? withSentryConfig(nextConfig, {
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_DASHBOARD,
      release: { name: process.env.SENTRY_RELEASE_DASHBOARD },
      silent: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      telemetry: false,
      webpack: {
        autoInstrumentAppDirectory: false,
        autoInstrumentMiddleware: false,
        autoInstrumentServerFunctions: false,
        automaticVercelMonitors: false,
        treeshake: {
          removeDebugLogging: true,
          removeTracing: true,
        },
      },
    })
  : nextConfig
