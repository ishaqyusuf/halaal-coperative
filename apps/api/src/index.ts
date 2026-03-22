import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: process.env.DASHBOARD_APP_URL || "http://localhost:3001",
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", service: "halaal-coperative-api" });
});

const port = Number(process.env.PORT) || 3002;
console.log(`API server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
