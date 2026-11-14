/* global process */

import { withSentryConfig } from "@sentry/nextjs"
import { applyHalaalvestSharedEnv } from "@halaalvest/utils/shared-env"

applyHalaalvestSharedEnv()

const dashboardRootDomain =
  process.env.DASHBOARD_ROOT_DOMAIN?.trim().toLowerCase() ||
  "halaalvest-dash.localhost"
const configuredDashboardTarget =
  process.env.LOCAL_DASHBOARD_PROXY_TARGET?.trim()
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const publicMarketingHosts = new Set(["www.halaalvest.com"])
for (const value of [
  process.env.MARKETING_APP_URL,
  process.env.NEXT_PUBLIC_MARKETING_APP_URL,
  process.env.TENANT_SITE_APP_URL,
  process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL,
  process.env.PLATFORM_ROOT_DOMAIN,
]) {
  const candidate = value?.trim()
  if (!candidate) continue
  try {
    const { hostname } = new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`
    )
    publicMarketingHosts.add(hostname)
  } catch {
    // An invalid public URL is not a host routing rule.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.halaalvest.localhost", "*.halaalvest-dash.localhost"],
  async rewrites() {
    // Vercel routes dashboard hosts separately. A hosted rewrite needs
    // an explicit, reachable destination.
    if (process.env.VERCEL === "1" && !configuredDashboardTarget) return []

    const dashboardProxyTarget = new URL(
      configuredDashboardTarget ||
        `http://127.0.0.1:${process.env.DASHBOARD_PORT?.trim() || "1441"}`
    ).origin

    return {
      beforeFiles: [
        {
          // Tenant requests still need the dashboard's own routes and assets.
          source: "/:path*",
          has: [
            { type: "host", value: `.+\\.${escapeRegex(dashboardRootDomain)}` },
          ],
          missing: [...publicMarketingHosts]
            .filter((host) => host.endsWith(`.${dashboardRootDomain}`))
            .map((host) => ({ type: "host", value: escapeRegex(host) })),
          destination: `${dashboardProxyTarget}/:path*`,
        },
      ],
    }
  },
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
