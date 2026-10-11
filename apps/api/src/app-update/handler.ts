import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { registerAppUpdateRoutes } from "./routes"
import { appUpdateDependencies } from "./context"
const app = new Hono()
app.onError((error, c) => {
  c.header("Cache-Control", "no-store")
  if (error instanceof HTTPException && error.status === 409)
    return c.json(
      { error: "Build record changed. Check status and retry." },
      409
    )
  return c.json({ error: "Build registry temporarily unavailable." }, 503)
})
registerAppUpdateRoutes(app, appUpdateDependencies)
export function handleAppUpdateRequest(request: Request) {
  return app.fetch(request)
}
