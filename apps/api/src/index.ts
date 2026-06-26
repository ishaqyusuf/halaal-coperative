import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"

import { buildRequestContext } from "./context"
import { handleTrpcRequest } from "./internal-api"

const app = new Hono()
const dashboardOrigin = process.env.DASHBOARD_APP_URL ?? "http://localhost:1441"

app.use(
  "/trpc/*",
  cors({
    allowHeaders: ["Content-Type", "x-tenant-id", "x-user-role"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    origin: dashboardOrigin,
  }),
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

const port = Number(process.env.PORT ?? 1442)

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`API listening on http://localhost:${port}`)
  },
)
