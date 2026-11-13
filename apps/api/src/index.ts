import { handleAppUpdateRequest } from "./app-update/handler"
import { handleCooperativePaystackWebhook } from "./billing/cooperative-paystack-webhook"
import { storeNotifications } from "./billing/store-notifications"
import "./instrument"

import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { randomUUID } from "node:crypto"

import { buildLivenessPayload, checkDatabaseReadiness } from "./health"
import { handleTrpcRequest } from "./internal-api"
import { captureApiError } from "./observability/sentry"
import { getSafeObservabilityRequestId } from "./observability/sentry-policy"
import { getRestErrorResponse } from "./rest/error-response"
import { assertQaAcceleratorStartupSafety } from "./qa-accelerator-config"

assertQaAcceleratorStartupSafety()
const app = new Hono()
const dashboardOrigin = process.env.DASHBOARD_APP_URL ?? "http://localhost:1441"

app.use("*", async (c, next) => {
  const supplied = c.req.header("x-request-id")?.trim()
  const requestId = getSafeObservabilityRequestId(supplied) ?? randomUUID()

  c.req.raw.headers.set("x-request-id", requestId)
  c.header("x-request-id", requestId)
  await next()
})

app.onError((error, c) => {
  const report = captureApiError(error, {
    method: c.req.method,
    requestId: c.req.header("x-request-id"),
  })
  const response = getRestErrorResponse(report.classified)
  return c.json(response.body, response.status)
})

app.use(
  "/trpc/*",
  cors({
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "x-request-id",
      "x-tenant-id",
      "x-trpc-source",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["x-request-id"],
    origin: dashboardOrigin,
  })
)

app.use(
  "/api/trpc/*",
  cors({
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "x-request-id",
      "x-tenant-id",
      "x-trpc-source",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["x-request-id"],
    origin: dashboardOrigin,
  })
)

app.all("/api/internal/mobile/builds*", (c) =>
  handleAppUpdateRequest(c.req.raw)
)
app.get("/api/mobile/builds/check", (c) => handleAppUpdateRequest(c.req.raw))

app.route("/billing/store-notifications", storeNotifications)
app.route("/", handleCooperativePaystackWebhook)

app.get("/", (c) => {
  return c.json({
    message: "Cooperative SaaS API",
    status: "ok",
  })
})

// Routine uptime monitoring must use these SQL-free routes. `/ready` runs one
// explicit `SELECT 1` and is for rollout or diagnosis, never a schedule.
app.get("/live", (c) => c.json(buildLivenessPayload()))
app.get("/health", (c) => c.json(buildLivenessPayload()))
app.get("/ready", async (c) => {
  const readiness = await checkDatabaseReadiness()
  return c.json(readiness.body, readiness.status)
})

app.all("/trpc/*", async (c) => {
  return handleTrpcRequest(c.req.raw, "/trpc")
})

app.all("/api/trpc/*", async (c) => {
  return handleTrpcRequest(c.req.raw, "/api/trpc")
})

const port = Number(process.env.PORT ?? 1442)

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`API listening on http://localhost:${port}`)
  }
)
