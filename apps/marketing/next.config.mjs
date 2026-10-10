/* global process */

import { withSentryConfig } from "@sentry/nextjs"
import { applyHalaalvestSharedEnv } from "@halaalvest/utils/shared-env"

applyHalaalvestSharedEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.halaalvest.localhost", "*.halaalvest-dash.localhost"],
  async headers() {
    return [
      {
        source: "/delete-account/verify",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ]
  },
  transpilePackages: [
    "@halaalvest/events",
    "@halaalvest/db",
    "@halaalvest/domain",
    "@halaalvest/errors",
    "@halaalvest/notifications",
    "@halaalvest/notifications-react",
    "@halaalvest/observability",
    "@halaalvest/ui",
    "@halaalvest/utils",
  ],
}

const sourceMapUploadEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.SENTRY_ENVIRONMENT_MARKETING === "production" &&
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT_MARKETING?.trim()) &&
  Boolean(process.env.SENTRY_RELEASE_MARKETING?.trim())

export default sourceMapUploadEnabled
  ? withSentryConfig(nextConfig, {
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_MARKETING,
      release: { name: process.env.SENTRY_RELEASE_MARKETING },
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
