import { serve } from "@hono/node-server"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { Hono } from "hono"
import { cors } from "hono/cors"

import { buildRequestContext, createTRPCContext } from "./context.js"
import { appRouter } from "./routers/_app.js"

const app = new Hono()
const dashboardOrigin = process.env.DASHBOARD_APP_URL ?? "http://localhost:3001"

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
    tenantId: context.auth.activeTenantId,
    timestamp: context.request.receivedAt,
  })
})

app.all("/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: createTRPCContext,
  })
})

const port = Number(process.env.PORT ?? 3002)

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`API listening on http://localhost:${port}`)
  },
)
