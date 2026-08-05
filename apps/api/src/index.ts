import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { randomUUID } from "node:crypto"

import { buildRequestContext } from "./context"
import { handleTrpcRequest } from "./internal-api"
import { getRestErrorResponse } from "./rest/error-response"

const app = new Hono()
const dashboardOrigin = process.env.DASHBOARD_APP_URL ?? "http://localhost:1441"

app.use("*", async (c, next) => {
  const supplied = c.req.header("x-request-id")?.trim()
  const requestId =
    supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
      ? supplied
      : randomUUID()

  c.req.raw.headers.set("x-request-id", requestId)
  c.header("x-request-id", requestId)
  await next()
})

app.onError((error, c) => {
  const response = getRestErrorResponse(error)
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
      "x-user-role",
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
      "x-user-role",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["x-request-id"],
    origin: dashboardOrigin,
  })
)

app.get("/", (c) => {
  return c.json({
    message: "Cooperative SaaS API",
    status: "ok",
  })
})

app.get("/health", async (c) => {
  const context = await buildRequestContext(c.req.raw.headers)

  return c.json({
    api: "ok",
    auth: context.auth.session ? "session-present" : "anonymous",
    tenantId: context.tenant.current?.id ?? null,
    tenantSlug: context.tenant.current?.slug ?? null,
    resolution: context.request.tenantResolution.resolvedBy,
    database: context.runtime.status,
    timestamp: context.request.receivedAt,
  })
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
