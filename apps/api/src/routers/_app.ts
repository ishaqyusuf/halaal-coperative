import { createTRPCRouter } from "../lib.trpc.js"
import { healthRouter } from "./health.route.js"
import { notificationsRouter } from "./notifications.route.js"
import { workspaceRouter } from "./workspace.route.js"

export const appRouter = createTRPCRouter({
  health: healthRouter,
  notifications: notificationsRouter,
  workspace: workspaceRouter,
})

export type AppRouter = typeof appRouter
