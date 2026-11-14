import { expect, test } from "bun:test"
import {
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server"

test("marketing excludes public hosts and forwards the full tenant request path", async () => {
  const overrides = {
    DASHBOARD_ROOT_DOMAIN: "halaalvest.com",
    LOCAL_DASHBOARD_PROXY_TARGET: "http://127.0.0.1:1441",
    MARKETING_APP_URL: "https://launch.halaalvest.com",
    SENTRY_AUTH_TOKEN: "",
    VERCEL: "1",
  }
  const previous = Object.fromEntries(
    Object.keys(overrides).map((key) => [key, process.env[key]])
  )
  Object.assign(process.env, overrides)
  try {
    const { default: nextConfig } = await import("./next.config.mjs")
    const route = (host, path, headers = {}) =>
      unstable_getResponseFromNextConfig({
        nextConfig,
        headers: { host, ...headers },
        url: `https://${host}${path}`,
      })

    for (const host of [
      "halaalvest.com",
      "www.halaalvest.com",
      "launch.halaalvest.com",
      "preview.vercel.app",
      "halaalvest.localhost",
      "attacker.halaalvest.com.example.test",
    ]) {
      for (const path of [
        "/",
        "/pricing",
        "/api/signup",
        "/brand/mark.svg",
        "/_next/static/chunks/main.js",
      ]) {
        expect(
          getRewrittenUrl(
            await route(host, path, {
              "x-forwarded-host": "tenant.halaalvest.com",
            })
          )
        ).toBeNull()
      }
    }
    for (const host of ["alpha.halaalvest.com", "BETA.HALAALVEST.COM:443"]) {
      for (const path of [
        "/",
        "/login?next=%2Fmembers",
        "/signup/members",
        "/api/trpc/health.summary?batch=1",
        "/_next/static/chunks/main.js",
        "/_next/image?url=%2Fbrand%2Fmark.svg",
        "/brand/mark.svg",
      ]) {
        const rewritten = new URL(getRewrittenUrl(await route(host, path)))
        expect(rewritten.hostname).toBe("127.0.0.1")
        expect(`${rewritten.pathname}${rewritten.search}`).toBe(path)
      }
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
